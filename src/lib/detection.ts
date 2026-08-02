/**
 * Detection logic stubs for Features 1–4.
 * Implement pattern detection here; keep the service worker as orchestrator.
 */

export interface TabSwitchEvent {
  at: number;
  tabId: number;
}

export interface VisitEvent {
  dwellMs: number;
}

export function shouldTriggerRapidSwitchAlert(_events: TabSwitchEvent[]): boolean {
  // TODO: Feature 1 — ≥5 switches in 120s
  return false;
}

export function shouldTriggerShortVisitAlert(_visits: VisitEvent[]): boolean {
  // TODO: Feature 1 — repeated visits under 20s
  return false;
}

export function shouldTriggerPingPongAlert(
  _recentActivations: Array<{ tabId: number }>,
): boolean {
  // TODO: Feature 1 — same two tabs ≥3 times
  return false;
}

export function buildDailyInsights(_dailyStats: Record<string, unknown>): string[] {
  // TODO: Feature 4 — 1–2 factual lines only
  return [];
}
