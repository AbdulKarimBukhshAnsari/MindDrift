/** Tab switch recorded when the user activates a different tab. */
export type SwitchEvent = {
  at: number;
  fromTabId: number;
  toTabId: number;
  fromDomain: string;
  toDomain: string;
};

/** Completed dwell on a tab (written when the user leaves it). */
export type VisitEvent = {
  endedAt: number;
  dwellMs: number;
  tabId: number;
  domain: string;
};

/** In-memory tracking snapshot held by the service worker. */
export type TrackingState = {
  switches: SwitchEvent[];
  visits: VisitEvent[];
  activeTabId: number | null;
  activeDomain: string;
  activeSince: number | null;
  /** Tab to restore on "Go back". */
  previousTabId: number | null;
};
