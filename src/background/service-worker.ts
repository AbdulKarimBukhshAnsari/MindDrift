/// <reference types="chrome" />

/**
 * MindDrift — Background Service Worker (Manifest V3)
 *
 * Orchestrates tab listeners and focus-break alerts.
 * Detection math lives in `@/lib`; Chrome I/O in `@/chrome`.
 */

import {
  ALERT_PAUSE_MS,
  DEFAULT_DISTRACTING_DOMAINS,
  getPersonaRules,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  type DomainClassification,
} from '@/constants';
import { sendTabMessage } from '@/chrome/messaging';
import {
  sessionGet,
  sessionSet,
  storageGet,
  storageSet,
} from '@/chrome/storage';
import { activateTab, getTab, isInjectableUrl } from '@/chrome/tabs';
import { selfContainedShowIntervention } from '@/background/injectInterventionFn';
import { createFocusBreakEngine } from '@/lib/focusBreakEngine';
import { createEmptyTrackingState } from '@/lib/trackingState';
import type { PersonaId } from '@/types/persona';
import type { TrackingState } from '@/types/tracking';

const engine = createFocusBreakEngine();
let hydrated = false;
const FOCUS_BREAK_NOTIFICATION_ID = 'minddrift-focus-break';

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

function speakFocusBreak(message: string) {
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
  if (existing) return;

  const seed: Record<string, DomainClassification> = {};
  for (const domain of DEFAULT_DISTRACTING_DOMAINS) {
    seed[domain] = 'distracting';
  }
  await storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, seed);
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
  // 1) Prefer already-injected content script.
  const response = await sendTabMessage(tabId, {
    type: MESSAGE_TYPES.SHOW_INTERVENTION,
    payload,
  });
  if (response) return true;

  // 2) Fallback: inject a self-contained modal (works on tabs opened before install).
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: selfContainedShowIntervention,
      args: [
        {
          ...payload,
          continueType: MESSAGE_TYPES.INTERVENTION_CONTINUE,
          goBackType: MESSAGE_TYPES.INTERVENTION_GO_BACK,
          snoozeType: MESSAGE_TYPES.INTERVENTION_SNOOZE,
          dismissType: MESSAGE_TYPES.INTERVENTION_DISMISS,
        },
      ],
    });
    console.log('[MindDrift] injected intervention via scripting');
    return true;
  } catch (err) {
    console.warn('[MindDrift] scripting inject failed', err);
    return false;
  }
}

async function handleTabActivated(tabId: number) {
  await ensureHydrated();

  const tab = await getTab(tabId);
  if (!tab) return;

  const [classifications, rules, lastAlertAt, pausedUntil] = await Promise.all([
    storageGet<Record<string, DomainClassification>>(
      STORAGE_KEYS.DOMAIN_CLASSIFICATIONS,
      {},
    ),
    resolvePersonaRules(),
    storageGet<number>(STORAGE_KEYS.LAST_ALERT_AT, 0),
    storageGet<number>(STORAGE_KEYS.ALERTS_PAUSED_UNTIL, 0),
  ]);

  const now = Date.now();
  const paused = now < pausedUntil;

  const { switched, risk, alert, state } = engine.handleActivation({
    at: now,
    tabId,
    url: tab.url ?? '',
    classifications,
    rules,
    // While paused, treat as always-in-cooldown so no alert object is produced.
    lastAlertAt: paused ? now : lastAlertAt,
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
      alert: risk.shouldAlert && !paused,
      paused,
      cooldownLeftMs: Math.max(0, rules.alertCooldownMs - (now - lastAlertAt)),
    });
  }

  if (paused || !alert) return;

  // Always fire noticeable system cues first (sound / tray / voice).
  const notified = await notifyFocusBreak(alert.message);
  speakFocusBreak(alert.message);

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  return false;
});
