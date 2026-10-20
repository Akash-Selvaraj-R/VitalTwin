'use client'

/**
 * MonitoringStrip — live monitoring experience:
 * state, elapsed monitoring time, last update, sync quality, signal count,
 * and the current twin state.
 */

import { Pause, Play, Radio } from 'lucide-react'
import { formatElapsed, monitorState, relativeUpdate, type EngineState } from '@/lib/engine'

type Props = {
  engine: EngineState
  live: boolean
  paused: boolean
  started: boolean
  elapsedMs: number
  lastUpdateMs: number
  onToggle: () => void
}

export function MonitoringStrip({ engine, live, paused, started, elapsedMs, lastUpdateMs, onToggle }: Props) {
  const state = monitorState(live, paused, started, engine.scenario)
  const label =
    state === 'IDLE'
      ? 'START LIVE MONITORING'
      : state === 'PAUSED'
        ? 'MONITORING PAUSED'
        : state === 'RECOVERY'
          ? 'RECOVERY MODE'
          : 'LIVE MONITORING ACTIVE'
  const active = state === 'MONITORING' || state === 'RECOVERY'
  const syncState = state === 'IDLE' ? 'STANDBY' : state === 'PAUSED' ? 'PAUSED' : 'SYNCHRONIZED'

  return (
    <section className={`monitor-strip panel mon-${state.toLowerCase()}`}>
      <button className={`monitor-toggle ${active ? 'active' : ''}`} onClick={onToggle}>
        {active ? <Pause /> : <Play />}
        <span>
          <small>{state === 'IDLE' ? 'MONITORING' : state}</small>
          {label}
        </span>
      </button>

      <div className="monitor-clock">
        <span>ELAPSED MONITORING</span>
        <b>{formatElapsed(elapsedMs)}</b>
      </div>

      <div className="monitor-cell monitor-sync">
        <span className={`sync-state ${active ? 'on' : ''}`}>
          <i className="live-dot" /> {syncState}
        </span>
        <small>Last signal update</small>
        <b>{relativeUpdate(lastUpdateMs)}</b>
      </div>

      <div className="monitor-cell">
        <small>Sync quality</small>
        <b>{engine.syncQuality.toFixed(1)}%</b>
        <div className="sync-bar">
          <i style={{ width: `${engine.syncQuality}%` }} />
        </div>
      </div>

      <div className="monitor-cell">
        <small>Signal count</small>
        <b>{engine.signalCount.toLocaleString('en-US')}</b>
      </div>

      <div className="monitor-cell monitor-state">
        <small>Twin state</small>
        <b className={`state-${engine.twinState.toLowerCase()}`}>
          <Radio /> {engine.twinState}
        </b>
      </div>
    </section>
  )
}
