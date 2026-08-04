import type { SwitchEvent, TrackingState, VisitEvent } from '@/types/tracking';
import { pruneTrackingEvents } from '@/lib/detection';

export function createEmptyTrackingState(): TrackingState {
  return {
    switches: [],
    visits: [],
    activeTabId: null,
    activeDomain: '',
    activeSince: null,
    previousTabId: null,
  };
}

export type TabActivationInput = {
  at: number;
  tabId: number;
  domain: string;
  windowMs: number;
};

export type TabActivationResult = {
  state: TrackingState;
  switchEvent: SwitchEvent | null;
  closedVisit: VisitEvent | null;
};

/**
 * Apply a tab activation: close prior dwell, record switch, update active tab.
 * Rolling window is a trailing duration from `at` (not clock-aligned buckets).
 */
export function applyTabActivation(
  state: TrackingState,
  input: TabActivationInput,
): TabActivationResult {
  const { at, tabId, domain, windowMs } = input;

  // Same tab (focus regain / in-tab navigation) — refresh domain, not a switch.
  if (state.activeTabId === tabId) {
    return {
      state: domain && domain !== state.activeDomain ? { ...state, activeDomain: domain } : state,
      switchEvent: null,
      closedVisit: null,
    };
  }

  let closedVisit: VisitEvent | null = null;
  let switchEvent: SwitchEvent | null = null;
  let previousTabId = state.previousTabId;

  if (state.activeTabId !== null && state.activeSince !== null) {
    closedVisit = {
      endedAt: at,
      dwellMs: Math.max(0, at - state.activeSince),
      tabId: state.activeTabId,
      domain: state.activeDomain,
    };
    switchEvent = {
      at,
      fromTabId: state.activeTabId,
      toTabId: tabId,
      fromDomain: state.activeDomain,
      toDomain: domain,
    };
    previousTabId = state.activeTabId;
  }

  const switches = pruneTrackingEvents(
    switchEvent ? [...state.switches, switchEvent] : state.switches,
    at,
    windowMs,
    'at',
  );
  const visits = pruneTrackingEvents(
    closedVisit ? [...state.visits, closedVisit] : state.visits,
    at,
    windowMs,
    'endedAt',
  );

  return {
    state: {
      switches,
      visits,
      activeTabId: tabId,
      activeDomain: domain,
      activeSince: at,
      previousTabId,
    },
    switchEvent,
    closedVisit,
  };
}
