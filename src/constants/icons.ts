/** Extension-relative paths for MindDrift brand assets under `public/icons/`. */
export const ICON_PATHS = {
  logo: 'public/icons/logo.png',
  icon16: 'public/icons/icon-16.png',
  icon48: 'public/icons/icon-48.png',
  icon128: 'public/icons/icon-128.png',
} as const;

/** Resolved URL for a packaged icon (popup, content, service worker). */
export function iconUrl(path: (typeof ICON_PATHS)[keyof typeof ICON_PATHS]): string {
  return chrome.runtime.getURL(path);
}
