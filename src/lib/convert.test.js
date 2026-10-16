import { describe, it, expect } from 'vitest'
import { convert, convertInChart } from './convert.js'
import markets from '../data/markets.json'
import dressWomen from '../data/charts/dress-women.json'

// ---------------------------------------------------------------------------
// Real data: women's dresses
// Every case below is a real row in src/data/charts/dress-women.json
// ---------------------------------------------------------------------------

describe('convert — exact matches', () => {
  it('converts US 4 to EU 36', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'EU', size: '4' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['36'])
    expect(result.exact).toBe(true)
    expect(result.rowId).toBe('dress-w-04')
  })

  it('converts US 2 to JP 7', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'JP', size: '2' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['7'])
    expect(result.exact).toBe(true)
  })

  it('converts backwards, EU 36 to US 4', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'EU', to: 'US', size: '36' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['4'])
    expect(result.exact).toBe(true)
  })

  it('returns the same size when both markets are the same', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'US', size: '4' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['4'])
    expect(result.exact).toBe(true)
  })
})

describe('convert — gaps in the data', () => {
  it('rounds down when the row above is also blank (US 20 -> JP 23)', () => {
    // US 20 has no JP size. US 22 (one up) is blank too, so it falls to US 18.
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'JP', size: '20' })

    expect(result.ok).toBe(true)
    expect(result.values).toEqual(['23'])
    expect(result.exact).toBe(false)
    expect(result.rowId).toBe('dress-w-18')
    expect(result.note).toBeTruthy()
  })

  it('refuses when both neighbours are blank (US 22 -> JP)', () => {
    // US 22 is the last row, and US 20 below it has no JP size either.
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'JP', size: '22' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_equivalent')
  })

  it('refuses every conversion to Ceres, whose column is unpublished', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'CE', size: '4' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_equivalent')
  })
})

describe('convert — bad input', () => {
  it('refuses a size that does not exist', () => {
    const result = convert({ garment: 'dress', cut: 'women', from: 'US', to: 'EU', size: '7' })

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
// Fixture: a hand-made two-row chart.
// The dress chart has no case where rounding UP is needed, so we build one.
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
// Data integrity: assumptions the lookup silently depends on
// ---------------------------------------------------------------------------

describe('chart data', () => {
  it('has a key for every market in the registry, on every row', () => {
    for (const market of markets) {
      for (const row of dressWomen.rows) {
        expect(row).toHaveProperty(market.code)
      }
    }
  })

  it('has no duplicate sizes within a market column', () => {
    for (const market of markets) {
      const values = dressWomen.rows
        .map(row => row[market.code])
        .filter(value => value !== null)

      expect(new Set(values).size).toBe(values.length)
    }
  })
})
