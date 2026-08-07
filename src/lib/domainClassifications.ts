import type { DomainClassification } from '@/constants';
import { normalizeDomain } from '@/lib/domain';

export function listClassifiedDomains(
  classifications: Record<string, DomainClassification>,
  kind: DomainClassification,
): string[] {
  return Object.entries(classifications)
    .filter(([, value]) => value === kind)
    .map(([domain]) => domain)
    .sort((a, b) => a.localeCompare(b));
}

export function setDomainKind(
  classifications: Record<string, DomainClassification>,
  input: string,
  kind: DomainClassification,
):
  | { ok: true; domain: string; classifications: Record<string, DomainClassification> }
  | { ok: false; reason: 'invalid' } {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, reason: 'invalid' };
  return {
    ok: true,
    domain,
    classifications: { ...classifications, [domain]: kind },
  };
}

export function clearDomainKind(
  classifications: Record<string, DomainClassification>,
  input: string,
):
  | { ok: true; domain: string; classifications: Record<string, DomainClassification> }
  | { ok: false; reason: 'invalid' | 'missing' } {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, reason: 'invalid' };
  if (!(domain in classifications)) return { ok: false, reason: 'missing' };
  const next = { ...classifications };
  delete next[domain];
  return { ok: true, domain, classifications: next };
}
