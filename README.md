# MindDrift

**Catch the exact moment you lose focus — and gently intervene.**

MindDrift is a lightweight, **local-first** Chrome extension (Manifest V3) that detects focus loss from real browsing behavior — not just time tracking — and nudges you in the moment.

> Working name in the MVP brief: **TabSense** · Alternatives: FocusLeak, MindDrift

**Stack:** React · TypeScript · Vite · `@crxjs/vite-plugin`

---

## Developers

| Role | Name | GitHub |
| --- | --- | --- |
| Engineering | [Abdul Karim Bukhsh Ansari](https://github.com/AbdulKarimBukhshAnsari) | [@AbdulKarimBukhshAnsari](https://github.com/AbdulKarimBukhshAnsari) |
| Data / Behavior logic | [Sana Jamal](https://github.com/SanaJamal-45) | [@SanaJamal-45](https://github.com/SanaJamal-45) |

---

## Why MindDrift?

Most productivity tools show charts after the fact. MindDrift aims for a different reaction:

> *"This caught me exactly when I lost focus."*

Not:

> *"This shows nice stats."*

**MVP explicitly excludes:** dashboards, complex graphs, AI/ML, backend/cloud storage, and authentication. All processing stays on the device via `chrome.storage.local`.

---

## MVP features (planned)

| # | Feature | Intent |
| --- | --- | --- |
| 1 | **Real-time focus break detection** | Rapid switches, short dwells, ping-pong tabs → gentle alert + cooldown |
| 2 | **Smart focus session suggestion** | Stable dwell (~5–7 min) → offer a 25-min session |
| 3 | **Custom distraction control** | Default + user-marked domains; warn on long distracting stays |
| 4 | **Daily brutal insight** | 1–2 factual lines per day — no charts |

Full checklist: [`docs/MVP.md`](docs/MVP.md) · Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Project structure

```text
MindDrift/
├── AGENTS.md                  # Conventions for AI / contributors
├── .cursor/rules/             # Cursor project rules
├── manifest.config.ts         # Typed MV3 manifest (CRXJS)
├── vite.config.ts             # @ → src alias
├── docs/
│   ├── MVP.md
│   └── ARCHITECTURE.md
└── src/
    ├── background/            # Service worker entry
    ├── popup/                 # Thin popup shell
    ├── options/               # Thin options shell
    ├── content/               # Optional content script
    ├── components/            # screens/ + ui/
    ├── chrome/                # storage, messaging, tabs
    ├── constants/             # keys, thresholds, messages
    ├── lib/                   # detection + pure helpers
    ├── types/                 # shared TypeScript types
    ├── hooks/                 # reusable React hooks
    └── styles/
```

Path alias: import from `@/…` (maps to `src/`). See [`AGENTS.md`](AGENTS.md).

Scaffold only: React shells and TypeScript stubs. Feature logic is left for you to implement.

---

## Prerequisites

- Node.js **18+**
- npm (or pnpm / yarn)
- Google Chrome (or another Chromium browser with Manifest V3)

---

## Setup

```bash
git clone https://github.com/AbdulKarimBukhshAnsari/MindDrift.git
cd MindDrift
npm install
```

### Development

```bash
npm run dev
```

This **watches your files and rebuilds `dist/` on every save**. Load the unpacked extension from `dist/`, then after each change: close and reopen the popup.

Optional: `npm run dev:hmr` uses Vite HMR (live update while the popup stays open). Prefer `npm run dev` if you want `dist/` always up to date without a manual build.

### Production build

```bash
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the **`dist/`** folder (not the repo root)

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch mode — auto-rebuilds `dist/` on save |
| `npm run dev:hmr` | Vite + CRXJS HMR (popup must stay open) |
| `npm run build` | Typecheck + one-shot production bundle → `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm run zip` | Build and zip `dist/` for sharing |

Bump `version` in `package.json` before release (manifest version is sourced from it).

---

## Permissions (why we ask)

| Permission | Reason |
| --- | --- |
| `tabs` | Observe activation / updates for switch & dwell signals |
| `storage` | Persist classifications, settings, and daily stats locally |
| `alarms` | Drive the 25-minute focus session timer |
| `notifications` | Deliver non-intrusive interventions |

No host permissions by default. Register `src/content/content.ts` in `manifest.config.ts` only if you need in-page UI.

---

## Development practices

1. **Manifest V3 only** — service worker background, not a persistent page.
2. **React for UI** — popup and options are React apps; keep Chrome API calls typed via `@types/chrome`.
3. **Least privilege** — add permissions only when a feature needs them.
4. **Local-first** — `chrome.storage.local` only; no analytics SDKs or remote APIs in MVP.
5. **Thin service worker** — thresholds and detection live in `src/shared/`.
6. **Message-based UI** — React screens talk to the worker via `chrome.runtime.sendMessage`.
7. **Cooldown & calm UX** — respect the 3-minute alert cooldown; auto-dismiss; never spam.
8. **Evidence over magic numbers** — document threshold changes in `docs/` when research retunes them.

### Suggested implementation order

1. Tab event plumbing + storage schema  
2. Feature 1 detection rules + notification UI  
3. Feature 3 classifications  
4. Feature 2 focus session + alarms  
5. Feature 4 daily insight in the popup  

---

## Target users

- Remote workers with heavy browser usage  
- Freelancers  
- University students  
- Anyone actively trying to reduce distraction  

---

## Status

**Scaffold / v0.1.0** — React + TypeScript + Vite + CRXJS project layout with placeholder UI. Feature implementation is in progress.

---

## License

[MIT](LICENSE) © 2026 [Abdul Karim Bukhsh Ansari](https://github.com/AbdulKarimBukhshAnsari) & [Sana Jamal](https://github.com/SanaJamal-45)
