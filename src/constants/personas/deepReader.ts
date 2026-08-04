import type { PersonaRules } from '@/types/personaRules';

export const DEEP_READER_RULES = {
  rollingWindowMs: 180_000,
  switchLimit: 3,
  shortDwellMs: 30_000,
  shortDwellCount: 2,
  pingPongLimit: 2,
  alertCooldownMs: 6 * 60_000,
  focusSessionSuggestMs: 3 * 60_000,
  distractingSiteNudgeMs: 8 * 60_000,
  workspaceCluster: {
    enabled: false,
    countOutsideClusterOnly: false,
    defaultDomains: [],
  },
  risk: {
    behaviour: {
      // High sensitivity: hit alertable rapid score at the 3-switch limit.
      rapidSwitchPoints: 70,
      shortDwellPoints: 35,
      pingPongPoints: 30,
    },
    rapidFullExtraSwitches: 2,
    domainMultipliers: {
      'productive->productive': 0.55,
      'productive->unknown': 0.75,
      'unknown->unknown': 0.85,
      'productive->distracting': 1.05,
      'distracting->productive': 0.95,
      'distracting->distracting': 1.15,
      'unknown->productive': 0.75,
      'unknown->distracting': 1.05,
      'distracting->unknown': 0.95,
    },
    defaultDomainMultiplier: 0.85,
    extreme: {
      switchCount: 6,
      shortDwellCount: 4,
      pingPongCount: 4,
      intensityMultiplier: 1.5,
    },
    alertThreshold: 70,
    autoDismissMs: 12_000,
  },
  intervention: {
    message: 'Looks like your attention drifted. Back to the page?',
    continueLabel: 'Continue',
    goBackLabel: 'Go back',
    snoozeLabel: 'Not working · 1 hour',
  },
} as const satisfies PersonaRules;
