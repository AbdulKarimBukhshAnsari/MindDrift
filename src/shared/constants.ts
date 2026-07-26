/** Domain classification for Feature 3. */
export type DomainClassification = 'distracting' | 'productive';

export const STORAGE_KEYS = {
  DOMAIN_CLASSIFICATIONS: 'domainClassifications',
  SETTINGS: 'settings',
  DAILY_STATS: 'dailyStats',
  LAST_ALERT_AT: 'lastAlertAt',
  FOCUS_SESSION: 'focusSession',
} as const;

/** Default MVP thresholds — tune with research / QA evidence. */
export const THRESHOLDS = {
  RAPID_SWITCH_COUNT: 5,
  RAPID_SWITCH_WINDOW_MS: 120_000,
  SHORT_DWELL_MS: 20_000,
  PING_PONG_COUNT: 3,
  FOCUS_SUGGEST_MIN_MS: 5 * 60_000,
  FOCUS_SUGGEST_MAX_MS: 7 * 60_000,
  FOCUS_SESSION_MS: 25 * 60_000,
  ALERT_COOLDOWN_MS: 3 * 60_000,
  DISTRACTING_DWELL_WARN_MS: 15 * 60_000,
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
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
