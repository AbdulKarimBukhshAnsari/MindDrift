import type { DomainClassification } from '@/constants';
import { normalizeDomain } from '@/lib/domain';
import type { DomainKind } from '@/types/domain';

/**
 * Resolve a URL/domain to productive | distracting | unknown
 * using stored classifications only.
 * Suggested candidates are unknown until the user opts in (Feature 3).
 */
export function classifyDomain(
  input: string,
  classifications: Record<string, DomainClassification> = {},
): DomainKind {
  const domain = normalizeDomain(input);
  if (!domain) return 'unknown';

  const stored = classifications[domain];
  if (stored === 'productive' || stored === 'distracting') {
    return stored;
  }

  return 'unknown';
}
