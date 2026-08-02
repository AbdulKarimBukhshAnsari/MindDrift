/**
 * Thin wrappers around chrome.tabs / chrome.windows used by the service worker.
 * Add helpers here as detection orchestration lands — keep pure math in `@/lib`.
 */

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
