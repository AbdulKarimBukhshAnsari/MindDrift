/// <reference types="chrome" />

import { MESSAGE_TYPES } from '@/constants';
import type { InterventionPayload } from '@/chrome/messaging';
import { mountInterventionDom } from '@/content/mountIntervention';

let cleanup: (() => void) | null = null;

function showIntervention(payload: InterventionPayload) {
  cleanup?.();
  cleanup = mountInterventionDom(payload, {
    onContinue: () => {
      cleanup = null;
      void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.INTERVENTION_CONTINUE });
    },
    onGoBack: () => {
      cleanup = null;
      void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.INTERVENTION_GO_BACK });
    },
    onSnooze: () => {
      cleanup = null;
      void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.INTERVENTION_SNOOZE });
    },
    onDismiss: () => {
      cleanup = null;
      void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.INTERVENTION_DISMISS });
    },
  });
}

function showDistractionOptIn(payload: InterventionPayload) {
  cleanup?.();
  cleanup = mountInterventionDom(
    { ...payload, showSnooze: false },
    {
      onContinue: () => {
        cleanup = null;
        void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DISTRACTION_ACCEPT });
      },
      onGoBack: () => {
        cleanup = null;
        void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DISTRACTION_DECLINE });
      },
      onSnooze: () => {
        cleanup = null;
      },
      onDismiss: () => {
        // Unanswered — do not write prompt status.
        cleanup = null;
      },
    },
  );
}

function showDistractionIntentional(payload: InterventionPayload) {
  cleanup?.();
  cleanup = mountInterventionDom(
    { ...payload, autoDismissMs: 0, showSnooze: true },
    {
      onContinue: () => {
        cleanup = null;
        void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DISTRACTION_CONTINUE });
      },
      onGoBack: () => {
        cleanup = null;
        void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DISTRACTION_CLOSE_TAB });
      },
      onSnooze: () => {
        cleanup = null;
        void chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DISTRACTION_SNOOZE });
      },
      onDismiss: () => {
        cleanup = null;
      },
    },
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MESSAGE_TYPES.SHOW_INTERVENTION && message.payload) {
    try {
      showIntervention(message.payload as InterventionPayload);
      sendResponse({ ok: true });
    } catch (err) {
      console.error('[MindDrift] failed to show intervention', err);
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }

  if (message?.type === MESSAGE_TYPES.SHOW_DISTRACTION_OPT_IN && message.payload) {
    try {
      showDistractionOptIn(message.payload as InterventionPayload);
      sendResponse({ ok: true });
    } catch (err) {
      console.error('[MindDrift] failed to show distraction opt-in', err);
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }

  if (message?.type === MESSAGE_TYPES.SHOW_DISTRACTION_INTENTIONAL && message.payload) {
    try {
      showDistractionIntentional(message.payload as InterventionPayload);
      sendResponse({ ok: true });
    } catch (err) {
      console.error('[MindDrift] failed to show distraction intentional', err);
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }

  return false;
});

console.log('[MindDrift] content script ready');
