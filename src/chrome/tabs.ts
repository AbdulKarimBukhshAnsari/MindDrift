/**
 * Thin wrappers around chrome.tabs / chrome.windows used by the service worker.
 */

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return undefined;
  }
}

export async function activateTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { active: true });
    return true;
  } catch {
    return false;
  }
}

export async function closeTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.remove(tabId);
    return true;
  } catch {
    return false;
  }
}

export function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
