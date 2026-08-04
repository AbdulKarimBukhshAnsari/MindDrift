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
  MESSAGE_TYPES,
  STORAGE_KEYS,
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
import { activateTab, closeTab, getTab, isInjectableUrl } from '@/chrome/tabs';
import { selfContainedShowIntervention } from '@/background/injectInterventionFn';
import {
  acceptDistractionDomain,
  declineDistractionDomain,
  shouldRunIntentionalCheck,
  shouldOfferOptIn,
  shouldSuppressFocusBreakForDomain,
} from '@/lib/distractionControl';
import { normalizeDomain } from '@/lib/domain';
import { createFocusBreakEngine } from '@/lib/focusBreakEngine';
import { createEmptyTrackingState } from '@/lib/trackingState';
import type { PersonaId } from '@/types/persona';
import type { TrackingState } from '@/types/tracking';

const engine = createFocusBreakEngine();
let hydrated = false;
const FOCUS_BREAK_NOTIFICATION_ID = 'minddrift-focus-break';
const DISTRACTION_ALARM = 'minddrift-distraction-dwell';

type DistractionDwell = {
  tabId: number;
  domain: string;
  startedAt: number;
  mode: 'opt-in' | 'intentional';
};

let distractionDwell: DistractionDwell | null = null;

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
      iconUrl: chrome.runtime.getURL('public/icons/icon-128.png'),
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

async function handleTabActivated(tabId: number) {
  await ensureHydrated();

  const tab = await getTab(tabId);
  if (!tab) return;

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
  if (changeInfo.status !== 'complete' || !tab.active) return;
  void handleTabActivated(tabId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== DISTRACTION_ALARM) return;
  void onDistractionAlarm();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
