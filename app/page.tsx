'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  ChevronRight,
  Info,
  LogOut,
  Menu,
  Radio,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { DigitalTwin, EcgStrip } from '@/components/digital-twin'
import { SignalCard } from '@/components/signal-card'
import { HealthScore } from '@/components/health-score'
import { TwinSees } from '@/components/twin-sees'
import { MonitoringStrip } from '@/components/monitoring-strip'
import { IntelligenceFeed } from '@/components/intelligence-feed'
import { ExplainabilityDrawer } from '@/components/explainability-drawer'
import { HistoryDrawer } from '@/components/history-drawer'
import { ProfileDrawer, SettingsDrawer, ConfirmCard } from '@/components/account-drawers'
import { Onboarding } from '@/components/onboarding'
import { TourOverlay } from '@/components/tour-overlay'
import { DemoControls } from '@/components/demo-controls'

import { CARD_SIGNALS, SIGNAL_META, formatSigned, formatValue, heroCopy, monitorState, relativeUpdate } from '@/lib/engine'
import { useVitalTwin } from '@/lib/use-vital-twin'

function greetingFor(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Page() {
  const vt = useVitalTwin()
  const { engine, profile } = vt
  const [mobileNav, setMobileNav] = useState(false)

  // Move focus into the top-most overlay so keyboard users are never stranded.
  // Confirmations focus their safe action (CANCEL) via autoFocus instead.
  useEffect(() => {
    if (vt.confirm) return
    if (vt.drawer || vt.why || vt.tour) {
      const layer = document.querySelector<HTMLElement>('.drawer, .confirm-card, .tour-card')
      layer?.focus()
    }
  }, [vt.drawer, vt.why, vt.confirm, vt.tour])

  // Escape also closes the mobile navigation drawer.
  useEffect(() => {
    if (!mobileNav) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNav(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNav])

  const hero = heroCopy(engine.twinState)
  const stateKey = engine.twinState.toLowerCase()
  const monState = monitorState(vt.live, vt.paused, vt.started, engine.scenario)
  const liveLabel =
    monState === 'IDLE'
      ? 'START LIVE MONITORING'
      : monState === 'PAUSED'
        ? 'MONITORING PAUSED'
        : monState === 'RECOVERY'
          ? 'RECOVERY MODE'
          : 'LIVE MONITORING ACTIVE'
  const latestEvent = engine.events[0]

  const update = (key: keyof typeof profile) => (value: string) => vt.setProfile(current => ({ ...current, [key]: value }))
  const saveProfileForm = (event: React.FormEvent) => {
    event.preventDefault()
    vt.saveProfile(profile)
  }

  const navItems = [
    { label: 'Overview', icon: Activity, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Live signals', icon: Radio, action: () => document.getElementById('vitals')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Intelligence', icon: BrainCircuit, action: () => document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'History', icon: RotateCcw, action: () => vt.setDrawer('history') },
    { label: 'Profile', icon: UserRound, action: () => vt.setDrawer('profile') },
    { label: 'Settings', icon: Settings, action: () => vt.setDrawer('settings') },
  ]

  if (!vt.hydrated) {
    // Avoid flashing onboarding (or a mismatched dashboard) while local storage is read.
    return (
      <main className="onboarding boot-splash">
        <div className="boot-brand">
          <div className="brand-mark" />
          <b>VITALTWIN</b>
          <small>SYNCING YOUR PERSONAL TWIN…</small>
        </div>
      </main>
    )
  }

  if (vt.onboarding) {
    return <Onboarding profile={profile} onChange={update} onSubmit={saveProfileForm} />
  }

  return (
    <main className="app" data-twin-state={stateKey}>
      <aside className="sidebar">
        <header className="side-brand">
          <div className="brand-mark" />
          <div>
            <b>VITALTWIN</b>
            <small>PERSONAL HEALTH / 01</small>
          </div>
        </header>
        <button className="patient-chip" onClick={() => vt.setDrawer('profile')}>
          <UserRound />
          <div>
            <small>ACTIVE PATIENT</small>
            <b>{profile.name || 'Demo Patient'}</b>
            <span>
              {profile.age ? `${profile.age} years · ` : ''}
              {profile.sex}
            </span>
          </div>
          <ChevronRight />
        </button>
        <nav aria-label="Primary">
          {navItems.map((item, index) => (
            <button
              key={item.label}
              className={index === 0 ? 'nav-active' : undefined}
              aria-current={index === 0 ? 'page' : undefined}
              onClick={item.action}
            >
              <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
              <item.icon /> <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <span>
            <i className={`green-dot ${vt.live && !vt.paused ? 'breathing' : ''}`} /> SYSTEM {vt.live ? (vt.paused ? 'PAUSED' : 'LIVE') : 'ONLINE'}
          </span>
          <span>
            <i className="cyan-dot" /> TWIN {engine.twinState}
          </span>
        </div>
      </aside>

      <section className="dashboard">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <Menu />
          </button>
          <div>
            <span className="eyebrow">
              PERSONAL DIGITAL TWIN · {relativeUpdate(vt.lastUpdateMs)} · {engine.syncQuality.toFixed(1)}% SYNC
            </span>
            <h2>
              {greetingFor()}, {profile.name || 'there'}.
            </h2>
          </div>
          <div className="top-actions">
            <button className="quiet-button" onClick={() => vt.setDrawer('profile')}>
              <UserRound /> Profile
            </button>
            <button className={vt.live && !vt.paused ? 'live-button active' : 'live-button'} onClick={vt.toggleLive}>
              <span className={`green-dot ${vt.live && !vt.paused ? 'breathing' : ''}`} /> {liveLabel}
            </button>
          </div>
        </header>

        <div className="section strip-wrap">
          <MonitoringStrip
            engine={engine}
            live={vt.live}
            paused={vt.paused}
            started={vt.started}
            elapsedMs={vt.elapsedMs}
            lastUpdateMs={vt.lastUpdateMs}
            onToggle={vt.toggleLive}
          />
        </div>

        <div className="hero-grid">
          <section className="hero-copy">
            <div className="eyebrow">
              <span className={`green-dot ${vt.live && !vt.paused ? 'breathing' : ''}`} /> VITALTWIN INTELLIGENCE
            </div>
            <h1>
              {hero.titleTop}
              <br />
              <span>{hero.titleBottom}</span>
            </h1>
            <p>{hero.body}</p>
            <div className="hero-actions">
              <button className={`state-pill pill-${stateKey}`} onClick={() => vt.setWhy({ event: null })}>
                {engine.twinState} <Info />
              </button>
              <button className="text-button" onClick={() => vt.setTour(true)}>
                TAKE THE TOUR <ChevronRight />
              </button>
            </div>
            <dl className="hero-meta">
              <div>
                <dt>MODEL</dt>
                <dd>VT-01</dd>
              </div>
              <div>
                <dt>SIGNALS IN PLAY</dt>
                <dd>{String(engine.readings.length).padStart(2, '0')}</dd>
              </div>
              <div>
                <dt>BASELINE</dt>
                <dd>PERSONAL</dd>
              </div>
            </dl>
            {latestEvent && (
              <button className="assistant-message" onClick={() => vt.setWhy({ event: latestEvent })}>
                <BrainCircuit />
                <div>
                  <span>YOUR TWIN · {latestEvent.kind}</span>
                  {latestEvent.title}
                </div>
                <ChevronRight />
              </button>
            )}
            <div className="disclaimer">
              <ShieldCheck/> Observations are contextual signals from simulated data, not medical diagnoses.
            </div>
          </section>

          <section className="hero-panel">
            <div className="panel-heading">
              <span>LIVE DIGITAL TWIN</span>
              <span className={`sync-label ${vt.live && !vt.paused ? 'on' : ''}`}>
                <i className="green-dot" /> {vt.live ? (vt.paused ? 'PAUSED' : 'MONITORING') : 'READY'}
              </span>
            </div>
            <DigitalTwin
              signals={engine.signals}
              state={engine.twinState}
              sex={profile.sex}
              monitorLabel={liveLabel}
              live={vt.live && !vt.paused}
            />
            <EcgStrip signals={engine.signals} state={engine.twinState} />
            <div className="twin-footer">
              <span>
                <small>SYNC QUALITY</small>
                <b>{engine.syncQuality.toFixed(1)}%</b>
              </span>
              <span>
                <small>SAMPLES</small>
                <b>{engine.signalCount.toLocaleString('en-US')}</b>
              </span>
              <span>
                <small>LAST UPDATE</small>
                <b>{relativeUpdate(vt.lastUpdateMs)}</b>
              </span>
              <span>
                <small>MODEL</small>
                <b>VT-01</b>
              </span>
            </div>
          </section>
        </div>

        <div className="section">
          <TwinSees engine={engine} />
        </div>

        <section id="vitals" className="section">
          <div className="section-header">
            <div>
              <span className="eyebrow">01 / LIVE SIGNALS</span>
              <h3>Signals compared to your baseline</h3>
            </div>
            <div className="scenario-controls">
              {(['stable', 'elevated', 'recovery'] as const).map(key => (
                <button
                  key={key}
                  className={engine.scenario === key ? 'selected' : ''}
                  aria-pressed={engine.scenario === key}
                  onClick={() => vt.applyScenario(key)}
                >
                  {key === 'stable' ? 'STABLE DAY' : key === 'elevated' ? 'ELEVATED SIGNALS' : 'RECOVERY'}
                </button>
              ))}
            </div>
          </div>
          <div className="metrics-grid">
            {CARD_SIGNALS.map(key => {
              const reading = engine.readings.find(r => r.key === key)!
              return <SignalCard key={key} reading={reading} trend={engine.trend[key]} />
            })}
          </div>
        </section>

        <section className="section lower-grid">
          <HealthScore score={engine.score} state={engine.twinState} />

          <article className="panel baseline-panel">
            <div className="panel-heading">
              <span>YOUR PERSONAL BASELINE</span>
              <span className="baseline-badge">PERSONAL, NOT GENERIC</span>
            </div>
            <h3>Your normal is personal.</h3>
            <p>VitalTwin compares every signal against your own recent pattern, not a generic threshold.</p>
            <div className="baseline-table">
              <div className="baseline-table-head">
                <span>SIGNAL</span>
                <span>YOUR BASELINE</span>
                <span>NOW</span>
                <span>DEVIATION</span>
              </div>
              {CARD_SIGNALS.map(key => {
                const reading = engine.readings.find(r => r.key === key)!
                const tone = reading.direction === 'WITHIN' ? 'within' : reading.direction === 'ABOVE' ? 'above' : 'below'
                return (
                  <div className="baseline-table-row" key={key}>
                    <span>{SIGNAL_META[key].label}</span>
                    <b>
                      {formatValue(key, reading.baseline)}
                      <small> {SIGNAL_META[key].unit}</small>
                    </b>
                    <b className={`now-${tone}`}>
                      {formatValue(key, reading.current)}
                      <small> {SIGNAL_META[key].unit}</small>
                    </b>
                    <em className={`dev-${tone}`}>
                      {reading.direction === 'WITHIN' ? 'IN PATTERN' : formatSigned(Math.round(reading.pct)) + '%'}
                    </em>
                  </div>
                )
              })}
            </div>
            <button className="text-button" onClick={() => vt.setWhy({ event: null })}>
              WHY THIS MATTERS <ChevronRight />
            </button>
          </article>

          <IntelligenceFeed
            events={engine.events}
            onExplain={event => vt.setWhy({ event })}
            onOpenHistory={() => vt.setDrawer('history')}
          />
        </section>

        <DemoControls
          engine={engine}
          live={vt.live}
          paused={vt.paused}
          onScenario={vt.applyScenario}
          onToggle={vt.toggleLive}
          onAdvance={vt.advance}
          onReset={vt.resetDemo}
        />

        <footer className="demo-disclaimer footer-disclaimer">
          <ShieldCheck /> VitalTwin is a prototype for personal health intelligence using synthetic signals. It is not a medical
          diagnostic system or emergency service.
        </footer>
      </section>

      {(vt.drawer || vt.why || vt.tour || vt.confirm || mobileNav) && (
        <div
          className="overlay"
          aria-hidden="true"
          onClick={() => {
            if (!vt.confirm) {
              setMobileNav(false)
              vt.closeOverlays()
            }
          }}
        />
      )}

      {mobileNav && (
        <nav className="mobile-nav" aria-label="Mobile">
          <div className="mobile-nav-head">
            <b>VITALTWIN</b>
            <button onClick={() => setMobileNav(false)} aria-label="Close navigation">
              <X />
            </button>
          </div>
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => {
                setMobileNav(false)
                item.action()
              }}
            >
              <item.icon /> {item.label}
            </button>
          ))}
          <button
            className="mobile-logout"
            onClick={() => {
              setMobileNav(false)
              vt.setConfirm('logout')
            }}
          >
            <LogOut /> Log out
          </button>
        </nav>
      )}

      {vt.drawer === 'profile' && (
        <ProfileDrawer
          profile={profile}
          engine={engine}
          onClose={() => vt.setDrawer(null)}
          onEdit={() => vt.setDrawer('settings')}
          onLogout={() => vt.setConfirm('logout')}
        />
      )}
      {vt.drawer === 'settings' && (
        <SettingsDrawer
          reducedMotion={vt.reducedMotion}
          onReducedMotion={vt.updateReducedMotion}
          onClose={() => vt.setDrawer(null)}
          onTour={() => {
            vt.setDrawer(null)
            vt.setTour(true)
          }}
          onProfile={() => vt.setDrawer('profile')}
          onClear={() => vt.setConfirm('clear')}
          onLogout={() => vt.setConfirm('logout')}
        />
      )}
      {vt.drawer === 'history' && (
        <HistoryDrawer
          engine={engine}
          profileName={profile.name}
          range={vt.historyRange}
          onRange={vt.setHistoryRange}
          onClose={() => vt.setDrawer(null)}
        />
      )}
      {vt.why && <ExplainabilityDrawer engine={engine} event={vt.why.event} onClose={() => vt.setWhy(null)} />}
      {vt.tour && (
        <div className="tour-wrap">
          <TourOverlay step={vt.tourStep} onStep={vt.setTourStep} onClose={() => { vt.setTour(false); vt.setTourStep(0) }} />
        </div>
      )}
      {vt.confirm && <ConfirmCard kind={vt.confirm} onConfirm={() => (vt.confirm === 'logout' ? vt.logout() : vt.clearData())} onCancel={() => vt.setConfirm(null)} />}
    </main>
  )
}
