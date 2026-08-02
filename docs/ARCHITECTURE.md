# MindDrift — Architecture Notes

Local-first Chrome Extension (Manifest V3) built with **React + TypeScript + Vite** (`@crxjs/vite-plugin`).

No backend, auth, or cloud storage in MVP.

## Stack

| Piece | Choice |
| --- | --- |
| UI | React 18+ |
| Language | TypeScript (strict) |
| Bundler | Vite |
| Extension tooling | `@crxjs/vite-plugin` |
| Manifest | `manifest.config.ts` (typed) |
| Path alias | `@/*` → `src/*` |

## Layer map

| Layer | Path | Role |
| --- | --- | --- |
| Manifest | `manifest.config.ts` | MV3 config, permissions, entry points |
| Service worker | `src/background/service-worker.ts` | Tab listeners, orchestration, alarms, notifications |
| Popup shell | `src/popup/` | Mount + route only |
| Options shell | `src/options/` | Settings page mount |
| Screens / UI | `src/components/` | React screens and shared primitives |
| Chrome APIs | `src/chrome/` | storage, messaging, tabs wrappers |
| Constants | `src/constants/` | Keys, thresholds, defaults, message types |
| Pure logic | `src/lib/` | Detection, domain helpers |
| Types | `src/types/` | Shared TypeScript types |
| Hooks | `src/hooks/` | Reusable React hooks |
| Content (optional) | `src/content/content.ts` | In-page UI only if notifications are not enough |
| Styles | `src/styles/` | global + theme tokens |

## Chrome APIs (MVP)

- `chrome.tabs.onActivated`
- `chrome.tabs.onUpdated`
- `chrome.windows.onFocusChanged`
- `chrome.storage.local`
- `chrome.alarms`
- `chrome.notifications`

## Data flow (target)

```text
Tab / window events
        │
        ▼
 service-worker  ──►  lib/detection  ──►  alert / session / insight
        │
        ▼
 chrome/storage (chrome.storage.local)
        │
        ├── popup shell → components/screens
        └── options shell → components (settings UI)
```

## Dev vs load

- `npm run dev` — Vite + CRX HMR (follow CRXJS / Chrome reload guidance)
- `npm run build` — output in `dist/` → **Load unpacked** that folder

## Storage sketch

```json
{
  "domainClassifications": {
    "instagram.com": "distracting",
    "youtube.com": "productive"
  },
  "settings": {
    "notificationsEnabled": true
  },
  "dailyStats": {},
  "lastAlertAt": 0,
  "focusSession": null
}
```

Tune thresholds in `src/constants/` with research evidence.

Agent conventions: see [`AGENTS.md`](../AGENTS.md).
