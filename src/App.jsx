import { useState } from 'react'
import markets from './data/markets.json'
import { convert } from './lib/convert.js'
import './App.css'

function App() {
  // What the user has chosen. These three drive everything on the page.
  const [from, setFrom] = useState('US')
  const [to, setTo] = useState('EU')
  const [size, setSize] = useState('')

  // Only one chart exists so far, so these are fixed.
  // They become dropdowns once there are more charts.
  const garment = 'dress'
  const cut = 'women'
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
      <h1>Size Converter</h1>
      <p className="subtitle">Women&rsquo;s dresses</p>

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
