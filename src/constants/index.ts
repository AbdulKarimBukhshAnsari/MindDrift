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
export { ICON_PATHS, iconUrl } from './icons';

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
  /** Domains allowed during an active focus session. */
  FOCUS_ALLOWED_DOMAINS: 'focusAllowedDomains',
  /** Named focus clusters (user-created work environments). */
  FOCUS_CLUSTERS: 'focusClusters',
  /** Selected focus cluster id applied to the allowlist. */
  ACTIVE_FOCUS_CLUSTER_ID: 'activeFocusClusterId',
  /** Per-domain opt-in answers for suggested distractions (Feature 3). */
  DISTRACTION_PROMPT_STATUS: 'distractionPromptStatus',
  /** Timestamp until which Engine B (intentional checks) is paused. */
  DISTRACTION_SNOOZED_UNTIL: 'distractionSnoozedUntil',
  /** In-flight distraction dwell (session; survives SW sleep). */
  DISTRACTION_DWELL: 'distractionDwell',
} as const;

/** Pause duration when user chooses “Not working”. */
export const ALERT_PAUSE_MS = 60 * 60_000;

/** Continuous dwell on a suggested candidate before the opt-in modal. */
export const DISTRACTION_OPT_IN_MS = 30_000;

/** Continuous dwell on an accepted distraction before the intentional check. */
export const DISTRACTION_INTENTIONAL_MS = 15 * 60_000;

export type DistractionPromptStatus = 'accepted' | 'declined';

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
  /** Hard cap for focus timer (+5 steps included). */
  FOCUS_SESSION_MAX_MS: 60 * 60_000,
  FOCUS_SESSION_STEP_MS: 5 * 60_000,
  ALERT_COOLDOWN_MS: STANDARD_WORKER_RULES.alertCooldownMs,
  DISTRACTING_DWELL_WARN_MS: STANDARD_WORKER_RULES.distractingSiteNudgeMs,
} as const;

/** Suggested distraction candidates — not distracting until the user accepts. */
export const SUGGESTED_DISTRACTION_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'linkedin.com',
  'pinterest.com',
] as const;

/** @deprecated Prefer SUGGESTED_DISTRACTION_DOMAINS — candidates are not auto-distracting. */
export const DEFAULT_DISTRACTING_DOMAINS = SUGGESTED_DISTRACTION_DOMAINS;

export const MESSAGE_TYPES = {
  GET_STATE: 'GET_STATE',
  START_FOCUS_SESSION: 'START_FOCUS_SESSION',
  END_FOCUS_SESSION: 'END_FOCUS_SESSION',
  /** User chose Back on off-cluster modal — close that tab. */
  FOCUS_ALLOWLIST_CLOSE_TAB: 'FOCUS_ALLOWLIST_CLOSE_TAB',
  MARK_DOMAIN: 'MARK_DOMAIN',
  SHOW_INTERVENTION: 'SHOW_INTERVENTION',
  INTERVENTION_CONTINUE: 'INTERVENTION_CONTINUE',
  INTERVENTION_GO_BACK: 'INTERVENTION_GO_BACK',
  INTERVENTION_DISMISS: 'INTERVENTION_DISMISS',
  INTERVENTION_SNOOZE: 'INTERVENTION_SNOOZE',
  SHOW_DISTRACTION_OPT_IN: 'SHOW_DISTRACTION_OPT_IN',
  SHOW_DISTRACTION_INTENTIONAL: 'SHOW_DISTRACTION_INTENTIONAL',
  DISTRACTION_ACCEPT: 'DISTRACTION_ACCEPT',
  DISTRACTION_DECLINE: 'DISTRACTION_DECLINE',
  DISTRACTION_CONTINUE: 'DISTRACTION_CONTINUE',
  DISTRACTION_CLOSE_TAB: 'DISTRACTION_CLOSE_TAB',
  DISTRACTION_SNOOZE: 'DISTRACTION_SNOOZE',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
