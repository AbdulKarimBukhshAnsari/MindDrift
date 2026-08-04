/**
 * chrome.storage helpers — local for durable prefs, session for SW buffers.
 */

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  if (result[key] === undefined) {
    return fallback;
  }
  return result[key] as T;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function sessionGet<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.session.get(key);
  if (result[key] === undefined) {
    return fallback;
  }
  return result[key] as T;
}

export async function sessionSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.session.set({ [key]: value });
}
