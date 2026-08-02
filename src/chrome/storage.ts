/**
 * chrome.storage.local helpers.
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
