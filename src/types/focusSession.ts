export type FocusSessionStatus = 'idle' | 'running' | 'paused';

/**
 * Durable focus timer — remaining is wall-clock based while running
 * so the countdown survives popup close / SW sleep.
 */
export type FocusSession = {
  status: FocusSessionStatus;
  /** Wall-clock end when `status === 'running'`; otherwise null. */
  endsAt: number | null;
  /**
   * Leftover ms when idle/paused.
   * While running this is a snapshot only — prefer `getRemainingMs`.
   */
  remainingMs: number;
  taskLabel: string;
};
