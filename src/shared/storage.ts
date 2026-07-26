/**
 * chrome.storage.local helpers — implement during Feature work.
 */

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  // TODO: wrap chrome.storage.local.get
  void key;
  return fallback;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  // TODO: wrap chrome.storage.local.set
  void key;
  void value;
}

/** Normalize a URL or hostname to a bare domain key. */
export function normalizeDomain(input: string): string {
  // TODO: strip protocol, www., path, and port
  return input;
}
