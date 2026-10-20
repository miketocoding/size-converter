import dressWomen from '../data/charts/dress-women.json'
import shoesMen from '../data/charts/shoes-men.json'
import shoesWomen from '../data/charts/shoes-women.json'
import shirtMen from '../data/charts/shirt-men.json'

// The charts the app knows about. Exported so the UI can build its
// garment options from the same list the lookup uses.
export const charts = [dressWomen, shoesWomen, shoesMen, shirtMen]

export function findChart(garment, cut) {
  return charts.find(chart => chart.garment === garment && chart.cut === cut)
}

export function convertInChart(chart, from, to, size) {
  const rowIndex = chart.rows.findIndex(row => row[from] === size)
  if (rowIndex === -1) {
    return { ok: false, reason: 'unknown_size' }
  }
  
  const row = chart.rows[rowIndex]
  const value = row[to]
  if (value !== null) {
    return { ok: true, values: [value], exact: true, rowId: row.id }
  }

  const larger = chart.rows[rowIndex + 1]
  if (larger && larger[to] !== null) {
    return {
      ok: true,
      values: [larger[to]],
      exact: false,
      rowId: larger.id,
      note: `No exact ${to} equivalent — showing the next size up.`,
    }
  }
  
  const smaller = chart.rows[rowIndex - 1]
  if (smaller && smaller[to] !== null) {
    return {
      ok: true,
      values: [smaller[to]],
      exact: false,
      rowId: smaller.id,
      note: `No exact ${to} equivalent — showing the next size down.`,
    }
  }
  
  return { ok: false, reason: 'no_equivalent' }
}

export function convert({ garment, cut, from, to, size }) {
  const chart = findChart(garment, cut)
  if (!chart) {
    return { ok: false, reason: 'unknown_chart' }
  }
  return convertInChart(chart, from, to, size)
}
