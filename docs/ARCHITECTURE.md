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

## Component map

| Layer | Path | Role |
| --- | --- | --- |
| Manifest | `manifest.config.ts` | MV3 config, permissions, entry points |
| Service worker | `src/background/service-worker.ts` | Tab listeners, orchestration, alarms, notifications |
| Popup | `src/popup/` | React main UI |
| Options | `src/options/` | React settings page |
| Content (optional) | `src/content/content.ts` | In-page UI only if notifications are not enough |
| Shared | `src/shared/` | Constants, storage helpers, detection stubs |

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
 service-worker  ──►  shared/detection  ──►  alert / session / insight
        │
        ▼
 chrome.storage.local
        │
        ├── popup (React — read state + actions)
        └── options (React — classifications + prefs)
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

Tune thresholds in `src/shared/constants.ts` with research evidence.
