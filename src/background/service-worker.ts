/// <reference types="chrome" />

/**
 * MindDrift — Background Service Worker (Manifest V3)
 *
 * Orchestrates tab listeners, detection, alarms, and notifications.
 * Keep detection math in `@/lib`. Chrome API wrappers live in `@/chrome`.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MindDrift] installed:', details.reason);
  // TODO: seed default distracting domains + settings
});

// TODO: register tab / window listeners
// TODO: wire messaging from popup, options, and optional content script
