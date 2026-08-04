import { MESSAGE_TYPES, type MessageType } from '@/constants';
import type { PersonaInterventionCopy } from '@/types/personaRules';

export type InterventionPayload = PersonaInterventionCopy & {
  /** 0 or negative = sticky (no auto-dismiss). */
  autoDismissMs: number;
  /** Hide the snooze row (opt-in Yes/No). Default true. */
  showSnooze?: boolean;
};

export type ExtensionMessage = {
  type: MessageType;
  payload?: InterventionPayload | unknown;
};

export async function sendMessage<T = unknown>(message: ExtensionMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export async function sendTabMessage<T = unknown>(
  tabId: number,
  message: ExtensionMessage,
): Promise<T | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as T;
  } catch {
    return undefined;
  }
}

export { MESSAGE_TYPES };
