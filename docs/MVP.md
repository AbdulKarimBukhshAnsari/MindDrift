# MindDrift — MVP Feature Checklist

Working names: **TabSense** / MindDrift / FocusLeak  
Platform: Chrome Extension (Manifest V3) · Local-first

> Catch the exact moment a user loses focus and gently intervene.

## In scope

- [x] **Feature 0 — Persona initialization** (popup onboarding)
- [ ] **Feature 1 — Real-time focus break detection**
  - Track tab switch timestamps, dwell time, revisits, switch frequency
  - Persona rule sets: Deep Reader / Standard Worker / Rapid Researcher
    (see [`docs/PERSONA_THRESHOLDS.md`](PERSONA_THRESHOLDS.md))
  - Persona-aware intervention copy + cooldown
  - Non-intrusive modal · auto-dismiss · optional 1h pause
- [ ] **Feature 2 — Smart focus session suggestion**
  - Trigger after persona dwell threshold
  - "You're in focus. Start a 25-min session?" → Start | Ignore
  - Interrupt on disqualifying tab switch during session
- [ ] **Feature 3 — Custom distraction control**
  - Default distracting domains + user mark yes/no
  - Workspace clusters (Rapid Researcher on by default)
  - Warn after persona distracting-dwell threshold
- [ ] **Feature 4 — Daily brutal insight**
  - 1–2 lines only (no graphs/dashboards)
  - Persona-toned copy
  - Switches, avg interval, longest streak, distracting time

## Explicit non-goals (MVP)

- Dashboards / complex charts
- AI/ML models
- Backend / cloud storage
- User authentication

## Success criteria

- User gets at least one real-time intervention
- Daily insight feels accurate
- Used for 3+ days

Desired reaction: *"This caught me exactly when I lost focus."*
