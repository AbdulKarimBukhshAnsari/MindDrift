import { describe, expect, it } from 'vitest';
import { normalizeDomain } from '@/lib/domain';
import {
  countPingPongBounces,
  countShortDwells,
  countSwitchesInWindow,
  evaluateFocusBreakRisk,
  getDomainRiskMultiplier,
  isExtremePattern,
} from '@/lib/detection';
import type { DomainKind } from '@/types/domain';
import type { SwitchEvent, VisitEvent } from '@/types/tracking';

const t0 = 1_000_000;

function switchAt(
  offsetMs: number,
  fromTabId: number,
  toTabId: number,
  fromDomain = 'a.com',
  toDomain = 'b.com',
): SwitchEvent {
  return {
    at: t0 + offsetMs,
    fromTabId,
    toTabId,
    fromDomain,
    toDomain,
  };
}

function visitAt(endedOffsetMs: number, dwellMs: number, domain = 'a.com'): VisitEvent {
  return {
    endedAt: t0 + endedOffsetMs,
    dwellMs,
    tabId: 1,
    domain,
  };
}

describe('normalizeDomain', () => {
  it('strips protocol, www, path, and port', () => {
    expect(normalizeDomain('https://www.Docs.Google.com:443/doc/abc')).toBe('docs.google.com');
  });

  it('returns empty string for invalid input', () => {
    expect(normalizeDomain('not a url')).toBe('');
  });
});

describe('rolling window (not clock-aligned)', () => {
  it('counts switches in the last 120s from now, not fixed clock buckets', () => {
    const switches = [
      switchAt(0, 1, 2),
      switchAt(30_000, 2, 3),
      switchAt(60_000, 3, 4),
      switchAt(90_000, 4, 5),
      switchAt(119_000, 5, 6),
      // just outside a 120s window ending at 150s
      switchAt(29_000, 6, 7),
    ];
    // now = t0 + 150_000 → window starts at t0 + 30_000
    // switches at 30, 60, 90, 119 are in; 0 and 29 are out
    const now = t0 + 150_000;
    expect(countSwitchesInWindow(switches, now, 120_000)).toBe(4);
  });
});

describe('ping-pong bounces', () => {
  it('counts A↔B returns (tabId sequence A,B,A = 1 bounce)', () => {
    const switches = [
      switchAt(0, 1, 2), // A→B
      switchAt(10_000, 2, 1), // B→A (bounce 1)
      switchAt(20_000, 1, 2), // A→B (bounce 2)
      switchAt(30_000, 2, 1), // B→A (bounce 3)
    ];
    expect(countPingPongBounces(switches, t0 + 40_000, 120_000)).toBe(3);
  });

  it('does not count a third distinct tab as ping-pong', () => {
    const switches = [
      switchAt(0, 1, 2),
      switchAt(10_000, 2, 3),
      switchAt(20_000, 3, 1),
    ];
    expect(countPingPongBounces(switches, t0 + 30_000, 120_000)).toBe(0);
  });
});

describe('multi-tab thrash (3+ sites)', () => {
  it('alerts for rapid 3-tab switching with short dwells (unknown→unknown)', () => {
    // ChatGPT → App Store → SO style thrash: no A↔B ping-pong, but 3 distinct tabs.
    const switches: SwitchEvent[] = [
      switchAt(0, 1, 2, 'chatgpt.com', 'apps.apple.com'),
      switchAt(8_000, 2, 3, 'apps.apple.com', 'stackoverflow.com'),
      switchAt(16_000, 3, 1, 'stackoverflow.com', 'chatgpt.com'),
      switchAt(24_000, 1, 2, 'chatgpt.com', 'apps.apple.com'),
      switchAt(32_000, 2, 3, 'apps.apple.com', 'stackoverflow.com'),
    ];
    const visits = [
      visitAt(8_000, 8_000, 'chatgpt.com'),
      visitAt(16_000, 8_000, 'apps.apple.com'),
      visitAt(24_000, 8_000, 'stackoverflow.com'),
      visitAt(32_000, 8_000, 'chatgpt.com'),
    ];

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 40_000,
      fromKind: 'unknown',
      toKind: 'unknown',
    });

    expect(result.switchCount).toBe(5);
    expect(result.shortDwellCount).toBeGreaterThanOrEqual(3);
    expect(result.distinctTabCount).toBeGreaterThanOrEqual(3);
    expect(result.behaviourScore).toBe(100);
    expect(result.finalScore).toBe(80);
    expect(result.shouldAlert).toBe(true);
  });
});

describe('intense rapid switching alone', () => {
  it('alerts at ≥5 switches on unknown sites (thrash/ping + scaled rapid)', () => {
    const switches: SwitchEvent[] = [];
    for (let i = 0; i < 5; i++) {
      switches.push(switchAt(i * 5_000, i + 1, i + 2, `a${i}.com`, `b${i}.com`));
    }

    const result = evaluateFocusBreakRisk({
      switches,
      visits: [],
      now: t0 + 30_000,
      fromKind: 'unknown',
      toKind: 'unknown',
    });

    expect(result.switchCount).toBe(5);
    expect(result.finalScore).toBeGreaterThanOrEqual(70);
    expect(result.shouldAlert).toBe(true);
  });

  it('alerts even sooner toward distracting domains (×1.0+)', () => {
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 5; i++) {
      switches.push(switchAt(i * 5_000, from, to, 'docs.google.com', 'reddit.com'));
      [from, to] = [to, from];
    }

    const result = evaluateFocusBreakRisk({
      switches,
      visits: [],
      now: t0 + 30_000,
      fromKind: 'productive',
      toKind: 'distracting',
    });

    expect(result.shouldAlert).toBe(true);
    expect(result.finalScore).toBeGreaterThanOrEqual(70);
  });

  it('alerts by ~7 switches even without counting thrash separately (full rapid alone)', () => {
    // Force score via switch intensity: 7 switches → rapid bucket hits 100.
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 7; i++) {
      switches.push(switchAt(i * 4_000, from, to));
      [from, to] = [to, from];
    }

    const result = evaluateFocusBreakRisk({
      switches,
      visits: [],
      now: t0 + 30_000,
      fromKind: 'unknown',
      toKind: 'unknown',
    });

    expect(result.switchCount).toBe(7);
    expect(result.behaviourScore).toBe(100);
    expect(result.shouldAlert).toBe(true);
  });
});

describe('short dwells', () => {
  it('counts visits under the short-dwell threshold in the rolling window', () => {
    const visits = [
      visitAt(10_000, 5_000),
      visitAt(40_000, 15_000),
      visitAt(70_000, 19_999),
      visitAt(100_000, 25_000), // too long
      visitAt(0, 8_000), // outside window when now = 130s
    ];
    const now = t0 + 130_000;
    expect(countShortDwells(visits, now, 120_000, 20_000)).toBe(3);
  });
});

describe('domain risk multiplier', () => {
  const cases: Array<[DomainKind, DomainKind, number]> = [
    ['productive', 'productive', 0.5],
    ['productive', 'unknown', 0.7],
    ['unknown', 'unknown', 0.8],
    ['productive', 'distracting', 1.0],
    ['distracting', 'productive', 0.9],
    ['distracting', 'distracting', 1.1],
  ];

  it.each(cases)('%s → %s = %s', (from, to, expected) => {
    expect(getDomainRiskMultiplier(from, to)).toBe(expected);
  });
});

describe('extreme pattern', () => {
  it('requires 8 switches, 5 short dwells, and 5 ping-pong bounces', () => {
    expect(isExtremePattern({ switchCount: 8, shortDwellCount: 5, pingPongCount: 5 })).toBe(
      true,
    );
    expect(isExtremePattern({ switchCount: 7, shortDwellCount: 5, pingPongCount: 5 })).toBe(
      false,
    );
  });
});

describe('evaluateFocusBreakRisk (Standard Worker)', () => {
  it('does not alert for normal productive→productive with all three base conditions', () => {
    // 5 switches, 3 short dwells, 3 ping-pong → behaviour 100 × 0.5 = 50
    const switches: SwitchEvent[] = [];
    // Build A↔B ping-pong on productive domains (≥5 switches, ≥3 bounces)
    let from = 1;
    let to = 2;
    for (let i = 0; i < 5; i++) {
      switches.push(
        switchAt(i * 10_000, from, to, 'docs.google.com', 'github.com'),
      );
      [from, to] = [to, from];
    }
    const visits = [
      visitAt(15_000, 5_000, 'docs.google.com'),
      visitAt(35_000, 8_000, 'github.com'),
      visitAt(55_000, 10_000, 'docs.google.com'),
    ];

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 60_000,
      fromKind: 'productive',
      toKind: 'productive',
    });

    expect(result.behaviourScore).toBe(100);
    expect(result.finalScore).toBe(50);
    expect(result.shouldAlert).toBe(false);
  });

  it('alerts when productive→productive is extreme (100 × 0.5 × 1.5 = 75)', () => {
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 8; i++) {
      switches.push(
        switchAt(i * 5_000, from, to, 'docs.google.com', 'github.com'),
      );
      [from, to] = [to, from];
    }
    const visits = Array.from({ length: 5 }, (_, i) =>
      visitAt(10_000 + i * 5_000, 5_000, i % 2 === 0 ? 'docs.google.com' : 'github.com'),
    );

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 50_000,
      fromKind: 'productive',
      toKind: 'productive',
    });

    expect(result.extreme).toBe(true);
    expect(result.finalScore).toBe(75);
    expect(result.shouldAlert).toBe(true);
  });

  it('caps distracting→distracting score at 100', () => {
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 5; i++) {
      switches.push(switchAt(i * 10_000, from, to, 'reddit.com', 'twitter.com'));
      [from, to] = [to, from];
    }
    const visits = [
      visitAt(15_000, 5_000, 'reddit.com'),
      visitAt(35_000, 8_000, 'twitter.com'),
      visitAt(55_000, 10_000, 'reddit.com'),
    ];

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 60_000,
      fromKind: 'distracting',
      toKind: 'distracting',
    });

    // 100 × 1.1 = 110 → capped at 100
    expect(result.finalScore).toBe(100);
    expect(result.shouldAlert).toBe(true);
  });

  it('alerts at final score ≥ 70 for productive→distracting base pattern', () => {
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 5; i++) {
      switches.push(switchAt(i * 10_000, from, to, 'docs.google.com', 'reddit.com'));
      [from, to] = [to, from];
    }
    const visits = [
      visitAt(15_000, 5_000),
      visitAt(35_000, 8_000),
      visitAt(55_000, 10_000),
    ];

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 60_000,
      fromKind: 'productive',
      toKind: 'distracting',
    });

    // 100 × 1.0 = 100
    expect(result.finalScore).toBe(100);
    expect(result.shouldAlert).toBe(true);
  });
});
