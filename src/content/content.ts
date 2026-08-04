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
  return false;
});

console.log('[MindDrift] content script ready');
