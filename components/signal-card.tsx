'use client'

/**
 * SignalCard — one simulated signal with its personal baseline comparison,
 * deviation indicator, mini trend, and plain-language relation.
 */

import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { formatSigned, formatValue, type SignalKey, type SignalReading } from '@/lib/engine'

function Sparkline({ values, tone }: { values: number[]; tone: 'within' | 'above' | 'below' }) {
  if (values.length < 2) return <div className="sparkline empty" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 100
  const height = 28
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - 3 - ((value - min) / span) * (height - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const last = values[values.length - 1]
  const lastX = width
  const lastY = height - 3 - ((last - min) / span) * (height - 8)
  return (
    <svg className={`sparkline spark-${tone}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
      <circle cx={lastX - 1} cy={lastY} r="2.4" />
    </svg>
  )
}

export function SignalCard({ reading, trend }: { reading: SignalReading; trend: number[] }) {
  const { meta } = reading
  const tone = reading.direction === 'WITHIN' ? 'within' : reading.direction === 'ABOVE' ? 'above' : 'below'
  const statusTag = reading.major ? 'NOTICE' : reading.meaningful ? 'OFF PATTERN' : 'ALIGNED'
  const Arrow = reading.direction === 'ABOVE' ? ArrowUp : reading.direction === 'BELOW' ? ArrowDown : Minus

  return (
    <article className={`metric signal-card sig-${tone}`}>
      <header className="signal-head">
        <span className="signal-label">{meta.label}</span>
        <b className={`signal-status status-${tone}`}>{statusTag}</b>
      </header>

      <div className="signal-value-row">
        <strong className="signal-value">
          {formatValue(reading.key as SignalKey, reading.current)}
          <small>{meta.unit}</small>
        </strong>
        <Sparkline values={trend} tone={tone} />
      </div>

      <div className={`deviation-chip dev-${tone}`}>
        <Arrow />
        {reading.direction === 'WITHIN' ? 'WITHIN PATTERN' : `${formatSigned(Math.round(reading.pct))}%`}
      </div>

      <div className="baseline-compare">
        <div className="baseline-rowline">
          <span>YOUR BASELINE</span>
          <b>
            {formatValue(reading.key as SignalKey, reading.baseline)}
            <small> {meta.unit}</small>
          </b>
        </div>
        <div className="baseline-track" aria-hidden="true">
          <i
            className={`baseline-marker ${tone}`}
            style={{
              left: `${Math.max(2, Math.min(98, 50 + (reading.pct / (meta.tolerance * 200)) * 50))}%`,
            }}
          />
          <em className="baseline-center" />
        </div>
      </div>

      <footer className="signal-foot">{reading.relation}</footer>
    </article>
  )
}
