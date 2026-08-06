import { describe, expect, it } from 'vitest';
import {
  addFocusSessionTime,
  createDefaultFocusSession,
  getRemainingMs,
  pauseFocusSession,
  startFocusSession,
} from '@/lib/focusSession';

const LIMITS = {
  defaultMs: 25 * 60_000,
  maxMs: 60 * 60_000,
  stepMs: 5 * 60_000,
};

describe('focusSession', () => {
  it('survives pause/resume via wall-clock endsAt', () => {
    const t0 = 1_000_000;
    const started = startFocusSession(createDefaultFocusSession(LIMITS), t0);
    expect(started.status).toBe('running');
    expect(getRemainingMs(started, t0 + 60_000)).toBe(24 * 60_000);

    const paused = pauseFocusSession(started, t0 + 60_000);
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBe(24 * 60_000);
    expect(getRemainingMs(paused, t0 + 5 * 60_000)).toBe(24 * 60_000);
  });

  it('caps +5 at 60 minutes', () => {
    let session = createDefaultFocusSession(LIMITS);
    for (let i = 0; i < 10; i += 1) {
      session = addFocusSessionTime(session, LIMITS);
    }
    expect(getRemainingMs(session)).toBe(60 * 60_000);

    session = addFocusSessionTime(session, LIMITS);
    expect(getRemainingMs(session)).toBe(60 * 60_000);
  });
});
