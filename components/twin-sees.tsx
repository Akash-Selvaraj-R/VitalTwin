'use client'

/**
 * TwinSees — a small premium panel giving users a simple mental model:
 * what the Digital Twin is actually observing right now.
 */

import { Eye } from 'lucide-react'
import type { EngineState } from '@/lib/engine'
import { twinSees } from '@/lib/engine'

export function TwinSees({ engine }: { engine: EngineState }) {
  const view = twinSees(engine)
  return (
    <section className="twin-sees panel">
      <div className="twin-sees-title">
        <Eye />
        <span>WHAT YOUR TWIN SEES</span>
      </div>
      <div className="twin-sees-stats">
        <div className="twin-sees-stat">
          <b>{view.total}</b>
          <span>SIGNALS SYNCHRONIZED</span>
        </div>
        <div className="twin-sees-stat">
          <b className={view.deviations ? 'warn' : ''}>{view.deviations}</b>
          <span>MEANINGFUL DEVIATION{view.deviations === 1 ? '' : 'S'}</span>
        </div>
        <div className="twin-sees-stat">
          <b className={view.alerts ? 'warn' : ''}>{view.alerts}</b>
          <span>ACTIVE ALERT{view.alerts === 1 ? '' : 'S'}</span>
        </div>
      </div>
      <div className="twin-sees-line">
        <span className={`live-dot ${engine.twinState === 'ATTENTION' ? 'amber' : ''}`} />
        {view.line}
        <em>· {engine.alignedCount} signal{engine.alignedCount === 1 ? '' : 's'} aligned with your recent pattern</em>
      </div>
    </section>
  )
}
