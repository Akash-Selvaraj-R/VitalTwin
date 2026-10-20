'use client'

/**
 * DigitalTwin — cinematic, abstract visualization of the simulated twin.
 * Every element reacts to actual engine values: heart node beats at the
 * simulated HR, lung zone breathes with SpO2 / RR, core ring tracks
 * temperature deviation, mind cluster glows with stress, and the whole
 * silhouette adopts the current twin state palette.
 */

import { Thermometer, HeartPulse } from 'lucide-react'
import { clamp, SIGNAL_META, formatValue, type Signals, type TwinState } from '@/lib/engine'

type Props = {
  signals: Signals
  state: TwinState
  sex: string
  monitorLabel: string
  live: boolean
}

export function DigitalTwin({ signals, state, sex, monitorLabel, live }: Props) {
  const beatSeconds = 60 / clamp(signals.hr, 45, 170)
  const breathSeconds = 60 / clamp(signals.rr, 8, 30) / 2
  const tempDev = clamp((signals.temp - 36.7) / 1.2, -1, 1)
  const stressGlow = clamp(signals.stress / 100, 0, 1)
  const spo2Glow = clamp((98.5 - signals.spo2) / 3.5, 0, 1)

  const stateKey = state.toLowerCase()

  return (
    <div
      className={`twin-stage twin-${stateKey}`}
      style={{
        ['--beat' as string]: `${beatSeconds.toFixed(3)}s`,
        ['--breath' as string]: `${breathSeconds.toFixed(3)}s`,
        ['--temp-dev' as string]: tempDev.toFixed(2),
        ['--stress-glow' as string]: stressGlow.toFixed(2),
        ['--spo2-glow' as string]: spo2Glow.toFixed(2),
      }}
    >
      <div className="twin-aurora" />
      <div className="scanlines" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <span className="twin-particle p1" />
      <span className="twin-particle p2" />
      <span className="twin-particle p3" />
      <span className="twin-particle p4" />
      <span className="twin-particle p5" />

      <svg className="twin-svg" viewBox="0 0 320 470" role="img" aria-label={`${sex} patient's live digital twin — ${state}`}>
        <defs>
          <radialGradient id="twin-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="twin-body-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* ground plate */}
        <ellipse className="twin-ground" cx="160" cy="452" rx="92" ry="10" />

        {/* mind / nervous system zone */}
        <g className="zone zone-mind">
          <circle className="mind-halo" cx="160" cy="66" r="52" fill="url(#twin-core-glow)" stroke="none" />
          <circle className="mind-ring" cx="160" cy="66" r="45" />
          <circle className="mind-node n1" cx="160" cy="28" r="2.6" />
          <circle className="mind-node n2" cx="126" cy="76" r="2.2" />
          <circle className="mind-node n3" cx="194" cy="76" r="2.2" />
          <path className="mind-wave" d="M118 66 q21 -12 42 0 t42 0" />
        </g>

        {/* body silhouette */}
        <g className="silhouette">
          <ellipse cx="160" cy="66" r="33" ry="39" />
          <path d="M147 102 v18 M173 102 v18" />
          <path className="torso" d="M104 146 Q160 118 216 146 L205 296 Q160 314 115 296 Z" />
          <path d="M104 150 Q78 190 71 248 L62 302" />
          <path d="M216 150 Q242 190 249 248 L258 302" />
          <circle className="hand" cx="61" cy="308" r="4.5" />
          <circle className="hand" cx="259" cy="308" r="4.5" />
          <path d="M128 306 L121 428 M192 306 L199 428" />
          <path className="foot" d="M112 432 h18 M190 432 h18" />
          <path className="rib" d="M132 176 q28 10 56 0 M128 196 q32 11 64 0 M130 216 q30 10 60 0" />
          <path className="center-line" d="M160 150 v150" />
        </g>

        {/* lungs zone — reacts to SpO2 / respiratory rate */}
        <g className="zone zone-lungs">
          <path className="lung lung-left" d="M150 178 q-30 8 -32 46 q-2 32 18 40 q16 4 18 -22 q2 -30 -4 -64" />
          <path className="lung lung-right" d="M170 178 q30 8 32 46 q2 32 -18 40 q-16 4 -18 -22 q-2 -30 4 -64" />
          <path className="breath-wave" d="M112 226 q-12 20 0 40 M208 226 q12 20 0 40" />
        </g>

        {/* core / temperature zone */}
        <g className="zone zone-core">
          <circle className="core-ring" cx="160" cy="248" r="54" />
          <circle className="core-ring inner" cx="160" cy="248" r="40" />
          <circle className="core-ring outer-cold" cx="160" cy="248" r="66" />
        </g>

        {/* heart zone — beats at the simulated heart rate */}
        <g className="zone zone-heart">
          <circle className="sync-wave w1" cx="146" cy="196" r="12" />
          <circle className="sync-wave w2" cx="146" cy="196" r="12" />
          <circle className="sync-wave w3" cx="146" cy="196" r="12" />
          <circle className="heart-halo" cx="146" cy="196" r="26" fill="url(#twin-core-glow)" stroke="none" />
          <path className="heart-node" d="M146 204 c-8 -6 -12 -10 -12 -15 a6.5 6.5 0 0 1 12 -3 a6.5 6.5 0 0 1 12 3 c0 5 -4 9 -12 15 z" />
          <path className="heart-lead" d="M134 196 h-14 l-5 -9 l-6 18 l-5 -9 h-14" />
        </g>

        {/* zone connectors toward the data tags */}
        <g className="connectors">
          <path d="M160 30 v-14" />
          <path d="M214 196 h34" />
          <path d="M106 196 h-34" />
          <path d="M204 248 h30" />
          <path d="M116 248 h-30" />
          <path d="M199 432 h34" />
        </g>
      </svg>

      <div className="twin-tag tag-mind">
        <span>MIND</span>
        <b>{Math.round(signals.stress)}<small>% STRESS</small></b>
      </div>
      <div className="twin-tag tag-heart">
        <HeartPulse />
        <span>HEART</span>
        <b>{Math.round(signals.hr)}<small>BPM</small></b>
      </div>
      <div className="twin-tag tag-lungs">
        <span>LUNGS</span>
        <b>{Math.round(signals.spo2)}<small>% SPO2</small></b>
      </div>
      <div className="twin-tag tag-core">
        <Thermometer />
        <span>BODY</span>
        <b>{formatValue('temp', signals.temp)}<small>°C</small></b>
      </div>
      <div className="twin-tag tag-breath">
        <span>BREATH</span>
        <b>{Math.round(signals.rr)}<small>/MIN</small></b>
      </div>
      <div className="twin-tag tag-recovery">
        <span>RECOVERY</span>
        <b>{Math.round(signals.recovery)}<small>%</small></b>
      </div>

      <div className="twin-center">
        <span className="pulse-ring" />
        <b>{state}</b>
        <small>{live ? monitorLabel : 'PERSONAL TWIN SYNCED'}</small>
      </div>
    </div>
  )
}

/** Full-width ECG-like strip whose speed follows the simulated heart rate. */
export function EcgStrip({ signals, state }: { signals: Signals; state: TwinState }) {
  const cycle = 60 / clamp(signals.hr, 45, 170)
  return (
    <div className={`ecg-strip ecg-${state.toLowerCase()}`} style={{ ['--ecg' as string]: `${(cycle / 2).toFixed(3)}s` }}>
      <div className="ecg-track">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
          <g className="ecg-copy">
            <path className="ecg-shadow" d="M0 30 h60 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h60" />
            <path className="ecg-line" d="M0 30 h60 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h60" />
          </g>
          <g className="ecg-copy" transform="translate(600,0)">
            <path className="ecg-shadow" d="M0 30 h60 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h60" />
            <path className="ecg-line" d="M0 30 h60 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h52 l10 -3 l8 6 l9 -3 h34 l10 -22 l9 44 l10 -22 h60" />
          </g>
        </svg>
      </div>
      <div className="ecg-meta">
        <span className="live-dot" /> SIMULATED ECG · {Math.round(signals.hr)} BPM · {SIGNAL_META.spo2.short} {Math.round(signals.spo2)}%
      </div>
    </div>
  )
}
