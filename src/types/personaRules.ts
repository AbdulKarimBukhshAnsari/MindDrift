import type { DomainKind } from '@/types/domain';

/**
 * Persona-specific detection thresholds and intervention copy.
 * Each persona owns a rules module under `src/constants/personas/`.
 */
export type PersonaInterventionCopy = {
  /** Body when a focus break triggers. */
  message: string;
  /** Dismiss / stay on current tab. */
  continueLabel: string;
  /** Return to previous tab (or workspace for Rapid Researcher). */
  goBackLabel: string;
  /** Pause focus-break alerts (e.g. not working right now). */
  snoozeLabel: string;
};

export type DomainRiskKey = `${DomainKind}->${DomainKind}`;

export type PersonaRiskConfig = {
  behaviour: {
    /** Points at `switchLimit`; scales up to 100 over `rapidFullExtraSwitches`. */
    rapidSwitchPoints: number;
    shortDwellPoints: number;
    pingPongPoints: number;
  };
  /** Extra switches beyond the limit to reach a full 100 rapid score. */
  rapidFullExtraSwitches: number;
  domainMultipliers: Partial<Record<DomainRiskKey, number>>;
  /** Fallback when a from→to pair is not listed. */
  defaultDomainMultiplier: number;
  extreme: {
    switchCount: number;
    shortDwellCount: number;
    pingPongCount: number;
    intensityMultiplier: number;
  };
  /** Final risk score at or above this shows an alert. */
  alertThreshold: number;
  /** Auto-dismiss the intervention modal after this many ms. */
  autoDismissMs: number;
};

export type PersonaRules = {
  /** Rolling window for switch-frequency detection. */
  rollingWindowMs: number;
  /** Tab switches inside the rolling window that award rapid-switch points. */
  switchLimit: number;
  /** Visits shorter than this count as short dwell. */
  shortDwellMs: number;
  /** Short visits inside the window that award short-dwell points. */
  shortDwellCount: number;
  /** A↔B bounces that award ping-pong points. */
  pingPongLimit: number;
  /** Minimum gap between focus-break alerts. */
  alertCooldownMs: number;
  /** Stable dwell on one tab before suggesting a focus session. */
  focusSessionSuggestMs: number;
  /** Dwell on a distracting domain before nudge. */
  distractingSiteNudgeMs: number;
  /**
   * Workspace Cluster — Rapid Researcher treats in-cluster switches as productive.
   * Deep Reader / Standard Worker keep this off.
   */
  workspaceCluster: {
    enabled: boolean;
    /** When true, only switches that leave / stay outside the cluster score. */
    countOutsideClusterOnly: boolean;
    /** Starter domains seeded into storage for this persona. */
    defaultDomains: readonly string[];
  };
  risk: PersonaRiskConfig;
  intervention: PersonaInterventionCopy;
};
