'use client'

/**
 * ExplainabilityDrawer — "Why am I seeing this?" with full transparency:
 * what changed, the personal baseline, the deviation, the signals involved,
 * the twin's interpretation, and why it matters.
 */

import { ShieldCheck, X } from 'lucide-react'
import { formatSigned, formatValue, topDeviations, type EngineState, type IntelEvent } from '@/lib/engine'

type Props = {
  engine: EngineState
  event: IntelEvent | null
  onClose: () => void
}

export function ExplainabilityDrawer({ engine, event, onClose }: Props) {
  const top = event?.explain.key ? engine.readings.find(r => r.key === event.explain.key) ?? null : topDeviations(engine.readings, 1)[0] ?? null
  const current = event?.explain.current ?? top?.current ?? null
  const baseline = event?.explain.baseline ?? top?.baseline ?? null
  const pct = event?.explain.pct ?? top?.pct ?? null
  const label = event?.explain.label ?? top?.meta.label ?? 'Combined signals'
  const unit = event?.explain.unit ?? top?.meta.unit ?? ''
  const involved = event?.explain.involved?.length ? event.explain.involved : topDeviations(engine.readings, 3).map(r => r.meta.label)
  const what =
    event?.explain.what ??
    (top
      ? `${top.meta.label} is ${formatValue(top.key, top.current)} ${top.meta.unit}, ${top.relation.toLowerCase()}.`
      : 'All tracked signals are currently within your recent personal pattern.')
  const interpretation =
    event?.explain.interpretation ??
    'Your current signals match your recent personal pattern, so the twin remains calm.'

  return (
    <aside className="drawer explain-drawer">
      <button className="close-button" onClick={onClose} aria-label="Close explainability">
        <X />
      </button>
      <span className="eyebrow">EXPLAINABILITY</span>
      <h2>Why am I seeing this?</h2>
      {event && (
        <div className={`explain-event-chip kind-${event.severity}`}>
          <b>{event.kind}</b>
          <span>{event.title}</span>
        </div>
      )}

      <div className="explain-block">
        <h4>WHAT CHANGED</h4>
        <p>{what}</p>
      </div>

      <div className="explain-grid">
        <div className="explain-block compact">
          <h4>YOUR BASELINE</h4>
          <p className="explain-figure">
            {baseline !== null ? `${formatValue(top?.key ?? 'hr', baseline)} ${unit}` : '—'}
          </p>
          <small>Recent personal pattern for {label.toLowerCase()}.</small>
        </div>
        <div className="explain-block compact">
          <h4>DEVIATION</h4>
          <p className={`explain-figure ${pct === null ? '' : Math.abs(pct) < 5 ? 'good' : 'warn'}`}>
            {pct === null ? '—' : `${formatSigned(Math.round(pct))}%`}
          </p>
          <small>{current !== null ? `Now ${formatValue(top?.key ?? 'hr', current)} ${unit}` : 'No single-signal deviation.'}</small>
        </div>
      </div>

      <div className="explain-block">
        <h4>SIGNALS INVOLVED</h4>
        <div className="explain-tags">
          {involved.map(name => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>

      <div className="explain-block">
        <h4>TWIN INTERPRETATION</h4>
        <p>{interpretation}</p>
      </div>

      <div className="explain-block">
        <h4>WHY IT MATTERS</h4>
        <p>
          VitalTwin highlights changes relative to <b>your own baseline</b> so you can notice patterns over time — not against
          generic thresholds alone.
        </p>
      </div>

      <div className="trust-note safety-note">
        <ShieldCheck /> This is an observation from simulated health signals, not a medical diagnosis.
      </div>
    </aside>
  )
}
