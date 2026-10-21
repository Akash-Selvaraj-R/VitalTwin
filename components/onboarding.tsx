'use client'

/**
 * Onboarding — preserved profile creation flow with local-only storage
 * and synthetic-data framing, presented as the VitalTwin landing experience:
 * editorial hero, live twin preview that forms as the profile is typed,
 * and the intake form.
 */

import { useMemo } from 'react'
import { ChevronRight, Info, ShieldCheck, Zap } from 'lucide-react'
import { DigitalTwin } from '@/components/digital-twin'
import { createEngine, type Profile } from '@/lib/engine'

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  inputProps,
}: {
  label: string
  name: keyof Profile
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <input name={name} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} {...inputProps} />
    </label>
  )
}

export function Onboarding({
  profile,
  onChange,
  onSubmit,
}: {
  profile: Profile
  onChange: (key: keyof Profile) => (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  // A real engine built from the profile being typed — the preview twin is the
  // same simulation the dashboard will run, never a fake illustration.
  const preview = useMemo(() => createEngine(profile), [profile])

  return (
    <main className="landing">
      <header className="landing-masthead">
        <div className="side-brand">
          <div className="brand-mark" />
          <div>
            <b>VITALTWIN</b>
            <small>PERSONAL HEALTH / 01</small>
          </div>
        </div>
        <span className="masthead-meta">PERSONAL HEALTH INTELLIGENCE · SIMULATED SIGNALS</span>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">
            <ShieldCheck /> PRIVATE LOCAL PROFILE · SYNTHETIC DATA
          </div>
          <h1>
            Your health.
            <br />
            Simulated.
            <br />
            <span>Understood.</span>
          </h1>
          <p>
            Build a calm, contextual view of your health signals and learn what changes mean against your own baseline. Your twin
            continuously compares simulated signals to your personal pattern and explains what it notices.
          </p>
          <div className="landing-stats">
            <div className="stat">
              <b>08</b>
              <span>Signals tracked</span>
            </div>
            <div className="stat">
              <b>3</b>
              <span>History ranges · 24H / 7D / 30D</span>
            </div>
            <div className="stat">
              <b>100%</b>
              <span>Stored on this device</span>
            </div>
          </div>
        </div>

        <div className="landing-twin">
          <div className="panel-heading">
            <span>TWIN PREVIEW</span>
            <span className="sync-label on">
              <i className="green-dot" /> FORMING
            </span>
          </div>
          <DigitalTwin
            signals={preview.signals}
            state={preview.twinState}
            sex={profile.sex}
            monitorLabel="PREVIEW MODE"
            live={false}
          />
          <div className="twin-footer">
            <span>
              <small>MODEL</small>
              <b>VT-01</b>
            </span>
            <span>
              <small>SOURCE</small>
              <b>YOUR INTAKE</b>
            </span>
            <span>
              <small>STATE</small>
              <b>{preview.twinState}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="landing-form">
        <div className="form-head">
          <div className="eyebrow">01 / PATIENT INTAKE</div>
          <h2>Build your twin.</h2>
          <p>
            A few details set your personal baseline — the reference every signal is compared against. Nothing here leaves this
            device.
          </p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="Full name" name="name" value={profile.name} onChange={onChange('name')} placeholder="Your name" required />
            <Field
              label="Age"
              name="age"
              value={profile.age}
              onChange={onChange('age')}
              type="number"
              placeholder="Years"
              inputProps={{ min: 5, max: 120, inputMode: 'numeric' }}
            />
            <label className="field">
              <span>Gender presentation</span>
              <select value={profile.sex} onChange={e => onChange('sex')(e.target.value)}>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </label>
            <Field label="Height" name="height" value={profile.height} onChange={onChange('height')} placeholder="cm" />
            <Field label="Weight" name="weight" value={profile.weight} onChange={onChange('weight')} placeholder="kg" />
            <label className="field">
              <span>Activity level</span>
              <select value={profile.activity} onChange={e => onChange('activity')(e.target.value)}>
                <option>Light</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </label>
          </div>
          <div className="form-grid wide">
            <Field
              label="Known conditions (optional)"
              name="conditions"
              value={profile.conditions}
              onChange={onChange('conditions')}
              placeholder="None to add"
            />
            <Field
              label="Current medications (optional)"
              name="medications"
              value={profile.medications}
              onChange={onChange('medications')}
              placeholder="None to add"
            />
            <Field
              label="Allergies (optional)"
              name="allergies"
              value={profile.allergies}
              onChange={onChange('allergies')}
              placeholder="None to add"
            />
          </div>
          <div className="trust-note">
            <Info /> Your profile stays on this device. Signals in this prototype are simulated.
          </div>
          <button className="primary-button" type="submit">
            <Zap /> CREATE MY DIGITAL TWIN <ChevronRight />
          </button>
        </form>
        <p className="demo-disclaimer">
          <ShieldCheck /> VitalTwin is a prototype for personal health intelligence using synthetic signals. It is not a medical
          diagnostic system or emergency service.
        </p>
      </section>
    </main>
  )
}
