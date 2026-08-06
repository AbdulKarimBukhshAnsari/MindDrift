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

export async function goBackTab(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.goBack(tabId);
    return true;
  } catch {
    return false;
  }
}

export async function navigateTab(tabId: number, url: string): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { url });
    return true;
  } catch {
    return false;
  }
}

/** HTTP(S) tabs across windows — used to close off-cluster tabs at session start. */
export async function queryHttpTabs(): Promise<chrome.tabs.Tab[]> {
  try {
    return await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  } catch {
    return [];
  }
}

export function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
