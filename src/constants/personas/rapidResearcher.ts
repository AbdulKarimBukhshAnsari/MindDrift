import type { PersonaRules } from '@/types/personaRules';

/**
 * Rapid Researcher — low sensitivity (devs, analysts, multi-source investigators).
 *
 * Metric                    | Rule
 * ------------------------- | -----
 * Rolling time window       | 90 seconds
 * Switch limit              | 10 tab switches (outside cluster only)
 * Short dwell               | Less than 10 seconds (ignored inside cluster)
 * Ping-pong limit           | 5 bounces (non-cluster tabs only)
 * Alert cooldown            | 10 minutes
 * Focus-session suggestion  | After 15 minutes in-cluster / on task
 * Distracting-site nudge    | After 25 minutes
 * Workspace cluster         | On by default (starter dev domains)
 *
 * In-cluster switches (e.g. GitHub ↔ Stack Overflow) never score as distraction.
 */
export const RAPID_RESEARCHER_RULES = {
  rollingWindowMs: 90_000,
  switchLimit: 10,
  shortDwellMs: 10_000,
  shortDwellCount: 3,
  pingPongLimit: 5,
  alertCooldownMs: 10 * 60_000,
  focusSessionSuggestMs: 15 * 60_000,
  distractingSiteNudgeMs: 25 * 60_000,
  workspaceCluster: {
    enabled: true,
    countOutsideClusterOnly: true,
    defaultDomains: [
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
      'localhost',
      'npmjs.com',
    ],
  },
  risk: {
    behaviour: {
      // Needs more intensity before rapid alone fills the score.
      rapidSwitchPoints: 55,
      shortDwellPoints: 35,
      pingPongPoints: 30,
    },
    rapidFullExtraSwitches: 4,
    domainMultipliers: {
      'productive->productive': 0.4,
      'productive->unknown': 0.65,
      'unknown->unknown': 0.75,
      'productive->distracting': 1.0,
      'distracting->productive': 0.85,
      'distracting->distracting': 1.15,
      'unknown->productive': 0.65,
      'unknown->distracting': 1.0,
      'distracting->unknown': 0.9,
    },
    defaultDomainMultiplier: 0.75,
    extreme: {
      switchCount: 16,
      shortDwellCount: 6,
      pingPongCount: 8,
      intensityMultiplier: 1.5,
    },
    alertThreshold: 70,
    autoDismissMs: 12_000,
  },
  intervention: {
    message: "You've stepped outside your workspace for a while. Still on task?",
    continueLabel: 'Continue',
    goBackLabel: 'Back to workspace',
    snoozeLabel: 'Not working · 1 hour',
  },
} as const satisfies PersonaRules;
