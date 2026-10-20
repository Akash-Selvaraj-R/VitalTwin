'use client'

/**
 * HistoryDrawer — timeline of the actual simulation: deterministic
 * synthetic history plus live captures, with 24H / 7D / 30D ranges.
 */

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { generateHistory, type EngineState, type HistoryPoint, type HistoryRange } from '@/lib/engine'

const RANGES: HistoryRange[] = ['24H', '7D', '30D']

function Chart({ points, baseline }: { points: HistoryPoint[]; baseline: number }) {
  if (!points.length) return null
  const width = 600
  const height = 170
  const values = points.map(p => p.hr)
  const min = Math.min(...values, baseline) - 4
  const max = Math.max(...values, baseline) + 4
  const span = max - min || 1
  const x = (index: number) => (index / Math.max(1, points.length - 1)) * width
  const y = (value: number) => height - 14 - ((value - min) / span) * (height - 30)
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.hr).toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  return (
    <div className="history-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Heart rate history chart">
        <polygon className="chart-area" points={area} />
        <line className="chart-baseline" x1="0" y1={y(baseline)} x2={width} y2={y(baseline)} />
        <polyline className="chart-line" points={line} />
        {points.map((p, i) => (
          <circle
            key={p.time + '-' + i}
            className={`chart-dot dot-${p.state.toLowerCase()}`}
            cx={x(i)}
            cy={y(p.hr)}
            r={p.state === 'ATTENTION' ? 4 : 2.6}
          />
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i className="legend-line" /> HEART RATE
        </span>
        <span>
          <i className="legend-dash" /> YOUR BASELINE ({baseline} BPM)
        </span>
        <span>
          <i className="legend-dot" /> ATTENTION PERIODS
        </span>
      </div>
    </div>
  )
}

export function HistoryDrawer({
  engine,
  profileName,
  range,
  onRange,
  onClose,
}: {
  engine: EngineState
  profileName: string
  range: HistoryRange
  onRange: (range: HistoryRange) => void
  onClose: () => void
}) {
  // Deterministic synthetic history only depends on the patient's baseline and
  // seed — memoize it so live ticks don't regenerate 60+ points every frame.
  const synthetic = useMemo(
    () => generateHistory(engine.baseline, engine.seed, engine.simTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine.baseline, engine.seed],
  )

  const rangePoints = synthetic[range]
  const livePoints = engine.liveHistory.filter(() => range === '24H')
  const rows = [...livePoints.slice(0, 8), ...[...rangePoints].reverse().slice(0, range === '24H' ? 12 : 10)]

  return (
    <aside className="drawer history-drawer" role="dialog" aria-modal="true" aria-label="Health history" tabIndex={-1}>
      <button className="close-button" onClick={onClose} aria-label="Close history">
        <X />
      </button>
      <span className="eyebrow">HISTORY · {profileName || 'DEMO PATIENT'}</span>
      <h2>Your health timeline.</h2>
      <p>Synthetic history and live captures, each compared against your personal baseline.</p>

      <div className="history-tabs" role="tablist" aria-label="History range">
        {RANGES.map(item => (
          <button
            key={item}
            role="tab"
            aria-selected={range === item}
            className={range === item ? 'selected' : ''}
            onClick={() => onRange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <Chart points={[...livePoints, ...rangePoints]} baseline={engine.baseline.hr} />

      <div className="history-table">
        <div className="history-table-head">
          <span>TIME</span>
          <span>STATE</span>
          <span>HR</span>
          <span>SPO2</span>
          <span>TEMP</span>
          <span>HEALTH</span>
        </div>
        {rows.map((point, index) => (
          <div className="history-table-row" key={`${point.time}-${index}`}>
            <span>{point.label}{point.live ? <em className="live-flag">LIVE</em> : null}</span>
            <b className={`rowstate-${point.state.toLowerCase()}`}>{point.state}</b>
            <span>{point.hr}</span>
            <span>{point.spo2}%</span>
            <span>{point.temp.toFixed(1)}°</span>
            <span>{point.score}</span>
          </div>
        ))}
      </div>

      <div className="trust-note">
        All history in this prototype is simulated. It does not represent real medical measurements.
      </div>
    </aside>
  )
}
