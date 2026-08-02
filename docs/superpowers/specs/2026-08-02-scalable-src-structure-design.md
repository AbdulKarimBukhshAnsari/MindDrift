# Scalable src structure + agent guidance

**Date:** 2026-08-02  
**Status:** Approved (user chose layer-first, shared components, `@/` alias; said start)

## Goal

Replace the flat `src/shared/` blob with a layer-first layout that scales for a Chrome MV3 extension, and add `AGENTS.md` + Cursor rules so agents follow the same conventions.

## Decisions

| Decision | Choice |
| --- | --- |
| Layout style | Layer-first (keep entry points; split shared into layers) |
| React UI | Shared `components/` + thin entry shells |
| Imports | Path alias `@/` → `src/` |

## Target tree

```text
src/
├── background/          # service worker entry
├── content/             # content script entry
├── popup/               # main.tsx, index.html, PopupApp shell
├── options/             # main.tsx, index.html, OptionsApp shell
├── components/
│   ├── screens/         # WelcomeScreen, PersonaScreen, …
│   └── ui/              # primitives when needed
├── chrome/              # storage, messaging, tabs wrappers
├── constants/           # keys, thresholds, defaults, message types
├── lib/                 # pure logic (detection, domain helpers)
├── types/               # shared types as they grow
├── hooks/               # React hooks when needed
└── styles/
```

## Moves

- `shared/constants.ts` → `constants/index.ts`
- `shared/storage.ts` → `chrome/storage.ts` + `lib/domain.ts` (`normalizeDomain`)
- `shared/detection.ts` → `lib/detection.ts`
- popup screens → `components/screens/`
- Delete `shared/` after migration

## Agent docs

- `AGENTS.md` at repo root
- `.cursor/rules/project-structure.mdc` (always)
- `.cursor/rules/chrome-extension.mdc` (chrome/background/content)
- `.cursor/rules/react-ui.mdc` (components/popup/options)

## Out of scope

- Feature logic implementation
- Empty `features/` folder
- Barrel `index.ts` in every folder
