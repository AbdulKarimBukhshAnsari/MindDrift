# MindDrift — MVP Feature Checklist

Working names: **TabSense** / MindDrift / FocusLeak  
Platform: Chrome Extension (Manifest V3) · Local-first

> Catch the exact moment a user loses focus and gently intervene.

## In scope

- [ ] **Feature 1 — Real-time focus break detection**
  - Track tab switch timestamps, dwell time, revisits, switch frequency
  - Rules: ≥5 switches / 120s · short visits &lt;20s · ping-pong ≥3
  - Message: "You're switching too fast. Focus slipping?" → Continue | Go back
  - Cooldown 3 min · non-intrusive · auto-dismiss
- [ ] **Feature 2 — Smart focus session suggestion**
  - Trigger after ~5–7 min stable dwell
  - "You're in focus. Start a 25-min session?" → Start | Ignore
  - Interrupt on tab switch during session
- [ ] **Feature 3 — Custom distraction control**
  - Default distracting domains + user mark yes/no
  - Warn after 15+ min on distracting domain
- [ ] **Feature 4 — Daily brutal insight**
  - 1–2 lines only (no graphs/dashboards)
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
