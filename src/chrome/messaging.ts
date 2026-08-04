import { MESSAGE_TYPES, type MessageType } from '@/constants';
import type { PersonaInterventionCopy } from '@/types/personaRules';

export type InterventionPayload = PersonaInterventionCopy & {
  autoDismissMs: number;
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
