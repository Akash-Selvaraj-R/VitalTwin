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

export function useVitalTwin() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [onboarding, setOnboarding] = useState(true)
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
    const saved = window.localStorage.getItem(PROFILE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Profile
        setProfile(parsed)
        setEngine(createEngine(parsed))
        setOnboarding(false)
      } catch {
        window.localStorage.removeItem(PROFILE_KEY)
      }
    }
  }, [])

  /* ------------------------ reduced motion ------------------------- */

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (value: boolean) => {
      setReducedMotion(value)
      document.documentElement.dataset.reducedMotion = value ? 'true' : 'false'
    }
    apply(query.matches)
    const onChange = (event: MediaQueryListEvent) => {
      const manual = window.localStorage.getItem('vital-twin-reduced')
      if (manual) return
      apply(event.matches)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const updateReducedMotion = useCallback((value: boolean) => {
    window.localStorage.setItem('vital-twin-reduced', value ? '1' : '0')
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
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    setProfile(next)
    setEngine(createEngine(next))
    setOnboarding(false)
    setTour(true)
    setElapsedMs(0)
    setLive(false)
    setPaused(false)
    setStarted(false)
  }, [])

  const logout = useCallback(() => {
    setOnboarding(true)
    setDrawer(null)
    setConfirm(null)
    setWhy(null)
    setLive(false)
    setPaused(false)
  }, [])

  const clearData = useCallback(() => {
    window.localStorage.removeItem(PROFILE_KEY)
    window.localStorage.removeItem('vital-twin-reduced')
    setProfile(EMPTY_PROFILE)
    setEngine(createEngine(EMPTY_PROFILE))
    setConfirm(null)
    setOnboarding(true)
    setDrawer(null)
    setWhy(null)
    setLive(false)
    setPaused(false)
    setStarted(false)
    setElapsedMs(0)
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
