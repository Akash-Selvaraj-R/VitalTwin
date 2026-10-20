'use client'

/**
 * useVitalTwin — React binding for the VitalTwin signal propagation engine.
 * Keeps every interval/subscription in one place with correct cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BURST_STEP_MS,
  EMPTY_PROFILE,
  TICK_MS,
  advanceHours,
  createEngine,
  setScenarioEngine,
  stepEngine,
  type EngineState,
  type HistoryRange,
  type IntelEvent,
  type Profile,
  type Scenario,
} from './engine'

export type DrawerKind = 'profile' | 'settings' | 'history' | null
export type ConfirmKind = 'logout' | 'clear' | null
export type ExplainTarget = { event: IntelEvent | null } | null

const PROFILE_KEY = 'vital-twin-profile'
const REDUCED_KEY = 'vital-twin-reduced'

const SEX_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const ACTIVITY_OPTIONS = ['Light', 'Moderate', 'High']

/* ------------------------------------------------------------------ */
/* Local storage safety — never trust what comes back from storage.    */
/* ------------------------------------------------------------------ */

/** Coerce anything from storage into a valid Profile; bad values fall back to defaults. */
function sanitizeProfile(value: unknown): Profile {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const str = (v: unknown): string =>
    typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
  const digits = (v: unknown, max: number) => str(v).replace(/[^0-9]/g, '').slice(0, max)
  const decimal = (v: unknown, max: number) => str(v).replace(/[^0-9.]/g, '').slice(0, max)

  const age = digits(raw.age, 3)
  const sex = str(raw.sex)
  const activity = str(raw.activity)

  return {
    name: str(raw.name).slice(0, 60),
    age: age && Number(age) >= 5 && Number(age) <= 120 ? age : '',
    sex: SEX_OPTIONS.includes(sex) ? sex : EMPTY_PROFILE.sex,
    height: decimal(raw.height, 5),
    weight: decimal(raw.weight, 5),
    conditions: str(raw.conditions).slice(0, 160),
    medications: str(raw.medications).slice(0, 160),
    allergies: str(raw.allergies).slice(0, 160),
    activity: ACTIVITY_OPTIONS.includes(activity) ? activity : EMPTY_PROFILE.activity,
  }
}

/** Load the saved profile, repairing or discarding anything malformed. */
function loadStoredProfile(): Profile | null {
  try {
    const saved = window.localStorage.getItem(PROFILE_KEY)
    if (!saved) return null
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid profile shape')
    const clean = sanitizeProfile(parsed)
    // A record with no identity at all is treated as absent (first-time user).
    if (!clean.name && !clean.age) return null
    return clean
  } catch {
    try {
      window.localStorage.removeItem(PROFILE_KEY)
    } catch {
      /* storage unavailable — ignore */
    }
    return null
  }
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode / quota) — app still works in-memory */
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function useVitalTwin() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [onboarding, setOnboarding] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [tour, setTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [drawer, setDrawer] = useState<DrawerKind>(null)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [why, setWhy] = useState<ExplainTarget>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [historyRange, setHistoryRange] = useState<HistoryRange>('24H')

  const [engine, setEngine] = useState<EngineState>(() => createEngine(EMPTY_PROFILE))
  const [live, setLive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [lastUpdateMs, setLastUpdateMs] = useState(0)
  const [burstActive, setBurstActive] = useState(false)
  const burstRef = useRef<EngineState[]>([])

  /* ------------------------- local profile ------------------------- */

  useEffect(() => {
    const saved = loadStoredProfile()
    if (saved) {
      setProfile(saved)
      setEngine(createEngine(saved))
      setOnboarding(false)
    }
    // Always resolve hydration so the app never flashes onboarding for returning users.
    setHydrated(true)
  }, [])

  /* ------------------------ reduced motion ------------------------- */

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (value: boolean) => {
      setReducedMotion(value)
      document.documentElement.dataset.reducedMotion = value ? 'true' : 'false'
    }
    // A manual choice always wins over the OS preference and survives refresh.
    const manual = safeRead(REDUCED_KEY)
    if (manual === '1') apply(true)
    else if (manual === '0') apply(false)
    else apply(query.matches)

    const onChange = (event: MediaQueryListEvent) => {
      if (safeRead(REDUCED_KEY) !== null) return
      apply(event.matches)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const updateReducedMotion = useCallback((value: boolean) => {
    safeWrite(REDUCED_KEY, value ? '1' : '0')
    setReducedMotion(value)
    document.documentElement.dataset.reducedMotion = value ? 'true' : 'false'
  }, [])

  /* --------------------- signal propagation loop -------------------- */

  useEffect(() => {
    if (burstActive) {
      const timer = window.setInterval(() => {
        const next = burstRef.current.shift()
        if (next) {
          setEngine(next)
          setElapsedMs(prev => prev + TICK_MS * 30)
          setLastUpdateMs(0)
        } else {
          burstRef.current = []
          setBurstActive(false)
        }
      }, BURST_STEP_MS)
      return () => window.clearInterval(timer)
    }
    if (!live || paused) return
    const timer = window.setInterval(() => {
      setEngine(current => stepEngine(current))
      setElapsedMs(prev => prev + TICK_MS)
      setLastUpdateMs(0)
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [live, paused, burstActive])

  // "last signal update" ticker — independent of the propagation loop.
  useEffect(() => {
    const timer = window.setInterval(() => setLastUpdateMs(prev => prev + 1000), 1000)
    return () => window.clearInterval(timer)
  }, [])

  /* --------------------------- keyboard ---------------------------- */

  // Escape closes the top-most layer; confirmations are treated as "cancel".
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (confirm) {
        setConfirm(null)
        return
      }
      if (tour) {
        setTour(false)
        setTourStep(0)
        return
      }
      if (why) {
        setWhy(null)
        return
      }
      if (drawer) setDrawer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, tour, why, drawer])

  /* ----------------------------- actions ---------------------------- */

  const toggleLive = useCallback(() => {
    if (!live) {
      setLive(true)
      setPaused(false)
      setStarted(true)
    } else {
      setPaused(prev => !prev)
    }
  }, [live])

  const pauseLive = useCallback(() => {
    if (live) setPaused(true)
  }, [live])

  const applyScenario = useCallback((scenario: Scenario) => {
    setEngine(current => setScenarioEngine(current, scenario))
    setLive(true)
    setPaused(false)
    setStarted(true)
  }, [])

  const advance = useCallback((hours: number) => {
    setEngine(current => {
      const steps = advanceHours(current, hours)
      const [first, ...rest] = steps
      burstRef.current = rest
      setBurstActive(rest.length > 0)
      return first
    })
    setLive(true)
    setPaused(false)
    setStarted(true)
  }, [])

  const resetDemo = useCallback(() => {
    burstRef.current = []
    setBurstActive(false)
    setEngine(current => {
      const fresh = createEngine(profile)
      const resetEvent: IntelEvent = {
        id: `evt-reset-${Date.now()}`,
        time: fresh.simTime,
        kind: 'DEMO',
        severity: 'info',
        title: 'Demo simulation reset to your personal baseline.',
        body: 'Signals, timeline, and twin state returned to the starting pattern.',
        explain: {
          what: 'The demo simulation was reset.',
          label: 'Demo simulation',
          key: null,
          current: null,
          baseline: null,
          pct: null,
          unit: '',
          involved: ['Heart rate', 'Blood oxygen', 'Recovery'],
          interpretation: 'Reset restores the starting pattern so you can replay the propagation story from a clean state.',
        },
      }
      return { ...fresh, events: [resetEvent, ...fresh.events] }
    })
    setElapsedMs(0)
    setLastUpdateMs(0)
    setLive(false)
    setPaused(false)
    setStarted(false)
  }, [profile])

  const saveProfile = useCallback((next: Profile) => {
    const clean = sanitizeProfile(next)
    safeWrite(PROFILE_KEY, JSON.stringify(clean))
    setProfile(clean)
    setEngine(createEngine(clean))
    setOnboarding(false)
    setTour(true)
    setTourStep(0)
    setElapsedMs(0)
    setLastUpdateMs(0)
    setHistoryRange('24H')
    setLive(false)
    setPaused(false)
    setStarted(false)
  }, [])

  /** End the session but keep the saved profile on this device. */
  const logout = useCallback(() => {
    burstRef.current = []
    setBurstActive(false)
    setOnboarding(true)
    setDrawer(null)
    setConfirm(null)
    setWhy(null)
    setTour(false)
    setTourStep(0)
    setHistoryRange('24H')
    setLive(false)
    setPaused(false)
    setStarted(false)
    setElapsedMs(0)
    setLastUpdateMs(0)
  }, [])

  /** Remove every locally stored trace and return to a clean onboarding. */
  const clearData = useCallback(() => {
    safeRemove(PROFILE_KEY)
    safeRemove(REDUCED_KEY)
    burstRef.current = []
    setBurstActive(false)
    setProfile(EMPTY_PROFILE)
    setEngine(createEngine(EMPTY_PROFILE))
    setConfirm(null)
    setOnboarding(true)
    setDrawer(null)
    setWhy(null)
    setTour(false)
    setTourStep(0)
    setHistoryRange('24H')
    setReducedMotion(false)
    document.documentElement.dataset.reducedMotion = 'false'
    setLive(false)
    setPaused(false)
    setStarted(false)
    setElapsedMs(0)
    setLastUpdateMs(0)
  }, [])

  const closeOverlays = useCallback(() => {
    if (confirm) return
    setDrawer(null)
    setWhy(null)
  }, [confirm])

  return {
    // profile / session
    profile,
    setProfile,
    onboarding,
    hydrated,
    saveProfile,
    logout,
    clearData,
    // navigation
    tour,
    setTour,
    tourStep,
    setTourStep,
    drawer,
    setDrawer,
    confirm,
    setConfirm,
    why,
    setWhy,
    closeOverlays,
    reducedMotion,
    updateReducedMotion,
    // engine
    engine,
    live,
    paused,
    started,
    toggleLive,
    pauseLive,
    applyScenario,
    advance,
    resetDemo,
    elapsedMs,
    lastUpdateMs,
    historyRange,
    setHistoryRange,
  }
}

export type VitalTwin = ReturnType<typeof useVitalTwin>
