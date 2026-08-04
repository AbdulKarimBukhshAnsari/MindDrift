# Persona threshold matrix

MindDrift (TabSense) applies **persona-specific** detection rules. The active persona is stored in `chrome.storage.local` under `activePersona` and resolved via `getPersonaRules()`.

Source modules:

| Persona | Module |
| --- | --- |
| Deep Reader | `src/constants/personas/deepReader.ts` |
| Standard Worker (default) | `src/constants/personas/standardWorker.ts` |
| Rapid Researcher | `src/constants/personas/rapidResearcher.ts` |

## Comparison matrix (MVP defaults)

| Condition | Deep Reader | Standard Worker | Rapid Researcher |
| --- | --- | --- | --- |
| Rolling window | 180s | 120s | 90s |
| Switch limit | **3** | **5** | **10** (outside cluster only) |
| Short dwell | **&lt;30s** | **&lt;20s** | **&lt;10s** (ignored in cluster) |
| Ping-pong | **2** bounces | **3** bounces | **5** bounces (non-cluster) |
| Alert cooldown | 6 min | 3 min | 10 min |
| Focus-session suggestion | 3 min on one tab | 7 min on one tab | 15 min in-cluster |
| Distracting-site nudge | 8 min | 15 min | 25 min |
| Workspace cluster | Off | Off (optional later) | **On** by default |

## Intervention copy

| Persona | Message | Actions |
| --- | --- | --- |
| Deep Reader | Looks like your attention drifted. Back to the page? | Continue · Go back · Not working · 1 hour |
| Standard Worker | You're switching too fast. Focus slipping? | Continue · Go back · Not working · 1 hour |
| Rapid Researcher | You've stepped outside your workspace for a while. Still on task? | Continue · Back to workspace · Not working · 1 hour |

## Workspace Cluster (Rapid Researcher)

Starter domains (editable later in Settings / Feature 3):

- `github.com`
- `stackoverflow.com`
- `developer.mozilla.org`
- `localhost`
- `npmjs.com`

**Rule:** switches where *both* from/to domains are inside the cluster do **not** count toward switch / ping-pong / thrash scoring. Short dwells inside the cluster are ignored.

Stored under `workspaceCluster` in `chrome.storage.local`.

## Risk scoring (shared formula)

All personas use the same structure:

```text
Final Risk =
  BehaviourScore(switches, short dwells, ping-pong/thrash)
  × DomainMultiplier(from → to)
  × ExtremeMultiplier (optional 1.5)
```

Alert when `Final Risk ≥ 70` (capped at 100). Per-persona weights and multipliers live in each rules module’s `risk` block.

## How to retune

1. Edit the persona file under `src/constants/personas/`.
2. Keep `docs/PERSONA_THRESHOLDS.md` in sync.
3. Run `npm test` — detection tests cover Standard Worker; add cases when changing Deep / Rapid defaults.

These values are MVP hypotheses and should be validated with real users before locking product requirements.
