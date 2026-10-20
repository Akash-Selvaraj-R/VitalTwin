'use client'

/**
 * HealthScore — twin health score with a transparent breakdown.
 * Explicitly framed as contextual, never clinical.
 */

import { Info } from 'lucide-react'
import { scoreLabel, type ScoreBreakdown, type TwinState } from '@/lib/engine'

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="score-bar">
      <div className="score-bar-head">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="score-bar-track">
        <i className={tone} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export function HealthScore({ score, state }: { score: ScoreBreakdown; state: TwinState }) {
  return (
    <article className={`panel score-panel score-${state.toLowerCase()}`}>
      <div className="panel-heading">
        <span>TWIN HEALTH SCORE</span>
        <span className="score-contextual">CONTEXTUAL, NOT CLINICAL</span>
      </div>
      <div className="score-main">
        <strong className="score-number">{score.total}</strong>
        <div className="score-state">
          <b>{state}</b>
          <span>{scoreLabel(score.total)}</span>
        </div>
      </div>
      <div className="score-bars">
        <Bar label="Baseline alignment" value={score.alignment} tone="bar-align" />
        <Bar label="Recovery" value={score.recovery} tone="bar-recovery" />
        <Bar label="Signal stability" value={score.stability} tone="bar-stability" />
      </div>
      <p className="score-note">
        <Info /> Derived from simulated signals compared against your personal baseline. Not a medical score.
      </p>
    </article>
  )
}
