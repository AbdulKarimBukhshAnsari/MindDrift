import { STANDARD_WORKER_RULES } from './personas/standardWorker';

export type { PersonaInterventionCopy, PersonaRules } from '@/types/personaRules';
export type { DomainKind } from '@/types/domain';
export {
  getPersonaRules,
  PERSONA_RULES,
  DEEP_READER_RULES,
  RAPID_RESEARCHER_RULES,
  STANDARD_WORKER_RULES,
} from './personas';

/** Stored user marks for Feature 3 (unknown is implied when absent). */
export type DomainClassification = 'distracting' | 'productive';

export const STORAGE_KEYS = {
  DOMAIN_CLASSIFICATIONS: 'domainClassifications',
  SETTINGS: 'settings',
  DAILY_STATS: 'dailyStats',
  LAST_ALERT_AT: 'lastAlertAt',
  FOCUS_SESSION: 'focusSession',
  /** First-run welcome completed — local only, no account. */
  ONBOARDING_COMPLETE: 'onboardingComplete',
  /** Selected focus persona id. */
  ACTIVE_PERSONA: 'activePersona',
  /** In-flight tab switch / dwell buffer (session; survives SW restarts). */
  TRACKING_STATE: 'trackingState',
  /** Timestamp until which focus-break alerts are paused. */
  ALERTS_PAUSED_UNTIL: 'alertsPausedUntil',
  /** Workspace cluster domains (Rapid Researcher). */
  WORKSPACE_CLUSTER: 'workspaceCluster',
} as const;

/** Pause duration when user chooses “Not working”. */
export const ALERT_PAUSE_MS = 60 * 60_000;

/**
 * Legacy flat thresholds — mirror Standard Worker until callers use
 * `getPersonaRules(personaId)`. Prefer persona modules for new code.
 */
export const THRESHOLDS = {
  RAPID_SWITCH_COUNT: STANDARD_WORKER_RULES.switchLimit,
  RAPID_SWITCH_WINDOW_MS: STANDARD_WORKER_RULES.rollingWindowMs,
  SHORT_DWELL_MS: STANDARD_WORKER_RULES.shortDwellMs,
  PING_PONG_COUNT: STANDARD_WORKER_RULES.pingPongLimit,
  FOCUS_SUGGEST_MS: STANDARD_WORKER_RULES.focusSessionSuggestMs,
  FOCUS_SESSION_MS: 25 * 60_000,
  ALERT_COOLDOWN_MS: STANDARD_WORKER_RULES.alertCooldownMs,
  DISTRACTING_DWELL_WARN_MS: STANDARD_WORKER_RULES.distractingSiteNudgeMs,
} as const;

export const DEFAULT_DISTRACTING_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'reddit.com',
] as const;

export const MESSAGE_TYPES = {
  GET_STATE: 'GET_STATE',
  START_FOCUS_SESSION: 'START_FOCUS_SESSION',
  END_FOCUS_SESSION: 'END_FOCUS_SESSION',
  MARK_DOMAIN: 'MARK_DOMAIN',
  SHOW_INTERVENTION: 'SHOW_INTERVENTION',
  INTERVENTION_CONTINUE: 'INTERVENTION_CONTINUE',
  INTERVENTION_GO_BACK: 'INTERVENTION_GO_BACK',
  INTERVENTION_DISMISS: 'INTERVENTION_DISMISS',
  INTERVENTION_SNOOZE: 'INTERVENTION_SNOOZE',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
