import type { PersonaRules } from '@/types/personaRules';

/**
 * Standard Worker — balanced focus-break rules (default persona).
 *
 * Metric                    | Rule
 * ------------------------- | -----
 * Rolling time window       | 120 seconds
 * Switch limit              | 5 tab switches
 * Short dwell               | Less than 20 seconds (×3)
 * Ping-pong limit           | 3 bounces
 * Alert cooldown            | 3 minutes
 * Focus-session suggestion  | After 7 minutes on one tab
 * Distracting-site nudge    | After 15 minutes
 *
 * Risk: behaviour points × domain multiplier × optional extreme 1.5;
 * alert when final score ≥ 70 (capped at 100).
 */
export const STANDARD_WORKER_RULES = {
  rollingWindowMs: 120_000,
  switchLimit: 5,
  shortDwellMs: 20_000,
  shortDwellCount: 3,
  pingPongLimit: 3,
  /** Short gap while testing — restore to `3 * 60_000` before shipping. */
  alertCooldownMs: 3 * 60_000,
  focusSessionSuggestMs: 7 * 60_000,
  distractingSiteNudgeMs: 15 * 60_000,
  risk: {
    behaviour: {
      // At 5 switches: 70 pts — enough that ×1.0 distracting alerts; with
      // ping-pong/thrash (+30) unknown sites also alert at 5 (100×0.8=80).
      rapidSwitchPoints: 70,
      shortDwellPoints: 35,
      pingPongPoints: 30,
    },
    // Reach full 100 rapid points by 7 switches (limit + 2).
    rapidFullExtraSwitches: 2,
    domainMultipliers: {
      'productive->productive': 0.5,
      'productive->unknown': 0.7,
      'unknown->unknown': 0.8,
      'productive->distracting': 1.0,
      'distracting->productive': 0.9,
      'distracting->distracting': 1.1,
      'unknown->productive': 0.7,
      'unknown->distracting': 1.0,
      'distracting->unknown': 0.9,
    },
    defaultDomainMultiplier: 0.8,
    extreme: {
      switchCount: 8,
      shortDwellCount: 5,
      pingPongCount: 5,
      intensityMultiplier: 1.5,
    },
    alertThreshold: 70,
    autoDismissMs: 12_000,
  },
  intervention: {
    message: "You're switching too fast. Focus slipping?",
    continueLabel: 'Continue',
    goBackLabel: 'Go back',
    snoozeLabel: 'Not working · 1 hour',
  },
} as const satisfies PersonaRules;
