'use client'

/**
 * DemoControls — clearly marked demo simulation controls for fast,
 * jury-friendly demonstration of the full signal propagation.
 */

import { Pause, Play, RotateCcw, Zap } from 'lucide-react'
import { SCENARIO_LABEL, type EngineState, type Scenario } from '@/lib/engine'

type Props = {
  engine: EngineState
  live: boolean
  paused: boolean
  onScenario: (scenario: Scenario) => void
  onToggle: () => void
  onAdvance: (hours: number) => void
  onReset: () => void
}

export function DemoControls({ engine, live, paused, onScenario, onToggle, onAdvance, onReset }: Props) {
  const active = live && !paused
  return (
    <section className="section demo-panel panel">
      <div className="demo-head">
        <div className="demo-title">
          <Zap />
          <span>DEMO SIMULATION</span>
          <b>SYNTHETIC TRAJECTORY CONTROLS</b>
        </div>
        <p>
          Scenario → signals → baseline deviation → twin state → intelligence → recovery. Watch each step propagate through the
          whole application.
        </p>
      </div>

      <div className="demo-actions">
        <button className={active ? 'demo-btn demo-live' : 'demo-btn demo-primary'} onClick={onToggle}>
          {active ? <Pause /> : <Play />} {active ? 'PAUSE' : 'START'}
        </button>
        <button className="demo-btn" onClick={() => onAdvance(1)}>
          <Zap /> +1 HOUR
        </button>
        <button className="demo-btn" onClick={() => onAdvance(6)}>
          <Zap /> +6 HOURS
        </button>
        <button className="demo-btn" onClick={onReset}>
          <RotateCcw /> RESET
        </button>
      </div>

      <div className="demo-scenarios">
        <span className="demo-scenarios-label">SCENARIO</span>
        {(['stable', 'elevated', 'recovery'] as Scenario[]).map(key => (
          <button
            key={key}
            className={`scenario-button sc-${key} ${engine.scenario === key ? 'selected' : ''}`}
            onClick={() => onScenario(key)}
          >
            <i /> {SCENARIO_LABEL[key]}
          </button>
        ))}
        <em className="demo-scenario-note">
          Twin now <b>{engine.twinState}</b> · {engine.deviationCount} signal{engine.deviationCount === 1 ? '' : 's'} off your
          personal pattern
        </em>
      </div>
    </section>
  )
}
