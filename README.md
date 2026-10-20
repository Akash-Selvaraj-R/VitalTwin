# VitalTwin — Personal Health Digital Twin

> **An intelligent Digital Twin that learns a patient's personal baseline, continuously observes changing health signals, detects meaningful deviations, and explains what it sees.**

VitalTwin is a **healthcare proof-of-concept** built for the **Digital Twin Challenge 2026**. It turns a static health dashboard into a living, explainable companion: a simulated Digital Twin that watches a patient's vital-sign signals, compares every reading against that patient's *own* baseline, and narrates meaningful changes in plain, careful language.

---

## ⚕️ Safety notice — read first

**VitalTwin is a digital health prototype using simulated data for demonstration. It is not a medical device and does not provide diagnosis or replace professional medical advice.**

- Every signal, history point, and health score in VitalTwin is **synthetic** (deterministically simulated).
- VitalTwin does **not** detect emergencies, predict disease, or claim clinical validity.
- No real patient data, wearable feeds, or hospital systems are connected.
- Language throughout the app is deliberately non-diagnostic: *"signal"*, *"pattern"*, *"elevated"*, *"outside your usual baseline"*, *"consider seeking medical advice"*.

---

## The problem

People receive more health numbers than they can interpret — heart rate here, oxygen there, a temperature tomorrow. Raw values rarely answer the questions that matter:

- *Is this normal — for **me**?*
- *What changed, and when did it start?*
- *Why should I care about this reading?*

Population-wide thresholds can't answer these questions. A heart rate of 88 bpm can be unremarkable for one person and a clear departure from their own pattern for another. The gap between **having data** and **understanding data** is where anxiety, missed patterns, and wasted clinical attention live.

## The healthcare use case

VitalTwin demonstrates the **personal-baseline layer** of a future clinical journey:

1. A patient builds a private, local profile (age, sex, activity level, context).
2. A Digital Twin derives a **personal baseline** — the patient's own recent pattern, not a generic range.
3. During monitoring, the Twin observes simulated signals and compares each one to that baseline.
4. When signals move meaningfully, the Twin **notices → interprets → explains → suggests a safe next step**.
5. The patient (and later, a clinician) can open any event and see the full chain of reasoning: what the twin saw, the baseline, the detected change, why it matters, and what to consider doing.

The prototype focuses on **explainability and trust** — the hardest and most human part of applying digital twins to health.

---

## What is implemented (working prototype)

| Area | Status |
| --- | --- |
| Guided onboarding with private, local-only profile | ✅ |
| Personal baseline derived from profile (age / sex / activity aware) | ✅ |
| Live Digital Twin visualization reacting to simulated HR, SpO₂, RR, temperature, stress, recovery | ✅ |
| Deterministic signal-propagation engine (no `Math.random` — reproducible) | ✅ |
| Live monitoring loop with pause/resume, elapsed time, sync quality | ✅ |
| Twin state machine: STABLE → ATTENTION → RECOVERING (with hysteresis) | ✅ |
| Contextual intelligence events for *meaningful* transitions only | ✅ |
| Explainability drawer (what the twin saw → baseline → change → why it matters → what you can do) | ✅ |
| Personal baseline comparison table (current signal vs. your baseline) | ✅ |
| Health score with transparent breakdown (alignment / recovery / stability) | ✅ |
| History: 24H / 7D / 30D synthetic timeline + live captures | ✅ |
| Demo scenario controls: NORMAL → ELEVATED → RECOVERY, +1h / +6h fast-forward | ✅ |
| Profile & settings drawers, guided tour replay, logout, clear-local-data | ✅ |
| Reduced-motion support (OS preference + manual toggle, persisted) | ✅ |
| Keyboard accessibility (Escape closes layers, focus management, dialog semantics) | ✅ |
| Responsive layout (desktop → tablet → mobile) with neo-brutalist healthcare UI | ✅ |
| Local persistence with malformed-data repair | ✅ |

**Everything above runs fully client-side. There is no backend.**

## Simulated data

All health signals are produced by `lib/engine.ts` — a pure, framework-free, **deterministic** simulation:

```
signal update
  → personal baseline comparison
  → deviation calculation (%, direction, meaning)
  → twin state machine (hysteresis-filtered)
  → health score (contextual, never clinical)
  → intelligence event (only on meaningful transitions)
  → explanation payload (what / baseline / change / why / next step)
```

- **Deterministic**: values derive from a hash of the patient profile + tick counter — the same demo replays identically (important for judging and for reproducibility).
- **Medically plausible**: baselines and scenario deltas follow well-known resting ranges and are clamped to safe bounds.
- **Clearly labelled**: the UI marks signals, ECG strip, and history as simulated wherever they appear.

## Technical stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) · React 19 · TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 4 + custom neo-brutalist design system (`app/live.css`, `app/globals.css`) |
| UI | Hand-built components, lucide-react icons, Base UI primitives |
| Simulation | Custom deterministic engine (`lib/engine.ts`), zero ML dependencies required to run |
| State | Single React hook (`lib/use-vital-twin.ts`) with cleaned-up intervals |
| Persistence | `localStorage` only (profile + settings), sanitized on read |
| Analytics | Vercel Analytics (production builds only) |

### AI / ML model details

The intelligence layer is a **rule-based, baseline-relative signal-propagation model** (see `lib/engine.ts`):

- **Personal baseline estimation** — profile features (age, sex, height/weight → BMI, activity level) map to per-signal baseline values using transparent, adjustable heuristics.
- **Deviation detection** — each signal is scored against per-signal tolerance and major-deviation thresholds relative to *that patient's* baseline.
- **State estimation with hysteresis** — a filtered state machine prevents flicker; transitions require sustained evidence.
- **Event synthesis** — only meaningful transitions generate events, each carrying a structured explanation payload.

This is intentionally interpretable rather than black-box: every output can be traced to explicit inputs — the core requirement for trustworthy health-facing AI. The architecture is designed so a learned baseline model (e.g., patient-specific time-series forecasting) can replace the heuristic baseline layer **without changing the surrounding UX or explanation contract**.

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:3000

pnpm build    # production build (type-checked)
pnpm start    # serve the production build
```

Requirements: Node.js 20+, pnpm 11.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ app/page.tsx — composition root (dashboard, drawers, tour)  │
├──────────────────────────┬──────────────────────────────────┤
│ lib/use-vital-twin.ts    │ lib/engine.ts                    │
│ React binding            │ Pure deterministic simulation    │
│ • profile persistence    │ • personal baseline derivation   │
│ • live tick loop         │ • deviation + scoring            │
│ • scenario control       │ • twin state machine             │
│ • overlay/session state  │ • intelligence events            │
│ • keyboard/a11y          │ • history generation             │
├──────────────────────────┴──────────────────────────────────┤
│ components/ — DigitalTwin viz, SignalCards, HealthScore,     │
│ IntelligenceFeed, Explainability & History & Account drawers │
├─────────────────────────────────────────────────────────────┤
│ localStorage — profile + settings only (never leaves device) │
└─────────────────────────────────────────────────────────────┘
```

## 15–20 minute demo script

1. **Introduce the patient** — explain the concept in one sentence.
2. **Complete onboarding** — name, age, sex, activity; create the Digital Twin.
3. **Guided tour** — walk the 7-step tour.
4. **Personal baseline** — show "your normal is personal" comparison table.
5. **Start LIVE MONITORING** — vitals begin evolving; heart node beats at simulated HR.
6. **Watch the vitals** — sparklines, deviation chips, sync quality, signal count.
7. **Health score** — transparent alignment / recovery / stability breakdown.
8. **Trigger ELEVATED scenario** — signals drift up together; twin moves to ATTENTION.
9. **Open an intelligence event** — contextual, timestamped, non-diagnostic.
10. **Open explainability** — what the twin saw → baseline → change → why → what to do.
11. **Compare signal vs. baseline** — the deviation is personal, not generic.
12. **Switch to RECOVERY** — watch signals ease back; events mark the return.
13. **Show progression** — fast-forward +1h / +6h to demonstrate full propagation.
14. **History** — 24H / 7D / 30D timeline with attention and recovery periods.
15. **Profile / settings** — patient card, reduced motion, replay tour.
16. **Logout & clear data** — confirmations, then a clean return to onboarding.

No dead ends: every state can be reached, explained, and exited.

## Project structure

```
app/                  page.tsx, layout.tsx, globals.css, live.css
components/           digital-twin, signal-card, health-score, twin-sees,
                      monitoring-strip, intelligence-feed, explainability-drawer,
                      history-drawer, account-drawers, onboarding, tour-overlay,
                      demo-controls
lib/                  engine.ts (simulation), use-vital-twin.ts (React binding)
public/               icons
```

## Future scope (deliberately NOT implemented)

To stay focused and reliable for the challenge, the following are roadmap items only:

GPS / location tracking · nearby hospital search · emergency contacts · SMS / WhatsApp alerts · real wearable APIs · hospital / EHR integration · ABHA integration · real patient data · production-grade prediction · emergency response automation

## Submission checklist

- **Repository**: https://github.com/Akash-Selvaraj-R/VitalTwin
- **License**: MIT (see [LICENSE](LICENSE)) — open source
- **Team details / college / incubator**: *(add team roster and institution details here before final submission)*
- **Demo video (15–20 min)**: *(record and link here)*
- **Presentation / architecture deck**: *(export and link here)*

> Placeholders above are intentionally left for the team to fill with real information — no links are claimed that don't exist yet.

---

*VitalTwin — a calm, explainable proof-of-concept for personal health intelligence. Simulated data. Not a medical device.*
