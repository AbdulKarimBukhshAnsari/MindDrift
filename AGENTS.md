# MindDrift — Agent Guide

Local-first Chrome extension (Manifest V3) that detects focus loss from browsing behavior and gently intervenes. No backend, auth, or cloud storage in the MVP.

## Stack

React 19 · TypeScript (strict) · Vite · `@crxjs/vite-plugin` · Tailwind CSS 4

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch build → load `dist/` unpacked in Chrome |
| `npm run dev:hmr` | Vite + CRX HMR |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc --noEmit` |

## Where code goes

```text
src/
├── background/     # Service worker entry only — orchestrate, don't bury math here
├── content/        # Content script entry (optional; least privilege)
├── popup/          # Thin shell: HTML, main.tsx, PopupApp routing
├── options/        # Thin shell: HTML, main.tsx, OptionsApp
├── components/
│   ├── screens/    # Full screens (Welcome, Persona, feature UIs)
│   └── ui/         # Shared primitives when they appear
├── chrome/         # Wrappers: storage, messaging, tabs
├── constants/      # STORAGE_KEYS, THRESHOLDS, defaults, MESSAGE_TYPES
├── lib/            # Pure logic: detection, domain helpers
├── types/          # Shared TypeScript types
├── hooks/          # React hooks when reusable
└── styles/         # global.css, theme.css
```

## Import rule

Prefer the `@/` alias (maps to `src/`):

```ts
import { STORAGE_KEYS } from '@/constants';
import { storageGet } from '@/chrome/storage';
import { WelcomeScreen } from '@/components/screens/WelcomeScreen';
```

## Hard constraints (MVP)

- Local-only: `chrome.storage.local` — no accounts, no cloud sync
- No dashboards, complex graphs, AI/ML, or backend
- Detection math lives in `@/lib`; Chrome I/O in `@/chrome`; UI in `@/components`
- Entry folders (`popup/`, `options/`, `background/`, `content/`) stay thin
- Content script stays unregistered until in-page UI is required

## Docs

- Product checklist: [`docs/MVP.md`](docs/MVP.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Structure design: [`docs/superpowers/specs/2026-08-02-scalable-src-structure-design.md`](docs/superpowers/specs/2026-08-02-scalable-src-structure-design.md)
