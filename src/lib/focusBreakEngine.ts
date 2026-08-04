import { applyTabActivation, createEmptyTrackingState } from '@/lib/trackingState';
import { classifyDomain } from '@/lib/classifyDomain';
import {
  evaluateFocusBreakRisk,
  type FocusBreakRiskResult,
} from '@/lib/detection';
import { normalizeDomain } from '@/lib/domain';
import type { DomainClassification } from '@/constants';
import type { PersonaRules } from '@/types/personaRules';
import type { TrackingState } from '@/types/tracking';

export type FocusBreakAlert = {
  finalScore: number;
  message: string;
  continueLabel: string;
  goBackLabel: string;
  autoDismissMs: number;
  previousTabId: number | null;
  tabId: number;
};

export type ActivationResult = {
  switched: boolean;
  risk: FocusBreakRiskResult | null;
  alert: FocusBreakAlert | null;
  state: TrackingState;
};

export type FocusBreakEngine = {
  handleActivation: (input: {
    at: number;
    tabId: number;
    url: string;
    classifications: Record<string, DomainClassification>;
    rules: PersonaRules;
    lastAlertAt: number;
  }) => ActivationResult;
  hydrate: (state: TrackingState) => void;
  getPreviousTabId: () => number | null;
  getState: () => TrackingState;
  reset: () => void;
};

export function createFocusBreakEngine(
  initial: TrackingState = createEmptyTrackingState(),
): FocusBreakEngine {
  let state = initial;

  return {
    getState: () => state,
    getPreviousTabId: () => state.previousTabId,
    hydrate: (next) => {
      state = next;
    },
    reset: () => {
      state = createEmptyTrackingState();
    },
    handleActivation({ at, tabId, url, classifications, rules, lastAlertAt }) {
      const domain = normalizeDomain(url);
      const { state: next, switchEvent } = applyTabActivation(state, {
        at,
        tabId,
        domain,
        windowMs: rules.rollingWindowMs,
      });
      state = next;

      if (!switchEvent) {
        return { switched: false, risk: null, alert: null, state };
      }

      const fromKind = classifyDomain(switchEvent.fromDomain, classifications);
      const toKind = classifyDomain(switchEvent.toDomain, classifications);
      const risk = evaluateFocusBreakRisk({
        switches: state.switches,
        visits: state.visits,
        now: at,
        fromKind,
        toKind,
        rules,
      });

      if (at - lastAlertAt < rules.alertCooldownMs) {
        return { switched: true, risk, alert: null, state };
      }

      if (!risk.shouldAlert) {
        return { switched: true, risk, alert: null, state };
      }

      return {
        switched: true,
        risk,
        alert: {
          finalScore: risk.finalScore,
          message: rules.intervention.message,
          continueLabel: rules.intervention.continueLabel,
          goBackLabel: rules.intervention.goBackLabel,
          autoDismissMs: rules.risk.autoDismissMs,
          previousTabId: state.previousTabId,
          tabId,
        },
        state,
      };
    },
  };
}
