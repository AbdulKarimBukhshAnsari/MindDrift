import {
  SUGGESTED_DISTRACTION_DOMAINS,
  type DomainClassification,
  type DistractionPromptStatus,
} from '@/constants';
import { normalizeDomain } from '@/lib/domain';

export function isSuggestedDistractionDomain(input: string): boolean {
  const domain = normalizeDomain(input);
  if (!domain) return false;
  return (SUGGESTED_DISTRACTION_DOMAINS as readonly string[]).includes(domain);
}

export function shouldOfferOptIn(
  input: string,
  promptStatus: Record<string, DistractionPromptStatus>,
): boolean {
  const domain = normalizeDomain(input);
  if (!domain || !isSuggestedDistractionDomain(domain)) return false;
  return promptStatus[domain] === undefined;
}

export function shouldRunIntentionalCheck(
  input: string,
  promptStatus: Record<string, DistractionPromptStatus>,
  snoozedUntil: number,
  now: number,
): boolean {
  if (now < snoozedUntil) return false;
  const domain = normalizeDomain(input);
  if (!domain) return false;
  return promptStatus[domain] === 'accepted';
}

/** True when focus-break alerts should yield to distraction Engine A/B. */
export function shouldSuppressFocusBreakForDomain(
  input: string,
  promptStatus: Record<string, DistractionPromptStatus>,
): boolean {
  const domain = normalizeDomain(input);
  if (!domain) return false;
  if (promptStatus[domain] === 'accepted') return true;
  return shouldOfferOptIn(domain, promptStatus);
}

export function acceptDistractionDomain(
  domainInput: string,
  promptStatus: Record<string, DistractionPromptStatus>,
  classifications: Record<string, DomainClassification>,
): {
  domain: string;
  promptStatus: Record<string, DistractionPromptStatus>;
  classifications: Record<string, DomainClassification>;
} | null {
  const domain = normalizeDomain(domainInput);
  if (!domain) return null;
  return {
    domain,
    promptStatus: { ...promptStatus, [domain]: 'accepted' },
    classifications: { ...classifications, [domain]: 'distracting' },
  };
}

export function declineDistractionDomain(
  domainInput: string,
  promptStatus: Record<string, DistractionPromptStatus>,
): {
  domain: string;
  promptStatus: Record<string, DistractionPromptStatus>;
} | null {
  const domain = normalizeDomain(domainInput);
  if (!domain) return null;
  return {
    domain,
    promptStatus: { ...promptStatus, [domain]: 'declined' },
  };
}

export type DistractionAlarmKind = 'opt-in' | 'intentional';

/**
 * Given continuous dwell on the active domain, which distraction modal (if any)?
 * Status is only written on Yes/No — short dwells and unanswered prompts stay eligible.
 */
export function resolveDistractionAlarm(input: {
  domain: string;
  dwellMs: number;
  promptStatus: Record<string, DistractionPromptStatus>;
  snoozedUntil: number;
  now: number;
  optInMs: number;
  intentionalMs: number;
}): DistractionAlarmKind | null {
  const domain = normalizeDomain(input.domain);
  if (!domain) return null;

  if (shouldOfferOptIn(domain, input.promptStatus)) {
    return input.dwellMs >= input.optInMs ? 'opt-in' : null;
  }

  if (
    shouldRunIntentionalCheck(
      domain,
      input.promptStatus,
      input.snoozedUntil,
      input.now,
    )
  ) {
    return input.dwellMs >= input.intentionalMs ? 'intentional' : null;
  }

  return null;
}
