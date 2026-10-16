import dressWomen from '../data/charts/dress-women.json'

const charts = [dressWomen]

/**
 * Find the chart for a garment and cut.
 * Returns undefined if we have no chart for it.
 */
export function findChart(garment, cut) {
  return charts.find(chart => chart.garment === garment && chart.cut === cut)
}

/**
 * Convert a size within one chart.
 *
 *   1. Find the row whose `from` cell equals `size`.
 *      No match -> { ok: false, reason: 'unknown_size' }
 *   2. That row's `to` cell has a value -> return it, exact: true
 *   3. Blank -> try the size ONE UP     -> return it, exact: false
 *   4. Blank -> try the size ONE DOWN   -> return it, exact: false
 *   5. Both blank -> { ok: false, reason: 'no_equivalent' }
 *
 * Success shape: { ok: true, values: [string], exact: boolean, rowId, note? }
 */
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

/**
 * Convert a size, looking the chart up by garment and cut.
 * No chart -> { ok: false, reason: 'unknown_chart' }
 */
export function convert({ garment, cut, from, to, size }) {
  const chart = findChart(garment, cut)
  if (!chart) {
    return { ok: false, reason: 'unknown_chart' }
  }
  return convertInChart(chart, from, to, size)
}
