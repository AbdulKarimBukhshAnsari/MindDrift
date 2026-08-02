import type { MessageType } from '@/constants';

/**
 * Typed runtime messaging helpers between popup, options, content, and the service worker.
 */

export type ExtensionMessage = {
  type: MessageType;
  payload?: unknown;
};

export async function sendMessage<T = unknown>(message: ExtensionMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
