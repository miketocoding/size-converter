import { useState } from 'react'
import markets from './data/markets.json'
import { charts, convert, findChart } from './lib/convert.js'
import './App.css'

// How each cut is written on screen. The cuts themselves come from the chart
// list below, so a tab only appears once there is a chart to put behind it.
const CUT_LABELS = { women: "Women's", men: "Men's" }

const availableCuts = [...new Set(charts.map(chart => chart.cut))]

function App() {
  const [cut, setCut] = useState('women')
  const [garment, setGarment] = useState('dress')
  const [from, setFrom] = useState('US')
  const [to, setTo] = useState('EU')
  const [size, setSize] = useState('')

  // The garments available in the cut currently selected, and the chart
  // behind the current selection (used for its explanatory note).
  const garmentsInCut = charts.filter(chart => chart.cut === cut)
  const currentChart = findChart(garment, cut)

  // Changing the cut keeps the garment where that garment also exists in the
  // new cut (women's shoes -> men's shoes), and falls back otherwise
  // (women's dresses -> men's, where no dress chart exists).
  function selectCut(nextCut) {
    const available = charts.filter(chart => chart.cut === nextCut)
    setCut(nextCut)
    if (!available.some(chart => chart.garment === garment)) {
      setGarment(available[0].garment)
    }
    setSize('')
  }

  // Cut and garment define *what* is being sized, so a previously typed size
  // stops meaning anything when either changes. Markets are left alone.
  function selectGarment(nextGarment) {
    setGarment(nextGarment)
    setSize('')
  }

  const trimmedSize = size.trim()
  let resultContent

  if (trimmedSize === '') {
    resultContent = <p className="result-empty">Enter a size to convert.</p>
  } else {
    const result = convert({ garment, cut, from, to, size: trimmedSize })

    if (!result.ok) {
      if (result.reason === 'unknown_size') {
        resultContent = (
          <p className="result-error">
            Sorry, we don&rsquo;t know that size in {from}.
          </p>
        )
      } else if (result.reason === 'no_equivalent') {
        resultContent = (
          <p className="result-error">
            Sorry, there is no equivalent size in {to}.
          </p>
        )
      }

    } else if (result.exact) {
      resultContent = (
        <p className="result-success">
          {from} {trimmedSize} = {to} {result.values[0]} (exact)
        </p>
      )

    } else {
      resultContent = (
        <div className="result-success result-approximate">
          <p>{from} {trimmedSize} = {to} {result.values[0]}</p>
          <p className="result-note">⚠ {result.note}</p>
        </div>
      )
    }
  }

  return (
    <main>
      <header className="masthead">
        <h1>Size Converter</h1>

        <div className="tabs">
          {availableCuts.map(cutCode => (
            <button
              key={cutCode}
              type="button"
              className={cutCode === cut ? 'tab tab-active' : 'tab'}
              aria-pressed={cutCode === cut}
              onClick={() => selectCut(cutCode)}
            >
              {CUT_LABELS[cutCode]}
            </button>
          ))}
        </div>
      </header>

      <label className="garment-field">
        Garment
        <select value={garment} onChange={e => selectGarment(e.target.value)}>
          {garmentsInCut.map(chart => (
            <option key={chart.garment} value={chart.garment}>
              {chart.label}
            </option>
          ))}
        </select>
      </label>

      {currentChart.note && (
        <p className="garment-note">{currentChart.note}</p>
      )}

      <div className="controls">
        <label>
          From
          <select value={from} onChange={e => setFrom(e.target.value)}>
            {markets.map(market => (
              <option
                key={market.code}
                value={market.code}
                disabled={market.provisional}
              >
                {market.name}
                {market.provisional ? ' — standard not yet published' : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Size
          <input
            type="text"
            value={size}
            onChange={e => setSize(e.target.value)}
            placeholder="Enter size"
          />
        </label>

        <label>
          To
          <select value={to} onChange={e => setTo(e.target.value)}>
            {markets.map(market => (
              <option
                key={market.code}
                value={market.code}
                disabled={market.provisional}
              >
                {market.name}
                {market.provisional ? ' — standard not yet published' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="result" aria-live="polite">
        {resultContent}
      </div>
    </main>
  )
}

export default App
