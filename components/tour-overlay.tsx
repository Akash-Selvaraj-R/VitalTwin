'use client'

/**
 * TourOverlay — preserved guided tour, refreshed for the signal
 * propagation experience.
 */

import { ChevronRight } from 'lucide-react'

const STEPS = [
  { label: 'Digital Twin', text: 'A living representation of your simulated signals that reacts in real time.' },
  { label: 'Live Signals', text: 'Every signal is compared against your personal baseline, with deviation made visible.' },
  { label: 'Personal Baseline', text: 'Your normal is learned from your profile — comparisons are personal, not generic.' },
  { label: 'Intelligence', text: 'Meaningful changes become calm, timestamped events — never noise.' },
  { label: 'Explainability', text: 'Every notable observation answers "why am I seeing this?" transparently.' },
  { label: 'History', text: 'Review patterns, attention periods, and recovery across 24H, 7D, and 30D.' },
  { label: 'Demo Simulation', text: 'Start, pause, or fast-forward the simulation to watch the whole system respond.' },
]

export function TourOverlay({
  step,
  onStep,
  onClose,
}: {
  step: number
  onStep: (step: number) => void
  onClose: () => void
}) {
  const last = step === STEPS.length - 1
  return (
    <div className="tour-card" role="dialog" aria-modal="true" aria-label="Guided product tour" tabIndex={-1}>
      <span className="eyebrow">
        WELCOME TO VITALTWIN · 0{step + 1}/0{STEPS.length}
      </span>
      <h2>{STEPS[step].label}</h2>
      <p>{STEPS[step].text}</p>
      <div className="tour-dots" aria-hidden="true">
        {STEPS.map((item, index) => (
          <i key={item.label} className={index === step ? 'selected' : ''} />
        ))}
      </div>
      <div className="tour-actions">
        <button className="text-button" onClick={onClose}>
          SKIP TOUR
        </button>
        <button className="primary-button" onClick={() => (last ? onClose() : onStep(step + 1))}>
          {last ? 'DONE' : 'NEXT'} <ChevronRight />
        </button>
      </div>
    </div>
  )
}
