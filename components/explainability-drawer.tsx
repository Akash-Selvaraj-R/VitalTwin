'use client'

/**
 * ExplainabilityDrawer — "Why am I seeing this?" with full transparency:
 * what the twin saw, your personal baseline, the detected change, why it
 * matters, and a safe, non-diagnostic next step.
 */

import { ShieldCheck, X } from 'lucide-react'
import { formatSigned, formatValue, topDeviations, type EngineState, type IntelEvent } from '@/lib/engine'

type Props = {
  engine: EngineState
  event: IntelEvent | null
  onClose: () => void
}

/** Safe, non-diagnostic guidance — never a diagnosis or treatment instruction. */
function nextStepFor(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 5) {
    return 'Keep following your usual routine. Your twin will surface a calm explanation if a signal starts moving away from your personal pattern.'
  }
  return 'Note what you were doing around this change — rest, activity, or sleep — and let monitoring continue. If the same pattern keeps returning, grows, or you feel unwell, consider sharing it with a healthcare professional.'
}

export function ExplainabilityDrawer({ engine, event, onClose }: Props) {
  const top = event?.explain.key ? engine.readings.find(r => r.key === event.explain.key) ?? null : topDeviations(engine.readings, 1)[0] ?? null
  const current = event?.explain.current ?? top?.current ?? null
  const baseline = event?.explain.baseline ?? top?.baseline ?? null
  const pct = event?.explain.pct ?? top?.pct ?? null
  const label = event?.explain.label ?? top?.meta.label ?? 'Combined signals'
  const key = event?.explain.key ?? top?.key ?? null
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
  const deviationTone = pct === null ? '' : Math.abs(pct) < 5 ? 'good' : 'warn'

  return (
    <aside className="drawer explain-drawer" role="dialog" aria-modal="true" aria-label="Explainability" tabIndex={-1}>
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
        <h4>WHAT THE TWIN SAW</h4>
        <p>{what}</p>
      </div>

      <div className="explain-grid">
        <div className="explain-block compact">
          <h4>YOUR BASELINE</h4>
          <p className="explain-figure">
            {baseline !== null && key ? `${formatValue(key, baseline)} ${unit}` : '—'}
          </p>
          <small>Recent personal pattern for {label.toLowerCase()} — personal, not generic.</small>
        </div>
        <div className="explain-block compact">
          <h4>CHANGE DETECTED</h4>
          <p className={`explain-figure ${deviationTone}`}>
            {pct === null ? '—' : `${formatSigned(Math.round(pct))}%`}
          </p>
          <small>{current !== null && key ? `Now ${formatValue(key, current)} ${unit}` : 'No single-signal deviation.'}</small>
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
        <h4>WHY IT MATTERS</h4>
        <p>
          {interpretation} VitalTwin surfaces this so you can notice patterns <b>over time</b>, in the context of your own
          history.
        </p>
      </div>

      <div className="explain-block">
        <h4>WHAT YOU CAN DO</h4>
        <p>{nextStepFor(pct)}</p>
      </div>

      <div className="trust-note safety-note">
        <ShieldCheck /> This is an observation from simulated health signals, not a medical diagnosis.
      </div>
    </aside>
  )
}
