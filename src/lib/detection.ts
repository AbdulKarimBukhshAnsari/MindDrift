import { STANDARD_WORKER_RULES } from '@/constants/personas/standardWorker';
import type { DomainKind } from '@/types/domain';
import type { DomainRiskKey, PersonaRules } from '@/types/personaRules';
import type { SwitchEvent, VisitEvent } from '@/types/tracking';

export type BehaviourCounts = {
  switchCount: number;
  shortDwellCount: number;
  pingPongCount: number;
  /** Unique tab ids touched in the rolling window (thrash signal). */
  distinctTabCount: number;
};

export type FocusBreakRiskResult = {
  switchCount: number;
  shortDwellCount: number;
  pingPongCount: number;
  distinctTabCount: number;
  behaviourScore: number;
  domainMultiplier: number;
  extreme: boolean;
  finalScore: number;
  shouldAlert: boolean;
};

const DEFAULT_RULES: PersonaRules = STANDARD_WORKER_RULES;

function inWindow(at: number, now: number, windowMs: number): boolean {
  return at >= now - windowMs && at <= now;
}

/** Tab switches whose timestamps fall in the rolling window ending at `now`. */
export function countSwitchesInWindow(
  switches: SwitchEvent[],
  now: number,
  windowMs: number,
): number {
  return switches.filter((s) => inWindow(s.at, now, windowMs)).length;
}

/**
 * Ping-pong bounce: returning to the other of two tabs (A→B→A = 1 bounce).
 * Only counts while the alternating pair stays the same two tab ids.
 */
export function countPingPongBounces(
  switches: SwitchEvent[],
  now: number,
  windowMs: number,
): number {
  const recent = switches
    .filter((s) => inWindow(s.at, now, windowMs))
    .sort((a, b) => a.at - b.at);

  if (recent.length < 2) return 0;

  let bounces = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    // Bounce when we return to the tab we left before the previous switch.
    if (cur.toTabId === prev.fromTabId && cur.fromTabId === prev.toTabId) {
      bounces += 1;
    }
  }
  return bounces;
}

/** Completed visits under shortDwellMs that ended inside the rolling window. */
export function countShortDwells(
  visits: VisitEvent[],
  now: number,
  windowMs: number,
  shortDwellMs: number,
): number {
  return visits.filter(
    (v) => inWindow(v.endedAt, now, windowMs) && v.dwellMs < shortDwellMs,
  ).length;
}

/** Unique tab ids involved in switches inside the rolling window. */
export function countDistinctTabsInWindow(
  switches: SwitchEvent[],
  now: number,
  windowMs: number,
): number {
  const ids = new Set<number>();
  for (const s of switches) {
    if (!inWindow(s.at, now, windowMs)) continue;
    ids.add(s.fromTabId);
    ids.add(s.toTabId);
  }
  return ids.size;
}

export function getDomainRiskMultiplier(
  from: DomainKind,
  to: DomainKind,
  rules: PersonaRules = DEFAULT_RULES,
): number {
  const key = `${from}->${to}` as DomainRiskKey;
  return rules.risk.domainMultipliers[key] ?? rules.risk.defaultDomainMultiplier;
}

export function isExtremePattern(
  counts: Pick<BehaviourCounts, 'switchCount' | 'shortDwellCount' | 'pingPongCount'>,
  rules: PersonaRules = DEFAULT_RULES,
): boolean {
  const { extreme } = rules.risk;
  return (
    counts.switchCount >= extreme.switchCount &&
    counts.shortDwellCount >= extreme.shortDwellCount &&
    counts.pingPongCount >= extreme.pingPongCount
  );
}

export function computeBehaviourScore(
  counts: BehaviourCounts,
  rules: PersonaRules = DEFAULT_RULES,
): number {
  const { behaviour, rapidFullExtraSwitches } = rules.risk;
  let score = 0;

  // Rapid switching: at limit → rapidSwitchPoints; full 100 after +rapidFullExtraSwitches.
  if (counts.switchCount >= rules.switchLimit) {
    const base = behaviour.rapidSwitchPoints;
    const toFull = Math.max(0, 100 - base);
    const span = Math.max(1, rapidFullExtraSwitches);
    const extra = Math.min(
      toFull,
      ((counts.switchCount - rules.switchLimit) / span) * toFull,
    );
    score += Math.min(100, base + extra);
  }

  if (counts.shortDwellCount >= rules.shortDwellCount) {
    score += behaviour.shortDwellPoints;
  }

  // Classic A↔B ping-pong OR thrashing across 3+ tabs with enough switches.
  const thrashing =
    counts.distinctTabCount >= 3 && counts.switchCount >= rules.switchLimit;
  if (counts.pingPongCount >= rules.pingPongLimit || thrashing) {
    score += behaviour.pingPongPoints;
  }

  return Math.min(100, score);
}

export function evaluateFocusBreakRisk(input: {
  switches: SwitchEvent[];
  visits: VisitEvent[];
  now: number;
  fromKind: DomainKind;
  toKind: DomainKind;
  rules?: PersonaRules;
}): FocusBreakRiskResult {
  const rules = input.rules ?? DEFAULT_RULES;
  const { rollingWindowMs, shortDwellMs, risk } = rules;

  const switchCount = countSwitchesInWindow(
    input.switches,
    input.now,
    rollingWindowMs,
  );
  const shortDwellCount = countShortDwells(
    input.visits,
    input.now,
    rollingWindowMs,
    shortDwellMs,
  );
  const pingPongCount = countPingPongBounces(
    input.switches,
    input.now,
    rollingWindowMs,
  );
  const distinctTabCount = countDistinctTabsInWindow(
    input.switches,
    input.now,
    rollingWindowMs,
  );

  const counts = { switchCount, shortDwellCount, pingPongCount, distinctTabCount };
  const behaviourScore = computeBehaviourScore(counts, rules);
  const domainMultiplier = getDomainRiskMultiplier(
    input.fromKind,
    input.toKind,
    rules,
  );
  const extreme = isExtremePattern(counts, rules);
  const extremeMultiplier = extreme ? risk.extreme.intensityMultiplier : 1;

  const raw = behaviourScore * domainMultiplier * extremeMultiplier;
  const finalScore = Math.min(100, Math.round(raw * 1000) / 1000);
  const shouldAlert = finalScore >= risk.alertThreshold;

  return {
    switchCount,
    shortDwellCount,
    pingPongCount,
    distinctTabCount,
    behaviourScore,
    domainMultiplier,
    extreme,
    finalScore,
    shouldAlert,
  };
}

/** Drop events older than the rolling window (plus a small buffer). */
export function pruneTrackingEvents<T extends { at?: number; endedAt?: number }>(
  events: T[],
  now: number,
  windowMs: number,
  timestampKey: 'at' | 'endedAt',
): T[] {
  const cutoff = now - windowMs;
  return events.filter((e) => {
    const ts = e[timestampKey];
    return typeof ts === 'number' && ts >= cutoff;
  });
}
