/**
 * VitalTwin Signal Propagation Engine
 * -----------------------------------
 * A pure, deterministic, framework-free simulation engine.
 *
 * Signal update
 *   -> personal baseline comparison
 *   -> deviation calculation
 *   -> twin state machine
 *   -> health score
 *   -> intelligence event
 *   -> explanation payload
 *
 * Everything here is synthetic. Nothing in this engine represents a real
 * medical measurement, diagnosis, or prediction.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Profile = {
  name: string
  age: string
  sex: string
  height: string
  weight: string
  conditions: string
  medications: string
  allergies: string
  activity: string
}

export type Scenario = 'stable' | 'elevated' | 'recovery'
export type TwinState = 'STABLE' | 'ATTENTION' | 'RECOVERING'
export type MonitorState = 'IDLE' | 'MONITORING' | 'PAUSED' | 'RECOVERY'

export type SignalKey = 'hr' | 'spo2' | 'temp' | 'rr' | 'bp' | 'stress' | 'recovery' | 'activity'
export type Signals = Record<SignalKey, number>
export type Baseline = Record<SignalKey, number>

export type DeviationDirection = 'WITHIN' | 'ABOVE' | 'BELOW'

export type SignalMeta = {
  label: string
  short: string
  unit: string
  decimals: number
  /** tolerated fractional deviation from personal baseline */
  tolerance: number
  /** fractional deviation considered a major deviation */
  major: number
  /** contribution weight to the twin state decision */
  weight: number
  /** excluded from twin state decisions (context only) */
  passive?: boolean
}

export type SignalReading = {
  key: SignalKey
  meta: SignalMeta
  current: number
  baseline: number
  diff: number
  pct: number
  direction: DeviationDirection
  relation: string
  meaningful: boolean
  major: boolean
}

export type EventKind = 'SIGNAL CHANGE' | 'TWIN STATE' | 'RECOVERY' | 'SYSTEM' | 'DEMO'

export type Explanation = {
  what: string
  label: string
  key: SignalKey | null
  current: number | null
  baseline: number | null
  pct: number | null
  unit: string
  involved: string[]
  interpretation: string
}

export type IntelEvent = {
  id: string
  time: number
  kind: EventKind
  severity: 'info' | 'attention' | 'recovery'
  title: string
  body: string
  explain: Explanation
}

export type HistoryPoint = {
  time: number
  label: string
  hr: number
  spo2: number
  temp: number
  rr: number
  stress: number
  recovery: number
  score: number
  state: TwinState
  live?: boolean
}

export type HistoryRange = '24H' | '7D' | '30D'

export type ScoreBreakdown = {
  total: number
  alignment: number
  recovery: number
  stability: number
}

export type EngineState = {
  seed: number
  tick: number
  simTime: number
  scenario: Scenario
  signals: Signals
  baseline: Baseline
  readings: SignalReading[]
  trend: Record<SignalKey, number[]>
  twinState: TwinState
  previousState: TwinState
  pendingState: TwinState | null
  pendingTicks: number
  score: ScoreBreakdown
  syncQuality: number
  signalCount: number
  events: IntelEvent[]
  liveHistory: HistoryPoint[]
  cooldowns: Record<string, number>
  lastTrend: number
  alignedCount: number
  deviationCount: number
  majorCount: number
}

export const EMPTY_PROFILE: Profile = {
  name: '',
  age: '',
  sex: 'Female',
  height: '',
  weight: '',
  conditions: '',
  medications: '',
  allergies: '',
  activity: 'Moderate',
}

export const TICK_MS = 1200
export const BURST_STEP_MS = 200
const BURST_SUBSTEPS_PER_HOUR = 4 // each burst step = 15 simulated minutes

/* ------------------------------------------------------------------ */
/* Signal metadata                                                     */
/* ------------------------------------------------------------------ */

export const SIGNAL_META: Record<SignalKey, SignalMeta> = {
  hr: { label: 'Heart rate', short: 'HR', unit: 'BPM', decimals: 0, tolerance: 0.08, major: 0.16, weight: 1.25 },
  spo2: { label: 'Blood oxygen', short: 'SPO2', unit: '%', decimals: 0, tolerance: 0.012, major: 0.025, weight: 1.4 },
  temp: { label: 'Temperature', short: 'TEMP', unit: '°C', decimals: 1, tolerance: 0.01, major: 0.02, weight: 0.8 },
  rr: { label: 'Respiratory rate', short: 'RR', unit: '/MIN', decimals: 0, tolerance: 0.12, major: 0.22, weight: 0.9 },
  bp: { label: 'Blood pressure', short: 'BP', unit: 'mmHg', decimals: 0, tolerance: 0.07, major: 0.14, weight: 0.8 },
  stress: { label: 'Stress load', short: 'STRESS', unit: '%', decimals: 0, tolerance: 0.3, major: 0.6, weight: 1.0 },
  recovery: { label: 'Recovery', short: 'RECOVERY', unit: '%', decimals: 0, tolerance: 0.12, major: 0.25, weight: 1.0 },
  activity: { label: 'Movement', short: 'ACT', unit: '%', decimals: 0, tolerance: 0.6, major: 1.4, weight: 0, passive: true },
}

/** Signals rendered as live signal cards. */
export const CARD_SIGNALS: SignalKey[] = ['hr', 'spo2', 'temp', 'rr', 'stress', 'recovery']

const SIGNAL_RANGE: Record<SignalKey, [number, number]> = {
  hr: [42, 175],
  spo2: [82, 100],
  temp: [34.5, 40.5],
  rr: [8, 34],
  bp: [82, 185],
  stress: [2, 98],
  recovery: [5, 99],
  activity: [0, 100],
}

const NOISE_AMPLITUDE: Record<SignalKey, number> = {
  hr: 1.05,
  spo2: 0.22,
  temp: 0.035,
  rr: 0.42,
  bp: 1.25,
  stress: 2.1,
  recovery: 1.3,
  activity: 3.2,
}

const SIGNAL_KEYS = Object.keys(SIGNAL_META) as SignalKey[]

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** Deterministic pseudo random in [0, 1) — no Math.random anywhere. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Deterministic noise in [-1, 1). */
function noise(seed: number, tick: number): number {
  return hash(seed * 0.7351 + tick * 0.6180339887) * 2 - 1
}

export function seedFromProfile(profile: Profile): number {
  const raw = `${profile.name}|${profile.age}|${profile.sex}|${profile.height}|${profile.weight}|${profile.activity}`
  let s = 7
  for (let i = 0; i < raw.length; i += 1) s = (s * 31 + raw.charCodeAt(i)) % 100000
  return s + 11
}

/* ------------------------------------------------------------------ */
/* Personal baseline engine (gender / age / activity aware)            */
/* ------------------------------------------------------------------ */

export function computeBaseline(profile: Profile): Baseline {
  const age = clamp(parseInt(profile.age, 10) || 32, 16, 92)
  const female = profile.sex === 'Female'
  const height = clamp(parseFloat(profile.height) || (female ? 164 : 174), 130, 215)
  const weight = clamp(parseFloat(profile.weight) || (female ? 62 : 78), 35, 200)
  const bmi = weight / ((height / 100) * (height / 100))
  const active = profile.activity === 'High'
  const light = profile.activity === 'Light'

  let hr = 72
  if (female) hr += 2
  if (age <= 24) hr -= 2
  else if (age >= 50) hr += 4
  if (active) hr -= 5
  else if (light) hr += 3
  if (bmi > 30) hr += 3

  let spo2 = 98
  if (light && bmi > 29) spo2 = 97
  if (age >= 70) spo2 = 97

  let temp = female ? 36.8 : 36.6
  if (age >= 65) temp -= 0.1

  let rr = 15
  if (age >= 55) rr += 1
  if (active) rr -= 1
  if (light) rr += 1

  let bp = 116
  if (!female) bp += 4
  if (age >= 50) bp += 9
  else if (age <= 24) bp -= 3
  if (bmi > 29) bp += 5

  let recovery = 82
  if (active) recovery += 5
  if (light) recovery -= 4
  if (age >= 55) recovery -= 4

  const stress = light ? 26 : 24

  return {
    hr: Math.round(hr),
    spo2,
    temp: Math.round(temp * 10) / 10,
    rr,
    bp: Math.round(bp),
    stress,
    recovery: Math.round(recovery),
    activity: 50,
  }
}

/* ------------------------------------------------------------------ */
/* Scenario targets (relative to the personal baseline)                */
/* ------------------------------------------------------------------ */

const SCENARIO_DELTA: Record<Scenario, Partial<Record<SignalKey, number>>> = {
  stable: { hr: 2, spo2: 0, temp: 0, rr: 0, bp: 2, stress: -1, recovery: 2, activity: 0 },
  elevated: { hr: 19, spo2: -2.3, temp: 0.45, rr: 4, bp: 14, stress: 41, recovery: -25, activity: 29 },
  recovery: { hr: 5, spo2: -0.3, temp: 0.1, rr: 1, bp: 4, stress: 8, recovery: -9, activity: -9 },
}

export function scenarioTargets(baseline: Baseline, scenario: Scenario): Signals {
  const delta = SCENARIO_DELTA[scenario]
  const out = {} as Signals
  for (const key of SIGNAL_KEYS) {
    const next = baseline[key] + (delta[key] ?? 0)
    const [min, max] = SIGNAL_RANGE[key]
    out[key] = clamp(Math.round(next * 10) / 10, min, max)
  }
  return out
}

export const SCENARIO_LABEL: Record<Scenario, string> = {
  stable: 'STABLE DAY',
  elevated: 'ELEVATED SIGNALS',
  recovery: 'RECOVERY',
}

export const STATE_LABEL: Record<TwinState, string> = {
  STABLE: 'STABLE',
  ATTENTION: 'ATTENTION',
  RECOVERING: 'RECOVERING',
}

/* ------------------------------------------------------------------ */
/* Baseline comparison + deviation                                     */
/* ------------------------------------------------------------------ */

export function computeReading(key: SignalKey, current: number, baseline: Baseline): SignalReading {
  const meta = SIGNAL_META[key]
  const base = baseline[key]
  const diff = current - base
  const pct = base === 0 ? 0 : (diff / base) * 100
  const meaningful = Math.abs(pct) > meta.tolerance * 100 && !meta.passive
  const major = Math.abs(pct) > meta.major * 100 && !meta.passive
  const direction: DeviationDirection = Math.abs(pct) <= meta.tolerance * 100 ? 'WITHIN' : pct > 0 ? 'ABOVE' : 'BELOW'
  const relation =
    direction === 'WITHIN' ? 'Within your recent pattern' : direction === 'ABOVE' ? 'Above your recent pattern' : 'Below your recent pattern'
  return { key, meta, current, baseline: base, diff, pct, direction, relation, meaningful, major }
}

export function computeReadings(signals: Signals, baseline: Baseline): SignalReading[] {
  return SIGNAL_KEYS.map(key => computeReading(key, signals[key], baseline))
}

export function topDeviations(readings: SignalReading[], limit = 3): SignalReading[] {
  return readings
    .filter(r => r.meaningful)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* Twin health score (contextual, NOT clinical)                        */
/* ------------------------------------------------------------------ */

export function computeScore(readings: SignalReading[], signals: Signals): ScoreBreakdown {
  const scored = readings.filter(r => !r.meta.passive)
  const alignmentPenalty =
    scored.reduce((sum, r) => sum + Math.min(Math.abs(r.pct) / (r.meta.tolerance * 220), 1) * 100, 0) / scored.length
  const alignment = Math.round(clamp(100 - alignmentPenalty, 12, 100))
  const recovery = Math.round(clamp(signals.recovery, 0, 100))
  const meaningful = readings.filter(r => r.meaningful).length
  const major = readings.filter(r => r.major).length
  const stability = Math.round(clamp(100 - meaningful * 13 - major * 9, 10, 100))
  const total = Math.round(clamp(alignment * 0.42 + recovery * 0.33 + stability * 0.25, 26, 99))
  return { total, alignment, recovery, stability }
}

export function scoreLabel(score: number): string {
  if (score >= 84) return 'ALIGNED'
  if (score >= 70) return 'STEADY'
  if (score >= 56) return 'SHIFTING'
  return 'STRAINED'
}

/* ------------------------------------------------------------------ */
/* Twin state machine (with hysteresis so transitions feel deliberate) */
/* ------------------------------------------------------------------ */

function decideState(readings: SignalReading[], previous: TwinState, trend: number, scenario: Scenario): TwinState {
  const active = readings.filter(r => r.meaningful)
  const major = readings.filter(r => r.major)

  if (major.length >= 1 || active.length >= 3) return 'ATTENTION'

  if (active.length === 2) {
    if (previous === 'ATTENTION' && trend < -1.5) return 'RECOVERING'
    return 'ATTENTION'
  }

  if (active.length === 1) {
    if (scenario === 'recovery') return 'RECOVERING'
    if (previous === 'ATTENTION' && trend < -0.6) return 'RECOVERING'
    if (previous === 'RECOVERING') return trend <= 0.4 ? 'RECOVERING' : 'ATTENTION'
    return 'ATTENTION'
  }

  // No meaningful deviations left.
  if (previous === 'RECOVERING') return 'STABLE'
  if (previous === 'ATTENTION') return 'RECOVERING'
  if (scenario === 'recovery') return 'RECOVERING'
  return 'STABLE'
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatValue(key: SignalKey, value: number): string {
  const meta = SIGNAL_META[key]
  return value.toFixed(meta.decimals)
}

export function formatSigned(value: number, decimals = 0): string {
  const rounded = value.toFixed(decimals)
  return value > 0 ? `+${rounded}` : rounded
}

export function formatClock(ms: number): string {
  const d = new Date(ms)
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const suffix = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${suffix}`
}

export function formatShortTime(ms: number): string {
  const d = new Date(ms)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map(n => n.toString().padStart(2, '0')).join(':')
}

export function relativeUpdate(ms: number): string {
  if (ms < 1000) return 'UPDATED NOW'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `UPDATED ${seconds} SEC AGO`
  return `UPDATED ${Math.floor(seconds / 60)} MIN AGO`
}

/* ------------------------------------------------------------------ */
/* History (deterministic synthetic)                                   */
/* ------------------------------------------------------------------ */

function historyStateFrom(hr: number, spo2: number, temp: number, stress: number, recovery: number, baseline: Baseline): TwinState {
  const readings = computeReadings({ ...baseline, hr, spo2, temp, stress, recovery }, baseline)
  const active = readings.filter(r => r.meaningful && !r.meta.passive)
  const major = readings.filter(r => r.major)
  if (major.length >= 1 || active.length >= 3) return 'ATTENTION'
  if (active.length >= 1) return 'RECOVERING'
  return 'STABLE'
}

function historyScoreFrom(hr: number, spo2: number, temp: number, stress: number, recovery: number, baseline: Baseline): number {
  const readings = computeReadings({ ...baseline, hr, spo2, temp, stress, recovery }, baseline)
  return computeScore(readings, { ...baseline, hr, spo2, temp, stress, recovery }).total
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function generateHistory(baseline: Baseline, seed: number, simTime: number): Record<HistoryRange, HistoryPoint[]> {
  const now = new Date(simTime)

  const hourPoints: HistoryPoint[] = []
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(simTime - i * 3600_000)
    const hour = d.getHours()
    const n = (salt: number) => noise(seed + salt, d.getHours() * 7 + d.getDate() * 31)

    // Circadian arc + a scripted attention window in the early afternoon.
    let hr = baseline.hr + Math.sin(((hour - 15) / 24) * Math.PI * 2) * 3.4 + n(1) * 1.6
    let spo2 = baseline.spo2 + n(2) * 0.5
    let temp = baseline.temp + Math.sin(((hour - 18) / 24) * Math.PI * 2) * 0.18 + n(3) * 0.06
    let rr = baseline.rr + Math.sin(((hour - 14) / 24) * Math.PI * 2) * 1.2 + n(4) * 0.7
    let stress = baseline.stress + Math.sin(((hour - 11) / 24) * Math.PI * 2) * 12 + n(5) * 6
    let recovery = baseline.recovery - Math.sin(((hour - 21) / 24) * Math.PI * 2) * 9 + n(6) * 4

    if (hour >= 13 && hour <= 15) {
      const intensity = hour === 14 ? 1 : 0.6
      hr += 17 * intensity
      spo2 -= 2.1 * intensity
      temp += 0.4 * intensity
      rr += 3.6 * intensity
      stress += 38 * intensity
      recovery -= 22 * intensity
    }
    if (hour >= 16 && hour <= 18) {
      const ease = 1 - (hour - 16) / 3
      hr += 8 * ease
      stress += 16 * ease
      recovery -= 10 * ease
    }
    if (hour <= 5) {
      hr -= 5
      stress -= 8
      recovery += 6
    }

    hr = Math.round(clamp(hr, 45, 170))
    spo2 = Math.round(clamp(spo2, 85, 100))
    temp = Math.round(clamp(temp, 34.8, 39.5) * 10) / 10
    rr = Math.round(clamp(rr, 8, 30))
    stress = Math.round(clamp(stress, 3, 97))
    recovery = Math.round(clamp(recovery, 8, 99))

    hourPoints.push({
      time: d.getTime(),
      label: formatShortTime(d.getTime()),
      hr,
      spo2,
      temp,
      rr,
      stress,
      recovery,
      score: historyScoreFrom(hr, spo2, temp, stress, recovery, baseline),
      state: historyStateFrom(hr, spo2, temp, stress, recovery, baseline),
    })
  }

  const buildDays = (count: number): HistoryPoint[] => {
    const points: HistoryPoint[] = []
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date(simTime - i * 86_400_000)
      const daySalt = d.getDate() * 97 + d.getMonth() * 13
      const n = (salt: number) => noise(seed + salt, daySalt)
      let hr = baseline.hr + n(11) * 3.5
      let spo2 = baseline.spo2 + n(12) * 0.7
      let temp = baseline.temp + n(13) * 0.15
      let rr = baseline.rr + n(14) * 1.4
      let stress = baseline.stress + n(15) * 14
      let recovery = baseline.recovery + n(16) * 8
      if (count === 7 && i === 3) {
        hr += 15
        spo2 -= 2
        stress += 34
        recovery -= 18
        temp += 0.3
      }
      if (count === 30 && (i === 9 || i === 10 || i === 22)) {
        hr += 13
        stress += 30
        recovery -= 16
        spo2 -= 1.6
      }
      hr = Math.round(clamp(hr, 45, 170))
      spo2 = Math.round(clamp(spo2, 85, 100))
      temp = Math.round(clamp(temp, 34.8, 39.5) * 10) / 10
      rr = Math.round(clamp(rr, 8, 30))
      stress = Math.round(clamp(stress, 3, 97))
      recovery = Math.round(clamp(recovery, 8, 99))
      points.push({
        time: d.getTime(),
        label: `${DAY_LABELS[d.getDay()]} ${d.getDate()}`,
        hr,
        spo2,
        temp,
        rr,
        stress,
        recovery,
        score: historyScoreFrom(hr, spo2, temp, stress, recovery, baseline),
        state: historyStateFrom(hr, spo2, temp, stress, recovery, baseline),
      })
    }
    return points
  }

  return { '24H': hourPoints, '7D': buildDays(7), '30D': buildDays(30) }
}

export function captureLivePoint(state: EngineState): HistoryPoint {
  const { signals } = state
  return {
    time: state.simTime,
    label: formatShortTime(state.simTime),
    hr: Math.round(signals.hr),
    spo2: Math.round(signals.spo2),
    temp: Math.round(signals.temp * 10) / 10,
    rr: Math.round(signals.rr),
    stress: Math.round(signals.stress),
    recovery: Math.round(signals.recovery),
    score: state.score.total,
    state: state.twinState,
    live: true,
  }
}

/* ------------------------------------------------------------------ */
/* Engine lifecycle                                                    */
/* ------------------------------------------------------------------ */

function makeEvent(
  state: { tick: number; simTime: number },
  seq: number,
  kind: EventKind,
  severity: IntelEvent['severity'],
  title: string,
  body: string,
  explain: Explanation,
): IntelEvent {
  return { id: `evt-${state.tick}-${seq}`, time: state.simTime, kind, severity, title, body, explain }
}

const WHY_IT_MATTERS =
  'VitalTwin highlights changes relative to your own baseline so you can notice patterns over time.'

function explanationFor(reading: SignalReading, readings: SignalReading[]): Explanation {
  const involved = topDeviations(readings, 3).map(r => r.meta.label)
  if (!involved.includes(reading.meta.label)) involved.unshift(reading.meta.label)
  return {
    what: `${reading.meta.label} moved to ${formatValue(reading.key, reading.current)} ${reading.meta.unit}, ${reading.relation.toLowerCase()}.`,
    label: reading.meta.label,
    key: reading.key,
    current: reading.current,
    baseline: reading.baseline,
    pct: reading.pct,
    unit: reading.meta.unit,
    involved: involved.slice(0, 3),
    interpretation: `Your ${reading.meta.label.toLowerCase()} differs from your recent personal pattern. VitalTwin watches this because it differs from your own normal, not a generic threshold.`,
  }
}

export function createEngine(profile: Profile): EngineState {
  const seed = seedFromProfile(profile)
  const baseline = computeBaseline(profile)
  const simTime = Date.now()
  const targets = scenarioTargets(baseline, 'stable')
  const signals = {} as Signals
  for (const key of SIGNAL_KEYS) {
    const [min, max] = SIGNAL_RANGE[key]
    signals[key] = clamp(targets[key] + noise(seed + key.length, 3) * NOISE_AMPLITUDE[key] * 0.4, min, max)
  }
  const readings = computeReadings(signals, baseline)
  const trend = {} as Record<SignalKey, number[]>
  for (const key of SIGNAL_KEYS) trend[key] = [signals[key]]

  const state: EngineState = {
    seed,
    tick: 0,
    simTime,
    scenario: 'stable',
    signals,
    baseline,
    readings,
    trend,
    twinState: 'STABLE',
    previousState: 'STABLE',
    pendingState: null,
    pendingTicks: 0,
    score: computeScore(readings, signals),
    syncQuality: 98.6,
    signalCount: 0,
    events: [],
    liveHistory: [],
    cooldowns: {},
    lastTrend: 0,
    alignedCount: readings.filter(r => !r.meaningful).length,
    deviationCount: readings.filter(r => r.meaningful).length,
    majorCount: 0,
  }

  const welcome: IntelEvent = {
    id: 'evt-welcome',
    time: simTime,
    kind: 'SYSTEM',
    severity: 'info',
    title: `${profile.name || 'Your twin'} initialized with a synthetic personal baseline.`,
    body: 'Signals are simulated. Your baseline was derived from your profile for demonstration.',
    explain: {
      what: 'Your Digital Twin was created and a personal baseline was estimated from your profile.',
      label: 'Personal baseline',
      key: null,
      current: null,
      baseline: baseline.hr,
      pct: null,
      unit: 'BPM',
      involved: ['Heart rate', 'Blood oxygen', 'Temperature'],
      interpretation: 'Your baseline is personal: age, gender presentation, and activity level shape the pattern your signals are compared against.',
    },
  }
  state.events = [welcome]
  return state
}

/* ------------------------------------------------------------------ */
/* The step function: one signal update through the full pipeline      */
/* ------------------------------------------------------------------ */

export function stepEngine(prev: EngineState, dtMs: number = TICK_MS): EngineState {
  const tick = prev.tick + 1
  const simTime = prev.simTime + dtMs
  const scale = clamp(dtMs / TICK_MS, 1, 8)
  const pull = 1 - Math.pow(1 - 0.11, scale)
  const target = scenarioTargets(prev.baseline, prev.scenario)
  const signals = {} as Signals
  const trend = {} as Record<SignalKey, number[]>

  for (const key of SIGNAL_KEYS) {
    const drift = (target[key] - prev.signals[key]) * pull
    const jitter = noise(prev.seed + key.length * 7, tick) * NOISE_AMPLITUDE[key] * Math.min(scale, 3)
    const [min, max] = SIGNAL_RANGE[key]
    const next = clamp(prev.signals[key] + drift + jitter, min, max)
    signals[key] = Math.round(next * 10) / 10
    const buffer = [...prev.trend[key], signals[key]]
    trend[key] = buffer.length > 26 ? buffer.slice(buffer.length - 26) : buffer
  }

  const readings = computeReadings(signals, prev.baseline)
  const score = computeScore(readings, signals)

  // Overall movement relative to baseline — used to detect "moving back".
  const deviationNow = readings.filter(r => r.meaningful).reduce((sum, r) => sum + Math.abs(r.pct) * r.meta.weight, 0)
  const deviationBefore = prev.readings.filter(r => r.meaningful).reduce((sum, r) => sum + Math.abs(r.pct) * r.meta.weight, 0)
  const trendValue = deviationBefore - deviationNow

  const candidate = decideState(readings, prev.twinState, trendValue, prev.scenario)
  let twinState = prev.twinState
  let previousState = prev.previousState
  let pendingState = prev.pendingState
  let pendingTicks = prev.pendingTicks
  if (candidate === twinState) {
    pendingState = null
    pendingTicks = 0
  } else if (candidate === pendingState) {
    pendingTicks += 1
    if (pendingTicks >= 2) {
      previousState = twinState
      twinState = candidate
      pendingState = null
      pendingTicks = 0
    }
  } else {
    pendingState = candidate
    pendingTicks = 1
  }

  const events: IntelEvent[] = []
  const cooldowns = { ...prev.cooldowns }
  let seq = 0
  const ctx = { tick, simTime }
  const tickScale = Math.round(scale)

  // --- Signal change events (only on meaningful transitions) ---
  for (const reading of readings) {
    if (reading.meta.passive) continue
    const before = prev.readings.find(r => r.key === reading.key)
    const crossed = before ? before.direction === 'WITHIN' && reading.direction !== 'WITHIN' : false
    const escalated = before ? !before.meaningful && reading.meaningful : false
    const key = `${reading.key}:${reading.direction}`
    const cooled = (cooldowns[key] ?? 0) > tick - 8 * tickScale
    if ((crossed || escalated) && !cooled && reading.meaningful) {
      cooldowns[key] = tick
      const dirWord = reading.direction === 'ABOVE' ? 'above' : 'below'
      events.push(
        makeEvent(
          ctx,
          (seq += 1),
          'SIGNAL CHANGE',
          reading.major ? 'attention' : 'info',
          `${reading.meta.label} moved ${Math.abs(Math.round(reading.pct))}% ${dirWord} your recent baseline.`,
          `Current ${reading.meta.label.toLowerCase()} is ${formatValue(reading.key, reading.current)} ${reading.meta.unit} against a personal baseline of ${formatValue(reading.key, reading.baseline)} ${reading.meta.unit}.`,
          explanationFor(reading, readings),
        ),
      )
    }
  }

  // --- Recovery events (a deviated signal returns to pattern) ---
  for (const reading of readings) {
    if (reading.meta.passive || reading.meaningful) continue
    const before = prev.readings.find(r => r.key === reading.key)
    if (before?.meaningful) {
      const key = `${reading.key}:recover`
      const cooled = (cooldowns[key] ?? 0) > tick - 10 * tickScale
      if (!cooled) {
        cooldowns[key] = tick
        events.push(
          makeEvent(
            ctx,
            (seq += 1),
            'RECOVERY',
            'recovery',
            `${reading.meta.label} is moving back toward your personal baseline.`,
            `${reading.meta.label} is now ${formatValue(reading.key, reading.current)} ${reading.meta.unit}, close to your personal baseline of ${formatValue(reading.key, reading.baseline)} ${reading.meta.unit}.`,
            {
              what: `${reading.meta.label} returned to ${formatValue(reading.key, reading.current)} ${reading.meta.unit}.`,
              label: reading.meta.label,
              key: reading.key,
              current: reading.current,
              baseline: reading.baseline,
              pct: reading.pct,
              unit: reading.meta.unit,
              involved: topDeviations(readings, 2).map(r => r.meta.label),
              interpretation: 'Your signals are settling back toward your recent personal pattern.',
            },
          ),
        )
      }
    }
  }

  // --- Twin state transition event ---
  if (twinState !== previousState || twinState !== prev.twinState) {
    if (twinState !== prev.twinState) {
      const top = topDeviations(readings, 1)[0]
      const from = prev.twinState
      const to = twinState
      const explanation: Explanation =
        to === 'ATTENTION'
          ? {
              what: `Your twin moved from ${from} to ${to}.`,
              label: top?.meta.label ?? 'Combined signals',
              key: top?.key ?? null,
              current: top?.current ?? null,
              baseline: top?.baseline ?? null,
              pct: top?.pct ?? null,
              unit: top?.meta.unit ?? '',
              involved: topDeviations(readings, 3).map(r => r.meta.label),
              interpretation: 'Several signals moved away from your recent personal pattern together, so your twin raised its attention level.',
            }
          : to === 'RECOVERING'
            ? {
                what: `Your twin moved from ${from} to RECOVERING.`,
                label: top?.meta.label ?? 'Combined signals',
                key: top?.key ?? null,
                current: top?.current ?? null,
                baseline: top?.baseline ?? null,
                pct: top?.pct ?? null,
                unit: top?.meta.unit ?? '',
                involved: topDeviations(readings, 3).map(r => r.meta.label),
                interpretation: 'Your signals are trending back toward your personal baseline. The twin will settle to STABLE once alignment returns.',
              }
            : {
                what: `Your twin returned to STABLE.`,
                label: 'All tracked signals',
                key: null,
                current: null,
                baseline: null,
                pct: null,
                unit: '',
                involved: CARD_SIGNALS.slice(0, 3).map(k => SIGNAL_META[k].label),
                interpretation: 'Your signals are aligned with your recent personal pattern again.',
              }
      events.push(
        makeEvent(
          ctx,
          (seq += 1),
          to === 'RECOVERING' ? 'RECOVERY' : 'TWIN STATE',
          to === 'ATTENTION' ? 'attention' : to === 'RECOVERING' ? 'recovery' : 'info',
          to === 'STABLE' ? 'Your twin returned to STABLE.' : `Your twin moved from ${from} to ${to}.`,
          to === 'ATTENTION'
            ? 'One or more signals are outside your recent personal pattern, so the twin is watching closely.'
            : to === 'RECOVERING'
              ? 'Signals are moving back toward your personal baseline.'
              : 'All tracked signals are back within your recent personal pattern.',
          explanation,
        ),
      )
    }
  }

  const meaningful = readings.filter(r => r.meaningful)
  const major = readings.filter(r => r.major)
  const syncQuality = clamp(99.2 - meaningful.length * 0.65 - major.length * 0.9 - Math.abs(noise(prev.seed + 5, tick)) * 0.5, 93, 99.4)

  const next: EngineState = {
    ...prev,
    tick,
    simTime,
    signals,
    readings,
    trend,
    twinState,
    previousState,
    pendingState,
    pendingTicks,
    score,
    syncQuality: Math.round(syncQuality * 10) / 10,
    signalCount: prev.signalCount + SIGNAL_KEYS.length * tickScale,
    events: events.length ? [...events.reverse(), ...prev.events].slice(0, 40) : prev.events,
    cooldowns,
    lastTrend: trendValue,
    alignedCount: readings.filter(r => !r.meaningful).length,
    deviationCount: meaningful.length,
    majorCount: major.length,
  }

  if (next.tick % 30 === 0) {
    next.liveHistory = [captureLivePoint(next), ...next.liveHistory].slice(0, 60)
  }

  return next
}

/* ------------------------------------------------------------------ */
/* Scenario control                                                    */
/* ------------------------------------------------------------------ */

export function setScenarioEngine(state: EngineState, scenario: Scenario): EngineState {
  if (scenario === state.scenario) return state
  const label = SCENARIO_LABEL[scenario]
  const body =
    scenario === 'elevated'
      ? 'Simulated load increased: heart rate, stress, and respiratory signals rise together.'
      : scenario === 'recovery'
        ? 'A recovery trajectory began. Signals will ease back toward your personal baseline.'
        : 'A calm day pattern was loaded. Signals settle near your personal baseline.'
  const event = makeEvent(
    { tick: state.tick, simTime: state.simTime },
    1,
    'SYSTEM',
    scenario === 'elevated' ? 'attention' : 'info',
    `Scenario switched to ${label}.`,
    body,
    {
      what: `The simulated scenario changed to ${label}.`,
      label: 'Scenario',
      key: null,
      current: null,
      baseline: null,
      pct: null,
      unit: '',
      involved: ['Heart rate', 'Stress load', 'Recovery'],
      interpretation: 'Scenarios steer the simulation so you can watch signals, deviation, twin state, and intelligence respond together.',
    },
  )
  return {
    ...state,
    scenario,
    events: [event, ...state.events].slice(0, 40),
    liveHistory: [captureLivePoint(state), ...state.liveHistory].slice(0, 60),
  }
}

/* ------------------------------------------------------------------ */
/* Demo time advance: +1h / +6h propagated in visible quarter-hour    */
/* ------------------------------------------------------------------ */

export function advanceHours(state: EngineState, hours: number): EngineState[] {
  const steps: EngineState[] = []
  let current = state
  for (let i = 0; i < hours * BURST_SUBSTEPS_PER_HOUR; i += 1) {
    current = stepEngine(current, (3600_000 / BURST_SUBSTEPS_PER_HOUR) * 0.06)
    current = { ...current, simTime: state.simTime + ((i + 1) * 3600_000) / BURST_SUBSTEPS_PER_HOUR }
    if ((i + 1) % BURST_SUBSTEPS_PER_HOUR === 0) {
      current = { ...current, liveHistory: [captureLivePoint(current), ...current.liveHistory].slice(0, 60) }
    }
    steps.push(current)
  }

  // A demo event summarizing the advanced trajectory.
  const final = steps[steps.length - 1]
  const top = topDeviations(final.readings, 1)[0]
  const improving = final.twinState !== 'ATTENTION'
  const event = makeEvent(
    { tick: final.tick, simTime: final.simTime },
    1,
    'DEMO',
    improving ? 'recovery' : 'attention',
    `Time advanced by ${hours} hour${hours > 1 ? 's' : ''} — twin is ${final.twinState}.`,
    improving
      ? `After ${hours} simulated hours your signals eased toward your personal baseline.`
      : `After ${hours} simulated hours your signals remain outside your recent pattern${top ? `, led by ${top.meta.label.toLowerCase()}` : ''}.`,
    {
      what: `The demo simulation advanced ${hours} hour${hours > 1 ? 's' : ''} forward.`,
      label: top?.meta.label ?? 'All signals',
      key: top?.key ?? null,
      current: top?.current ?? null,
      baseline: top?.baseline ?? null,
      pct: top?.pct ?? null,
      unit: top?.meta.unit ?? '',
      involved: topDeviations(final.readings, 3).map(r => r.meta.label),
      interpretation: 'Demo controls fast-forward the simulated trajectory so you can watch the full propagation: signals, baseline deviation, twin state, and intelligence.',
    },
  )
  steps[steps.length - 1] = { ...final, events: [event, ...final.events].slice(0, 40) }
  return steps
}

/* ------------------------------------------------------------------ */
/* Monitoring helpers                                                  */
/* ------------------------------------------------------------------ */

export function monitorState(live: boolean, paused: boolean, started: boolean, scenario: Scenario): MonitorState {
  if (!live) return started ? 'PAUSED' : 'IDLE'
  if (scenario === 'recovery') return 'RECOVERY'
  return paused ? 'PAUSED' : 'MONITORING'
}

export function twinSees(state: EngineState) {
  const total = state.readings.filter(r => !r.meta.passive).length
  const deviations = state.deviationCount
  const alerts = state.majorCount
  let line = 'Stable personal baseline'
  if (state.twinState === 'ATTENTION') line = deviations > 1 ? 'Multiple signals off pattern' : 'One signal off pattern'
  if (state.twinState === 'RECOVERING') line = 'Recovery improving'
  return { total, deviations, alerts, line }
}

export function heroCopy(state: TwinState): { titleTop: string; titleBottom: string; body: string } {
  if (state === 'ATTENTION') {
    return {
      titleTop: 'Your twin',
      titleBottom: 'noticed a change.',
      body: 'One or more signals are currently outside your recent pattern.',
    }
  }
  if (state === 'RECOVERING') {
    return {
      titleTop: 'Your twin',
      titleBottom: 'sees recovery.',
      body: 'Your signals are moving back toward your personal baseline.',
    }
  }
  return {
    titleTop: 'Your health,',
    titleBottom: 'understood.',
    body: 'Your signals are tracking close to your personal baseline.',
  }
}
