import { describe, it, expect } from 'vitest'
import { charts, convert, convertInChart } from './convert.js'
import markets from '../data/markets.json'

const dress = { garment: 'dress', cut: 'women' }
const shoes = { garment: 'shoes', cut: 'men' }

// ---------------------------------------------------------------------------
// Women's dresses
// Every case below is a real row in src/data/charts/dress-women.json
// ---------------------------------------------------------------------------

describe('convert — exact matches', () => {
  it('converts US 4 to EU 36', () => {
    const result = convert({ ...dress, from: 'US', to: 'EU', size: '4' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['36'])
    expect(result.exact).toBe(true)
    expect(result.rowId).toBe('dress-w-04')
  })

  it('converts US 2 to JP 7', () => {
    const result = convert({ ...dress, from: 'US', to: 'JP', size: '2' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['7'])
    expect(result.exact).toBe(true)
  })

  it('converts backwards, EU 36 to US 4', () => {
    const result = convert({ ...dress, from: 'EU', to: 'US', size: '36' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['4'])
    expect(result.exact).toBe(true)
  })

  it('returns the same size when both markets are the same', () => {
    const result = convert({ ...dress, from: 'US', to: 'US', size: '4' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['4'])
    expect(result.exact).toBe(true)
  })
})

describe('convert — gaps in the data', () => {
  it('rounds down when the row above is also blank (US 20 -> JP 23)', () => {
    // US 20 has no JP size. US 22 (one up) is blank too, so it falls to US 18.
    const result = convert({ ...dress, from: 'US', to: 'JP', size: '20' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['23'])
    expect(result.exact).toBe(false)
    expect(result.rowId).toBe('dress-w-18')
    expect(result.note).toBeTruthy()
  })

  it('refuses when both neighbours are blank (US 22 -> JP)', () => {
    // US 22 is the last row, and US 20 below it has no JP size either.
    const result = convert({ ...dress, from: 'US', to: 'JP', size: '22' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_equivalent')
  })

  it('refuses every conversion to Ceres, whose column is unpublished', () => {
    const result = convert({ ...dress, from: 'US', to: 'CE', size: '4' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_equivalent')
  })
})

describe('convert — bad input', () => {
  it('refuses a size that does not exist', () => {
    const result = convert({ ...dress, from: 'US', to: 'EU', size: '7' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unknown_size')
  })

  it('refuses a garment we have no chart for', () => {
    const result = convert({ garment: 'hat', cut: 'women', from: 'US', to: 'EU', size: '4' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unknown_chart')
  })
})

// ---------------------------------------------------------------------------
// Men's shoes
// Half sizes, and JP blank at both ends of the chart.
// ---------------------------------------------------------------------------

describe('convert — half sizes', () => {
  it('converts the half size US 8.5 to EU 41', () => {
    const result = convert({ ...shoes, from: 'US', to: 'EU', size: '8.5' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['41'])
    expect(result.exact).toBe(true)
  })

  it('converts a half size backwards, EU 42.5 to US 9.5', () => {
    const result = convert({ ...shoes, from: 'EU', to: 'US', size: '42.5' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['9.5'])
    expect(result.exact).toBe(true)
  })
})

describe('convert — gaps at the ends of a chart', () => {
  it('rounds up at the small end (US 5 -> JP 24)', () => {
    // US 5 has no JP size; US 6 above it does.
    const result = convert({ ...shoes, from: 'US', to: 'JP', size: '5' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['24'])
    expect(result.exact).toBe(false)
    expect(result.rowId).toBe('shoes-m-03')
  })

  it('rounds down at the large end (US 13 -> JP 30)', () => {
    // US 13 and US 14 above it are both blank, so it falls to US 12.
    const result = convert({ ...shoes, from: 'US', to: 'JP', size: '13' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['30'])
    expect(result.exact).toBe(false)
    expect(result.rowId).toBe('shoes-m-13')
  })

  it('refuses at the very bottom, where there is no row below (US 4 -> JP)', () => {
    const result = convert({ ...shoes, from: 'US', to: 'JP', size: '4' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_equivalent')
  })
})

describe('convert — charts stay separate', () => {
  it('gives a different answer for US 8 in dresses and in shoes', () => {
    const asDress = convert({ ...dress, from: 'US', to: 'EU', size: '8' })
    const asShoe = convert({ ...shoes, from: 'US', to: 'EU', size: '8' })

    expect(asDress.values).toEqual(['40'])
    expect(asShoe.values).toEqual(['40.5'])
  })
})

// ---------------------------------------------------------------------------
// Fixture: a hand-made two-row chart.
// Kept because it states the rounding-up rule in isolation, with no real-world
// data to read around.
// ---------------------------------------------------------------------------

describe('convertInChart — rounding up', () => {
  const fixture = {
    rows: [
      { id: 'row-1', US: '1', XX: null },
      { id: 'row-2', US: '2', XX: '20' },
    ],
  }

  it('prefers the row above when the exact cell is blank', () => {
    const result = convertInChart(fixture, 'US', 'XX', '1')

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['20'])
    expect(result.exact).toBe(false)
    expect(result.rowId).toBe('row-2')
  })
})

// ---------------------------------------------------------------------------
// Data integrity: rules every chart must obey, checked for every chart.
// Adding a new chart to `charts` adds these checks automatically.
// ---------------------------------------------------------------------------

for (const chart of charts) {
  describe(`chart data: ${chart.cut} ${chart.garment}`, () => {
    it('has a key for every market in the registry, on every row', () => {
      for (const market of markets) {
        for (const row of chart.rows) {
          expect(row).toHaveProperty(market.code)
        }
      }
    })

    it('has no duplicate sizes within a market column', () => {
      for (const market of markets) {
        const values = chart.rows
          .map(row => row[market.code])
          .filter(value => value !== null)

        expect(new Set(values).size).toBe(values.length)
      }
    })

    it('has a label for the garment dropdown', () => {
      expect(chart.label).toBeTruthy()
    })
  })
}
