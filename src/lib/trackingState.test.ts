import { describe, expect, it } from 'vitest';
import { applyTabActivation, createEmptyTrackingState } from '@/lib/trackingState';

describe('applyTabActivation', () => {
  it('records dwell + switch when moving to a new tab', () => {
    let state = createEmptyTrackingState();
    const first = applyTabActivation(state, {
      at: 1000,
      tabId: 1,
      domain: 'a.com',
      windowMs: 120_000,
    });
    state = first.state;

    const second = applyTabActivation(state, {
      at: 5000,
      tabId: 2,
      domain: 'b.com',
      windowMs: 120_000,
    });

    expect(second.closedVisit).toEqual({
      endedAt: 5000,
      dwellMs: 4000,
      tabId: 1,
      domain: 'a.com',
    });
    expect(second.switchEvent).toMatchObject({
      fromTabId: 1,
      toTabId: 2,
      fromDomain: 'a.com',
      toDomain: 'b.com',
    });
    expect(second.state.previousTabId).toBe(1);
  });

  it('does not count same-tab updates as switches', () => {
    let state = createEmptyTrackingState();
    state = applyTabActivation(state, {
      at: 1000,
      tabId: 1,
      domain: 'a.com',
      windowMs: 120_000,
    }).state;

    const again = applyTabActivation(state, {
      at: 2000,
      tabId: 1,
      domain: 'a.com',
      windowMs: 120_000,
    });

    expect(again.switchEvent).toBeNull();
    expect(again.state.switches).toHaveLength(0);
  });
});
