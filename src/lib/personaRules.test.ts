import { describe, expect, it } from 'vitest';
import { DEEP_READER_RULES } from '@/constants/personas/deepReader';
import { RAPID_RESEARCHER_RULES } from '@/constants/personas/rapidResearcher';
import { evaluateFocusBreakRisk } from '@/lib/detection';
import { isOutsideClusterSwitch } from '@/lib/workspaceCluster';
import type { SwitchEvent, VisitEvent } from '@/types/tracking';

const t0 = 2_000_000;

function switchAt(
  offsetMs: number,
  fromTabId: number,
  toTabId: number,
  fromDomain: string,
  toDomain: string,
): SwitchEvent {
  return {
    at: t0 + offsetMs,
    fromTabId,
    toTabId,
    fromDomain,
    toDomain,
  };
}

describe('Deep Reader rules', () => {
  it('alerts sooner than Standard Worker (3 switches + short dwells + ping-pong)', () => {
    const switches: SwitchEvent[] = [];
    let from = 1;
    let to = 2;
    for (let i = 0; i < 3; i++) {
      switches.push(switchAt(i * 20_000, from, to, 'essay.com', 'news.com'));
      [from, to] = [to, from];
    }
    const visits: VisitEvent[] = [
      { endedAt: t0 + 15_000, dwellMs: 15_000, tabId: 1, domain: 'essay.com' },
      { endedAt: t0 + 35_000, dwellMs: 20_000, tabId: 2, domain: 'news.com' },
    ];

    const result = evaluateFocusBreakRisk({
      switches,
      visits,
      now: t0 + 60_000,
      fromKind: 'unknown',
      toKind: 'unknown',
      rules: DEEP_READER_RULES,
    });

    expect(result.switchCount).toBe(3);
    expect(result.shouldAlert).toBe(true);
  });
});

describe('Rapid Researcher cluster filtering', () => {
  const cluster = RAPID_RESEARCHER_RULES.workspaceCluster.defaultDomains;

  it('treats github → stackoverflow as in-cluster (ignored)', () => {
    expect(isOutsideClusterSwitch('github.com', 'stackoverflow.com', cluster)).toBe(false);
  });

  it('treats github → reddit as outside cluster (counts)', () => {
    expect(isOutsideClusterSwitch('github.com', 'reddit.com', cluster)).toBe(true);
  });

  it('does not alert on heavy in-cluster switching alone', () => {
    const switches: SwitchEvent[] = [];
    const pair: Array<[string, string]> = [
      ['github.com', 'stackoverflow.com'],
      ['stackoverflow.com', 'developer.mozilla.org'],
      ['developer.mozilla.org', 'npmjs.com'],
      ['npmjs.com', 'github.com'],
    ];
    for (let i = 0; i < 12; i++) {
      const [fromDomain, toDomain] = pair[i % pair.length];
      switches.push(switchAt(i * 5_000, (i % 4) + 1, ((i + 1) % 4) + 1, fromDomain, toDomain));
    }

    const result = evaluateFocusBreakRisk({
      switches,
      visits: [],
      now: t0 + 70_000,
      fromKind: 'unknown',
      toKind: 'unknown',
      rules: RAPID_RESEARCHER_RULES,
      workspaceCluster: cluster,
    });

    expect(result.switchCount).toBe(0);
    expect(result.shouldAlert).toBe(false);
  });

  it('alerts when many switches leave the cluster', () => {
    const switches: SwitchEvent[] = [];
    for (let i = 0; i < 10; i++) {
      switches.push(
        switchAt(
          i * 5_000,
          i + 1,
          i + 2,
          i % 2 === 0 ? 'github.com' : 'reddit.com',
          i % 2 === 0 ? 'reddit.com' : 'twitter.com',
        ),
      );
    }

    const result = evaluateFocusBreakRisk({
      switches,
      visits: Array.from({ length: 3 }, (_, i) => ({
        endedAt: t0 + 10_000 + i * 5_000,
        dwellMs: 5_000,
        tabId: i + 1,
        domain: 'reddit.com',
      })),
      now: t0 + 55_000,
      fromKind: 'unknown',
      toKind: 'distracting',
      rules: RAPID_RESEARCHER_RULES,
      workspaceCluster: cluster,
    });

    expect(result.switchCount).toBeGreaterThanOrEqual(10);
    expect(result.shouldAlert).toBe(true);
  });
});
