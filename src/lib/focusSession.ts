import type { FocusSession } from '@/types/focusSession';

export type FocusSessionLimits = {
  defaultMs: number;
  maxMs: number;
  stepMs: number;
};

export function createDefaultFocusSession(
  limits: FocusSessionLimits,
  taskLabel = 'Architectural Review',
): FocusSession {
  return {
    status: 'idle',
    endsAt: null,
    remainingMs: limits.defaultMs,
    taskLabel,
  };
}

export function getRemainingMs(session: FocusSession, now = Date.now()): number {
  if (session.status === 'running' && session.endsAt != null) {
    return Math.max(0, session.endsAt - now);
  }
  return Math.max(0, session.remainingMs);
}

export function startFocusSession(
  session: FocusSession,
  now = Date.now(),
): FocusSession {
  const remainingMs = getRemainingMs(session, now);
  if (remainingMs <= 0) {
    return { ...session, status: 'idle', endsAt: null, remainingMs: 0 };
  }
  return {
    ...session,
    status: 'running',
    endsAt: now + remainingMs,
    remainingMs,
  };
}

export function pauseFocusSession(
  session: FocusSession,
  now = Date.now(),
): FocusSession {
  const remainingMs = getRemainingMs(session, now);
  return {
    ...session,
    status: remainingMs > 0 ? 'paused' : 'idle',
    endsAt: null,
    remainingMs,
  };
}

export function addFocusSessionTime(
  session: FocusSession,
  limits: FocusSessionLimits,
  now = Date.now(),
): FocusSession {
  const current = getRemainingMs(session, now);
  const next = Math.min(limits.maxMs, current + limits.stepMs);
  if (session.status === 'running') {
    return {
      ...session,
      endsAt: now + next,
      remainingMs: next,
    };
  }
  return {
    ...session,
    endsAt: null,
    remainingMs: next,
    status: session.status === 'paused' ? 'paused' : 'idle',
  };
}

export function completeFocusSession(
  session: FocusSession,
  limits: FocusSessionLimits,
): FocusSession {
  return {
    ...session,
    status: 'idle',
    endsAt: null,
    remainingMs: limits.defaultMs,
  };
}
