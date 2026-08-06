/// <reference types="chrome" />

/**
 * MindDrift — Background Service Worker (Manifest V3)
 *
 * Orchestrates tab listeners, focus-break alerts, and distraction control (Feature 3).
 * Detection math lives in `@/lib`; Chrome I/O in `@/chrome`.
 */

import {
  ALERT_PAUSE_MS,
  DISTRACTION_INTENTIONAL_MS,
  DISTRACTION_OPT_IN_MS,
  getPersonaRules,
  ICON_PATHS,
  iconUrl,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  THRESHOLDS,
  type DomainClassification,
  type DistractionPromptStatus,
} from '@/constants';
import { RAPID_RESEARCHER_RULES } from '@/constants/personas/rapidResearcher';
import { sendTabMessage } from '@/chrome/messaging';
import {
  sessionGet,
  sessionSet,
  storageGet,
  storageSet,
} from '@/chrome/storage';
import { activateTab, closeTab, getTab, isInjectableUrl, navigateTab, queryHttpTabs } from '@/chrome/tabs';
import { selfContainedShowIntervention } from '@/background/injectInterventionFn';
import { selfContainedFocusTimer } from '@/background/injectFocusTimerFn';
import {
  acceptDistractionDomain,
  declineDistractionDomain,
  shouldRunIntentionalCheck,
  shouldOfferOptIn,
  shouldSuppressFocusBreakForDomain,
} from '@/lib/distractionControl';
import { normalizeDomain } from '@/lib/domain';
import { createFocusBreakEngine } from '@/lib/focusBreakEngine';
import { isFocusDomainAllowed, withPinnedFocusDomains } from '@/lib/focusAllowlist';
import {
  completeFocusSession,
  createDefaultFocusSession,
  getRemainingMs,
  startFocusSession,
  type FocusSessionLimits,
} from '@/lib/focusSession';
import { createEmptyTrackingState } from '@/lib/trackingState';
import type { FocusSession } from '@/types/focusSession';
import type { PersonaId } from '@/types/persona';
import type { TrackingState } from '@/types/tracking';

const engine = createFocusBreakEngine();
let hydrated = false;
const FOCUS_BREAK_NOTIFICATION_ID = 'minddrift-focus-break';
const DISTRACTION_ALARM = 'minddrift-distraction-dwell';
const FOCUS_SESSION_ALARM = 'minddrift-focus-session';
const FOCUS_BADGE_ALARM = 'minddrift-focus-badge';

const FOCUS_LIMITS: FocusSessionLimits = {
  defaultMs: THRESHOLDS.FOCUS_SESSION_MS,
  maxMs: THRESHOLDS.FOCUS_SESSION_MAX_MS,
  stepMs: THRESHOLDS.FOCUS_SESSION_STEP_MS,
};

type DistractionDwell = {
  tabId: number;
  domain: string;
  startedAt: number;
  mode: 'opt-in' | 'intentional';
};

let distractionDwell: DistractionDwell | null = null;
/** Debounce hard-blocks so goBack / redirect don't loop on the same navigation. */
const focusBlockCooldownUntil = new Map<number, number>();

async function setDistractionDwell(dwell: DistractionDwell | null) {
  distractionDwell = dwell;
  await sessionSet(STORAGE_KEYS.DISTRACTION_DWELL, dwell);
}

async function getDistractionDwell(): Promise<DistractionDwell | null> {
  if (distractionDwell) return distractionDwell;
  distractionDwell = await sessionGet<DistractionDwell | null>(
    STORAGE_KEYS.DISTRACTION_DWELL,
    null,
  );
  return distractionDwell;
}

async function notifyFocusBreak(message: string) {
  try {
    await chrome.notifications.clear(FOCUS_BREAK_NOTIFICATION_ID);
    await chrome.notifications.create(FOCUS_BREAK_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: iconUrl(ICON_PATHS.icon128),
      title: 'MindDrift — Focus slipping',
      message,
      priority: 2,
      requireInteraction: true,
      silent: false,
    });
    return true;
  } catch (err) {
    console.warn('[MindDrift] notification failed', err);
    return false;
  }
}

function speakAlert(message: string) {
  try {
    chrome.tts?.speak(message, {
      enqueue: false,
      rate: 1.05,
      volume: 1.0,
    });
  } catch (err) {
    console.warn('[MindDrift] tts failed', err);
  }
}

function clearFocusBreakNotification() {
  void chrome.notifications.clear(FOCUS_BREAK_NOTIFICATION_ID);
  try {
    chrome.tts?.stop();
  } catch {
    // ignore
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MindDrift] installed:', details.reason);
  void seedDefaults();
  // Clear stale cooldown from earlier failed attempts.
  void storageSet(STORAGE_KEYS.LAST_ALERT_AT, 0);
});

async function seedDefaults() {
  const existing = await storageGet<Record<string, DomainClassification> | null>(
    STORAGE_KEYS.DOMAIN_CLASSIFICATIONS,
    null,
  );
  // Feature 3: do not seed suggested domains as distracting — wait for opt-in.
  if (!existing) {
    await storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, {});
  }

  const cluster = await storageGet<string[] | null>(STORAGE_KEYS.WORKSPACE_CLUSTER, null);
  if (!cluster) {
    await storageSet(
      STORAGE_KEYS.WORKSPACE_CLUSTER,
      [...RAPID_RESEARCHER_RULES.workspaceCluster.defaultDomains],
    );
  }
}

async function resolveWorkspaceCluster(rules: Awaited<ReturnType<typeof resolvePersonaRules>>) {
  if (!rules.workspaceCluster.enabled) return [] as string[];
  const stored = await storageGet<string[]>(
    STORAGE_KEYS.WORKSPACE_CLUSTER,
    [...rules.workspaceCluster.defaultDomains],
  );
  return stored.length > 0 ? stored : [...rules.workspaceCluster.defaultDomains];
}

async function ensureHydrated() {
  if (hydrated) return;
  const saved = await sessionGet<TrackingState | null>(
    STORAGE_KEYS.TRACKING_STATE,
    null,
  );
  engine.hydrate(saved ?? createEmptyTrackingState());
  hydrated = true;
}

async function persistTrackingState(state: TrackingState) {
  await sessionSet(STORAGE_KEYS.TRACKING_STATE, state);
}

async function resolvePersonaRules() {
  const personaId = await storageGet<PersonaId>(
    STORAGE_KEYS.ACTIVE_PERSONA,
    'standard-worker',
  );
  return getPersonaRules(personaId);
}

async function clearDistractionAlarm() {
  await chrome.alarms.clear(DISTRACTION_ALARM);
}

async function scheduleDistractionAlarm(whenMs: number) {
  await chrome.alarms.create(DISTRACTION_ALARM, { when: whenMs });
}

async function clearFocusSessionAlarm() {
  await chrome.alarms.clear(FOCUS_SESSION_ALARM);
}

async function syncFocusBadge(session: FocusSession | null) {
  try {
    if (!session || (session.status !== 'running' && session.status !== 'paused')) {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.alarms.clear(FOCUS_BADGE_ALARM);
      return;
    }
    const ms = getRemainingMs(session);
    const mins = Math.max(1, Math.ceil(ms / 60_000));
    await chrome.action.setBadgeBackgroundColor({ color: '#f9b17a' });
    await chrome.action.setBadgeText({
      text: session.status === 'paused' ? '|' : `${mins}m`,
    });
    if (session.status === 'running') {
      await chrome.alarms.create(FOCUS_BADGE_ALARM, {
        periodInMinutes: 1,
      });
    } else {
      await chrome.alarms.clear(FOCUS_BADGE_ALARM);
    }
  } catch (err) {
    console.warn('[MindDrift] focus badge sync failed', err);
  }
}

async function broadcastFocusTimer(session: FocusSession) {
  const tabs = await queryHttpTabs();
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id == null || !isInjectableUrl(tab.url)) return;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: selfContainedFocusTimer,
          args: [
            {
              status: session.status,
              endsAt: session.endsAt,
              remainingMs: session.remainingMs,
            },
          ],
        });
      } catch {
        // Restricted pages / discarded tabs — ignore.
      }
    }),
  );
}

async function syncFocusSessionAlarm(session: FocusSession | null) {
  await clearFocusSessionAlarm();
  void syncFocusBadge(session);
  if (!session || session.status !== 'running' || session.endsAt == null) return;
  if (session.endsAt <= Date.now()) {
    await storageSet(
      STORAGE_KEYS.FOCUS_SESSION,
      completeFocusSession(session, FOCUS_LIMITS),
    );
    return;
  }
  await chrome.alarms.create(FOCUS_SESSION_ALARM, { when: session.endsAt });
  void broadcastFocusTimer(session);
}

async function onFocusSessionAlarm() {
  const session = await storageGet<FocusSession | null>(STORAGE_KEYS.FOCUS_SESSION, null);
  if (!session) return;
  if (getRemainingMs(session) > 0 && session.status === 'running') {
    // Alarm fired early or endsAt was extended — reschedule.
    await syncFocusSessionAlarm(session);
    return;
  }
  await storageSet(
    STORAGE_KEYS.FOCUS_SESSION,
    completeFocusSession(session, FOCUS_LIMITS),
  );
  await clearFocusSessionAlarm();
}

async function syncDistractionDwell(tabId: number, url: string) {
  const domain = normalizeDomain(url);
  if (!isInjectableUrl(url) || !domain) {
    await setDistractionDwell(null);
    await clearDistractionAlarm();
    return;
  }

  const [promptStatus, snoozedUntil] = await Promise.all([
    storageGet<Record<string, DistractionPromptStatus>>(
      STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
      {},
    ),
    storageGet<number>(STORAGE_KEYS.DISTRACTION_SNOOZED_UNTIL, 0),
  ]);
  const now = Date.now();
  const existing = await getDistractionDwell();

  // Same domain stays active — keep the dwell clock; retarget the tab for modals.
  if (existing && existing.domain === domain) {
    await setDistractionDwell({ ...existing, tabId });
    return;
  }

  if (shouldOfferOptIn(domain, promptStatus)) {
    await setDistractionDwell({ tabId, domain, startedAt: now, mode: 'opt-in' });
    await scheduleDistractionAlarm(now + DISTRACTION_OPT_IN_MS);
    console.log('[MindDrift] distraction opt-in timer started', {
      domain,
      inMs: DISTRACTION_OPT_IN_MS,
    });
    return;
  }

  if (shouldRunIntentionalCheck(domain, promptStatus, snoozedUntil, now)) {
    await setDistractionDwell({
      tabId,
      domain,
      startedAt: now,
      mode: 'intentional',
    });
    await scheduleDistractionAlarm(now + DISTRACTION_INTENTIONAL_MS);
    console.log('[MindDrift] distraction intentional timer started', {
      domain,
      inMs: DISTRACTION_INTENTIONAL_MS,
    });
    return;
  }

  await setDistractionDwell(null);
  await clearDistractionAlarm();
}

async function restartIntentionalDwell() {
  const existing = await getDistractionDwell();
  if (!existing || existing.mode !== 'intentional') {
    const tab = existing ? await getTab(existing.tabId) : undefined;
    if (tab?.id != null && tab.url) {
      await setDistractionDwell(null);
      await syncDistractionDwell(tab.id, tab.url);
    }
    return;
  }

  const now = Date.now();
  await setDistractionDwell({
    ...existing,
    startedAt: now,
    mode: 'intentional',
  });
  await scheduleDistractionAlarm(now + DISTRACTION_INTENTIONAL_MS);
}

type ModalPayload = {
  message: string;
  continueLabel: string;
  goBackLabel: string;
  snoozeLabel: string;
  autoDismissMs: number;
  showSnooze?: boolean;
};

async function showPageModal(
  tabId: number,
  showType: string,
  payload: ModalPayload,
  injectTypes: {
    continueType: string;
    goBackType: string;
    snoozeType: string;
    dismissType: string;
  },
) {
  const response = await sendTabMessage(tabId, {
    type: showType as (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES],
    payload,
  });
  if (response) return true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: selfContainedShowIntervention,
      args: [
        {
          ...payload,
          ...injectTypes,
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn('[MindDrift] scripting inject failed', err);
    return false;
  }
}

async function showIntervention(
  tabId: number,
  payload: {
    message: string;
    continueLabel: string;
    goBackLabel: string;
    snoozeLabel: string;
    autoDismissMs: number;
  },
) {
  return showPageModal(tabId, MESSAGE_TYPES.SHOW_INTERVENTION, payload, {
    continueType: MESSAGE_TYPES.INTERVENTION_CONTINUE,
    goBackType: MESSAGE_TYPES.INTERVENTION_GO_BACK,
    snoozeType: MESSAGE_TYPES.INTERVENTION_SNOOZE,
    dismissType: MESSAGE_TYPES.INTERVENTION_DISMISS,
  });
}

async function showDistractionOptIn(tabId: number) {
  const message =
    'This site often pulls people off task. Add it as a distraction so MindDrift can help you not waste time here?';
  speakAlert(message);
  return showPageModal(
    tabId,
    MESSAGE_TYPES.SHOW_DISTRACTION_OPT_IN,
    {
      message,
      continueLabel: 'Yes, add as distracting',
      goBackLabel: 'No thanks',
      snoozeLabel: '',
      autoDismissMs: 0,
      showSnooze: false,
    },
    {
      continueType: MESSAGE_TYPES.DISTRACTION_ACCEPT,
      goBackType: MESSAGE_TYPES.DISTRACTION_DECLINE,
      snoozeType: MESSAGE_TYPES.DISTRACTION_DECLINE,
      dismissType: MESSAGE_TYPES.INTERVENTION_DISMISS,
    },
  );
}

async function showDistractionIntentional(tabId: number) {
  const message = "You've been here a while. Still intentional?";
  speakAlert(message);
  return showPageModal(
    tabId,
    MESSAGE_TYPES.SHOW_DISTRACTION_INTENTIONAL,
    {
      message,
      continueLabel: 'Continue',
      goBackLabel: 'Back',
      snoozeLabel: 'Not working · 1 hour',
      autoDismissMs: 0,
      showSnooze: true,
    },
    {
      continueType: MESSAGE_TYPES.DISTRACTION_CONTINUE,
      goBackType: MESSAGE_TYPES.DISTRACTION_CLOSE_TAB,
      snoozeType: MESSAGE_TYPES.DISTRACTION_SNOOZE,
      dismissType: MESSAGE_TYPES.INTERVENTION_DISMISS,
    },
  );
}

async function onDistractionAlarm() {
  const dwell = await getDistractionDwell();
  if (!dwell) {
    console.warn('[MindDrift] distraction alarm fired but no dwell state');
    return;
  }

  const tab = await getTab(dwell.tabId);
  if (!tab?.active || !tab.url) {
    console.warn('[MindDrift] distraction alarm: tab not active', dwell);
    return;
  }

  const domain = normalizeDomain(tab.url);
  if (domain !== dwell.domain) {
    console.warn('[MindDrift] distraction alarm: domain mismatch', {
      expected: dwell.domain,
      actual: domain,
    });
    return;
  }

  const [promptStatus, snoozedUntil] = await Promise.all([
    storageGet<Record<string, DistractionPromptStatus>>(
      STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
      {},
    ),
    storageGet<number>(STORAGE_KEYS.DISTRACTION_SNOOZED_UNTIL, 0),
  ]);
  const now = Date.now();
  const dwellMs = now - dwell.startedAt;

  if (dwell.mode === 'opt-in' && shouldOfferOptIn(domain, promptStatus)) {
    if (dwellMs < DISTRACTION_OPT_IN_MS) {
      await scheduleDistractionAlarm(now + (DISTRACTION_OPT_IN_MS - dwellMs));
      return;
    }
    if (!isInjectableUrl(tab.url)) return;
    console.log('[MindDrift] showing distraction opt-in', domain);
    await showDistractionOptIn(dwell.tabId);
    return;
  }

  if (
    dwell.mode === 'intentional' &&
    shouldRunIntentionalCheck(domain, promptStatus, snoozedUntil, now)
  ) {
    if (dwellMs < DISTRACTION_INTENTIONAL_MS) {
      await scheduleDistractionAlarm(
        now + (DISTRACTION_INTENTIONAL_MS - dwellMs),
      );
      return;
    }
    if (!isInjectableUrl(tab.url)) return;
    console.log('[MindDrift] showing distraction intentional', domain);
    await showDistractionIntentional(dwell.tabId);
  }
}

async function closeOffClusterTabs(allowlist: readonly string[]): Promise<number> {
  const effective = withPinnedFocusDomains(allowlist);
  const tabs = await queryHttpTabs();
  const toClose: number[] = [];
  for (const tab of tabs) {
    if (tab.id == null || !tab.url) continue;
    const domain = normalizeDomain(tab.url);
    if (!domain) continue;
    if (!isFocusDomainAllowed(domain, effective)) {
      toClose.push(tab.id);
    }
  }
  if (toClose.length === 0) return 0;

  // Keep at least one tab so Chrome doesn't feel empty.
  const remaining = tabs.length - toClose.length;
  if (remaining <= 0 && effective[0]) {
    const keepId = toClose.pop();
    if (keepId != null) {
      await navigateTab(keepId, `https://${effective[0]}`);
    }
  }
  if (toClose.length > 0) {
    try {
      await chrome.tabs.remove(toClose);
    } catch (err) {
      console.warn('[MindDrift] failed closing off-cluster tabs', err);
    }
  }
  return toClose.length + (remaining <= 0 ? 1 : 0);
}

async function showFocusClusterBlock(tabId: number, domain: string) {
  const message = `${domain} is not in your work cluster. Focus is slipping — choose Back to close this tab, or end the session.`;
  speakAlert("Focus is slipping. This site isn't in your work cluster.");
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: selfContainedShowIntervention,
      args: [
        {
          message,
          continueLabel: 'End Focus session',
          goBackLabel: 'Back',
          snoozeLabel: '',
          autoDismissMs: 0,
          showSnooze: false,
          continueType: MESSAGE_TYPES.END_FOCUS_SESSION,
          goBackType: MESSAGE_TYPES.FOCUS_ALLOWLIST_CLOSE_TAB,
          snoozeType: MESSAGE_TYPES.FOCUS_ALLOWLIST_CLOSE_TAB,
          dismissType: MESSAGE_TYPES.FOCUS_ALLOWLIST_CLOSE_TAB,
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn('[MindDrift] focus cluster modal inject failed', err);
    return false;
  }
}

async function enforceFocusAllowlist(tabId: number, url: string): Promise<boolean> {
  const session = await storageGet<FocusSession | null>(STORAGE_KEYS.FOCUS_SESSION, null);
  if (!session || session.status !== 'running') return false;
  if (getRemainingMs(session) <= 0) return false;
  if (!isInjectableUrl(url)) return false;

  const domain = normalizeDomain(url);
  if (!domain) return false;

  const allowlist = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
  const effective = withPinnedFocusDomains(allowlist);
  if (isFocusDomainAllowed(domain, effective)) return false;

  const now = Date.now();
  const coolUntil = focusBlockCooldownUntil.get(tabId) ?? 0;
  if (now < coolUntil) return true;
  focusBlockCooldownUntil.set(tabId, now + 2500);

  console.log('[MindDrift] focus allowlist block', { domain, allowlist: effective, tabId });

  // Site may stay open; sticky modal requires Back (close tab) or End Focus.
  await showFocusClusterBlock(tabId, domain);

  try {
    await chrome.notifications.create(`minddrift-focus-block-${tabId}`, {
      type: 'basic',
      iconUrl: iconUrl(ICON_PATHS.icon128),
      title: 'MindDrift — Focus slipping',
      message: `${domain} is not in your work cluster.`,
      priority: 2,
    });
  } catch (err) {
    console.warn('[MindDrift] focus block notification failed', err);
  }

  return true;
}

async function startFocusSessionFromPopup(): Promise<{
  ok: boolean;
  closedTabs: number;
  reason?: string;
}> {
  const stored = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
  const allowlist = withPinnedFocusDomains(stored);
  await storageSet(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, allowlist);

  if (allowlist.length < 3) {
    return { ok: false, closedTabs: 0, reason: 'allowlist' };
  }

  const closedTabs = await closeOffClusterTabs(allowlist);
  const current = await storageGet(
    STORAGE_KEYS.FOCUS_SESSION,
    createDefaultFocusSession(FOCUS_LIMITS),
  );

  if (current.status === 'running' && getRemainingMs(current) > 0) {
    console.log('[MindDrift] focus session already running', { closedTabs });
    return { ok: true, closedTabs };
  }

  const started = startFocusSession(
    {
      ...current,
      status: current.status === 'paused' ? 'paused' : 'idle',
      endsAt: null,
      remainingMs:
        getRemainingMs(current) > 0 ? getRemainingMs(current) : FOCUS_LIMITS.defaultMs,
    },
    Date.now(),
  );
  await storageSet(STORAGE_KEYS.FOCUS_SESSION, started);
  console.log('[MindDrift] focus session started', { closedTabs, allowlist });
  return { ok: true, closedTabs };
}

async function endFocusSessionFromPopup(): Promise<{ ok: boolean }> {
  const current = await storageGet(
    STORAGE_KEYS.FOCUS_SESSION,
    createDefaultFocusSession(FOCUS_LIMITS),
  );
  await storageSet(
    STORAGE_KEYS.FOCUS_SESSION,
    completeFocusSession(current, FOCUS_LIMITS),
  );
  await clearFocusSessionAlarm();
  console.log('[MindDrift] focus session ended');
  return { ok: true };
}

async function handleTabActivated(tabId: number) {
  await ensureHydrated();

  const tab = await getTab(tabId);
  if (!tab) return;

  const blocked = await enforceFocusAllowlist(tabId, tab.url ?? '');
  if (blocked) return;

  await syncDistractionDwell(tabId, tab.url ?? '');

  const [classifications, rules, lastAlertAt, pausedUntil, promptStatus] =
    await Promise.all([
      storageGet<Record<string, DomainClassification>>(
        STORAGE_KEYS.DOMAIN_CLASSIFICATIONS,
        {},
      ),
      resolvePersonaRules(),
      storageGet<number>(STORAGE_KEYS.LAST_ALERT_AT, 0),
      storageGet<number>(STORAGE_KEYS.ALERTS_PAUSED_UNTIL, 0),
      storageGet<Record<string, DistractionPromptStatus>>(
        STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
        {},
      ),
    ]);

  const workspaceCluster = await resolveWorkspaceCluster(rules);

  const now = Date.now();
  const paused = now < pausedUntil;
  const suppressFocusBreak = shouldSuppressFocusBreakForDomain(
    tab.url ?? '',
    promptStatus,
  );

  const { switched, risk, alert, state } = engine.handleActivation({
    at: now,
    tabId,
    url: tab.url ?? '',
    classifications,
    rules,
    // While paused, treat as always-in-cooldown so no alert object is produced.
    lastAlertAt: paused ? now : lastAlertAt,
    workspaceCluster,
  });

  await persistTrackingState(state);

  if (switched && risk) {
    console.log('[MindDrift] switch', {
      url: tab.url,
      switches: risk.switchCount,
      shortDwells: risk.shortDwellCount,
      pingPong: risk.pingPongCount,
      distinctTabs: risk.distinctTabCount,
      behaviour: risk.behaviourScore,
      multiplier: risk.domainMultiplier,
      final: risk.finalScore,
      alert: risk.shouldAlert && !paused && !suppressFocusBreak,
      paused,
      suppressFocusBreak,
      cooldownLeftMs: Math.max(0, rules.alertCooldownMs - (now - lastAlertAt)),
    });
  }

  if (paused || suppressFocusBreak || !alert) return;

  // Always fire noticeable system cues first (sound / tray / voice).
  const notified = await notifyFocusBreak(alert.message);
  speakAlert(alert.message);

  if (!isInjectableUrl(tab.url)) {
    console.warn('[MindDrift] alert scored but page is not injectable', tab.url);
    if (notified) await storageSet(STORAGE_KEYS.LAST_ALERT_AT, Date.now());
    return;
  }

  const shown = await showIntervention(tabId, {
    message: alert.message,
    continueLabel: alert.continueLabel,
    goBackLabel: alert.goBackLabel,
    snoozeLabel: rules.intervention.snoozeLabel,
    autoDismissMs: alert.autoDismissMs,
  });

  // Only start cooldown after something actually reached the user.
  if (shown || notified) {
    await storageSet(STORAGE_KEYS.LAST_ALERT_AT, Date.now());
  } else {
    console.warn('[MindDrift] intervention could not be shown on', tab.url);
  }
}

chrome.tabs.onActivated.addListener((info) => {
  void handleTabActivated(info.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Catch navigations as soon as the URL changes (not only on complete / active).
  if (changeInfo.url) {
    void enforceFocusAllowlist(tabId, changeInfo.url);
  }
  if (changeInfo.status === 'complete' && tab.url) {
    void enforceFocusAllowlist(tabId, tab.url);
  }
  if (changeInfo.status === 'complete' && tab.active) {
    void handleTabActivated(tabId);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DISTRACTION_ALARM) {
    void onDistractionAlarm();
    return;
  }
  if (alarm.name === FOCUS_SESSION_ALARM) {
    void onFocusSessionAlarm();
    return;
  }
  if (alarm.name === FOCUS_BADGE_ALARM) {
    void (async () => {
      const session = await storageGet<FocusSession | null>(
        STORAGE_KEYS.FOCUS_SESSION,
        null,
      );
      await syncFocusBadge(session);
    })();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const change = changes[STORAGE_KEYS.FOCUS_SESSION];
  if (!change) return;
  const session = (change.newValue as FocusSession | null) ?? null;
  void syncFocusSessionAlarm(session);
  if (session && (session.status === 'running' || session.status === 'paused')) {
    void broadcastFocusTimer(session);
  } else {
    void broadcastFocusTimer({
      status: 'idle',
      endsAt: null,
      remainingMs: 0,
      taskLabel: '',
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    const session = await storageGet<FocusSession | null>(STORAGE_KEYS.FOCUS_SESSION, null);
    if (!session) {
      await storageSet(
        STORAGE_KEYS.FOCUS_SESSION,
        createDefaultFocusSession(FOCUS_LIMITS),
      );
      return;
    }
    if (session.status === 'running' && getRemainingMs(session) <= 0) {
      await storageSet(
        STORAGE_KEYS.FOCUS_SESSION,
        completeFocusSession(session, FOCUS_LIMITS),
      );
      return;
    }
    await syncFocusSessionAlarm(session);
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.START_FOCUS_SESSION) {
    void startFocusSessionFromPopup().then(sendResponse);
    return true;
  }

  if (message?.type === MESSAGE_TYPES.END_FOCUS_SESSION) {
    void endFocusSessionFromPopup().then(sendResponse);
    return true;
  }

  if (message?.type === MESSAGE_TYPES.FOCUS_ALLOWLIST_CLOSE_TAB) {
    void (async () => {
      const tabId = sender.tab?.id;
      if (tabId == null) {
        sendResponse({ ok: false });
        return;
      }
      await closeTab(tabId);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === MESSAGE_TYPES.INTERVENTION_GO_BACK) {
    clearFocusBreakNotification();
    const previousTabId = engine.getPreviousTabId();
    if (previousTabId !== null) {
      void activateTab(previousTabId);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === MESSAGE_TYPES.INTERVENTION_SNOOZE) {
    clearFocusBreakNotification();
    void storageSet(STORAGE_KEYS.ALERTS_PAUSED_UNTIL, Date.now() + ALERT_PAUSE_MS);
    console.log('[MindDrift] alerts paused for 1 hour');
    sendResponse({ ok: true });
    return true;
  }

  if (
    message?.type === MESSAGE_TYPES.INTERVENTION_CONTINUE ||
    message?.type === MESSAGE_TYPES.INTERVENTION_DISMISS
  ) {
    clearFocusBreakNotification();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === MESSAGE_TYPES.DISTRACTION_ACCEPT) {
    void (async () => {
      const dwell = await getDistractionDwell();
      const domain = dwell?.domain;
      if (!domain) {
        sendResponse({ ok: false });
        return;
      }
      const [promptStatus, classifications] = await Promise.all([
        storageGet<Record<string, DistractionPromptStatus>>(
          STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
          {},
        ),
        storageGet<Record<string, DomainClassification>>(
          STORAGE_KEYS.DOMAIN_CLASSIFICATIONS,
          {},
        ),
      ]);
      const next = acceptDistractionDomain(domain, promptStatus, classifications);
      if (!next) {
        sendResponse({ ok: false });
        return;
      }
      await Promise.all([
        storageSet(STORAGE_KEYS.DISTRACTION_PROMPT_STATUS, next.promptStatus),
        storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, next.classifications),
      ]);
      const tabId = dwell?.tabId ?? sender.tab?.id;
      if (tabId != null) {
        const now = Date.now();
        await setDistractionDwell({
          tabId,
          domain: next.domain,
          startedAt: now,
          mode: 'intentional',
        });
        await scheduleDistractionAlarm(now + DISTRACTION_INTENTIONAL_MS);
      }
      console.log('[MindDrift] distraction accepted', next.domain);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === MESSAGE_TYPES.DISTRACTION_DECLINE) {
    void (async () => {
      const dwell = await getDistractionDwell();
      const domain = dwell?.domain;
      if (!domain) {
        sendResponse({ ok: false });
        return;
      }
      const promptStatus = await storageGet<Record<string, DistractionPromptStatus>>(
        STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
        {},
      );
      const next = declineDistractionDomain(domain, promptStatus);
      if (!next) {
        sendResponse({ ok: false });
        return;
      }
      await storageSet(STORAGE_KEYS.DISTRACTION_PROMPT_STATUS, next.promptStatus);
      await setDistractionDwell(null);
      await clearDistractionAlarm();
      console.log('[MindDrift] distraction declined', next.domain);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === MESSAGE_TYPES.DISTRACTION_CONTINUE) {
    void (async () => {
      await restartIntentionalDwell();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === MESSAGE_TYPES.DISTRACTION_CLOSE_TAB) {
    void (async () => {
      const dwell = await getDistractionDwell();
      const tabId = dwell?.tabId ?? sender.tab?.id;
      await setDistractionDwell(null);
      await clearDistractionAlarm();
      if (tabId != null) {
        await closeTab(tabId);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === MESSAGE_TYPES.DISTRACTION_SNOOZE) {
    void (async () => {
      await storageSet(
        STORAGE_KEYS.DISTRACTION_SNOOZED_UNTIL,
        Date.now() + ALERT_PAUSE_MS,
      );
      await setDistractionDwell(null);
      await clearDistractionAlarm();
      console.log('[MindDrift] distraction checks snoozed for 1 hour');
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});
