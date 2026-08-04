import {
  DEFAULT_DISTRACTING_DOMAINS,
  type DomainClassification,
} from '@/constants';
import { normalizeDomain } from '@/lib/domain';
import type { DomainKind } from '@/types/domain';

/**
 * Resolve a URL/domain to productive | distracting | unknown
 * using stored classifications + default distracting list.
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

  if ((DEFAULT_DISTRACTING_DOMAINS as readonly string[]).includes(domain)) {
    return 'distracting';
  }

  return 'unknown';
}
