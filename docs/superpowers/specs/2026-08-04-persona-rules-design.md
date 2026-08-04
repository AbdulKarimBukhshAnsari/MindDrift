# Persona rules — design notes

Date: 2026-08-04  
Related PRD: TabSense PRD v2.0 (persona-aware detection)

## Intent

Replace the single Standard Worker fallback for Deep Reader / Rapid Researcher with dedicated rule modules so Feature 1 thresholds, copy, cooldowns, and (for Rapid Researcher) workspace-cluster filtering match the PRD matrix.

## Approach

1. **One module per persona** under `src/constants/personas/` (same pattern as Standard Worker).
2. **Shared risk engine** in `src/lib/detection.ts` — persona only supplies numbers + cluster flags.
3. **Cluster filter** in `filterEventsForPersona` — Rapid Researcher drops in-cluster switches/dwells before scoring.
4. **Docs** live in `docs/PERSONA_THRESHOLDS.md` as the human-readable matrix.

## Numbers chosen

- User-provided matrix for switch / short dwell / ping-pong (3·30s·2 / 5·20s·3 / 10·10s·5).
- PRD Section 5.2 for windows, cooldowns, focus/distraction dwells, and intervention copy.
- Rapid Researcher switch limit uses **10** (user matrix) rather than PRD’s 12 — documented in the threshold doc.

## Non-goals in this pass

- Cluster manager UI (Feature 3 nice-to-have)
- “Back to workspace” restoring a full cluster set of tabs (still activates previous tab)
- Persona-specific daily insight tone (Feature 4)
