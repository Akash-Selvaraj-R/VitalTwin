'use client'

/**
 * Profile + Settings drawers — preserved from the original VitalTwin flow,
 * upgraded for the baseline-centric experience.
 */

import { ChevronRight, LogOut, Settings, ShieldCheck, UserRound, X } from 'lucide-react'
import type { EngineState, Profile } from '@/lib/engine'

export function ProfileDrawer({
  profile,
  engine,
  onClose,
  onEdit,
  onLogout,
}: {
  profile: Profile
  engine: EngineState
  onClose: () => void
  onEdit: () => void
  onLogout: () => void
}) {
  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-label="Patient profile" tabIndex={-1}>
      <button className="close-button" onClick={onClose} aria-label="Close profile">
        <X />
      </button>
      <span className="eyebrow">PATIENT PROFILE</span>
      <div className="profile-avatar">
        <UserRound />
      </div>
      <h2>{profile.name || 'Demo Patient'}</h2>
      <p>
        {profile.age ? `${profile.age} years · ` : ''}
        {profile.sex} · {profile.activity} activity
      </p>
      <div className="profile-list">
        <span>TWIN STATE</span>
        <b className={`state-${engine.twinState.toLowerCase()}`}>{engine.twinState} · SYNCHRONIZED</b>
        <span>PERSONAL BASELINE · HR</span>
        <b>{engine.baseline.hr} BPM (your pattern)</b>
        <span>HEIGHT / WEIGHT</span>
        <b>
          {profile.height || '—'} / {profile.weight || '—'}
        </b>
        <span>CONDITIONS</span>
        <b>{profile.conditions || 'None added'}</b>
        <span>MEDICATIONS</span>
        <b>{profile.medications || 'None added'}</b>
        <span>ALLERGIES</span>
        <b>{profile.allergies || 'None added'}</b>
      </div>
      <div className="trust-note">
        <ShieldCheck /> Baselines are personalized from this profile for simulation only.
      </div>
      <button className="drawer-action" onClick={onEdit}>
        EDIT PROFILE <ChevronRight />
      </button>
      <button className="drawer-action danger" onClick={onLogout}>
        <LogOut /> LOG OUT
      </button>
    </aside>
  )
}

export function SettingsDrawer({
  reducedMotion,
  onReducedMotion,
  onClose,
  onTour,
  onProfile,
  onClear,
  onLogout,
}: {
  reducedMotion: boolean
  onReducedMotion: (value: boolean) => void
  onClose: () => void
  onTour: () => void
  onProfile: () => void
  onClear: () => void
  onLogout: () => void
}) {
  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-label="Settings" tabIndex={-1}>
      <button className="close-button" onClick={onClose} aria-label="Close settings">
        <X />
      </button>
      <span className="eyebrow">SETTINGS</span>
      <h2>Make VitalTwin yours.</h2>
      <div className="settings-group">
        <label>
          <span>
            <Settings /> Reduced motion
          </span>
          <input type="checkbox" checked={reducedMotion} onChange={e => onReducedMotion(e.target.checked)} />
        </label>
        <button onClick={onTour}>
          Replay guided tour <ChevronRight />
        </button>
        <button onClick={onProfile}>
          Edit profile <ChevronRight />
        </button>
      </div>
      <div className="settings-danger">
        <button onClick={onClear}>Clear local health data</button>
        <button onClick={onLogout}>Log out</button>
      </div>
      <div className="trust-note">
        <ShieldCheck /> VitalTwin is a prototype for personal health intelligence using synthetic signals.
      </div>
    </aside>
  )
}

export function ConfirmCard({
  kind,
  onConfirm,
  onCancel,
}: {
  kind: 'logout' | 'clear'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" tabIndex={-1}>
      <h2 id="confirm-title">{kind === 'logout' ? 'Log out of VitalTwin?' : 'Clear local health data?'}</h2>
      <p>
        {kind === 'logout'
          ? 'Logging out ends this session and returns you to onboarding. Your saved profile stays on this device.'
          : 'This permanently removes your saved profile and local settings from this device. It cannot be undone — you will start again from onboarding.'}
      </p>
      <div className="confirm-actions">
        <button className="danger" onClick={onConfirm}>
          {kind === 'logout' ? 'LOG OUT' : 'CLEAR DATA'}
        </button>
        <button onClick={onCancel} autoFocus>
          CANCEL
        </button>
      </div>
    </div>
  )
}
