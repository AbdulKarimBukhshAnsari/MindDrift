import { isDomainInCluster } from '@/lib/workspaceCluster';
import { normalizeDomain } from '@/lib/domain';

export const FOCUS_ALLOWED_MIN = 3;

/** Always allowed during focus — every persona / allowlist. */
export const PINNED_FOCUS_DOMAINS = ['google.com'] as const;

export function isPinnedFocusDomain(domain: string): boolean {
  return isDomainInCluster(domain, PINNED_FOCUS_DOMAINS);
}

/** Ensure pinned domains (e.g. google.com) are always present. */
export function withPinnedFocusDomains(domains: readonly string[]): string[] {
  const rest = domains.filter((d) => !isPinnedFocusDomain(d));
  return [...PINNED_FOCUS_DOMAINS, ...rest];
}

export function canStartFocusWithAllowlist(domains: readonly string[]): boolean {
  return withPinnedFocusDomains(domains).length >= FOCUS_ALLOWED_MIN;
}

export function isFocusDomainAllowed(
  domain: string,
  allowlist: readonly string[],
): boolean {
  return isDomainInCluster(domain, withPinnedFocusDomains(allowlist));
}

/** Normalize + dedupe; returns null if input is invalid or already present. */
export function addFocusAllowedDomain(
  domains: readonly string[],
  input: string,
): { ok: true; domains: string[] } | { ok: false; reason: 'invalid' | 'duplicate' } {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, reason: 'invalid' };
  const current = withPinnedFocusDomains(domains);
  if (isFocusDomainAllowed(domain, current)) {
    return { ok: false, reason: 'duplicate' };
  }
  return { ok: true, domains: withPinnedFocusDomains([...current, domain]) };
}

export function removeFocusAllowedDomain(
  domains: readonly string[],
  domain: string,
): string[] {
  if (isPinnedFocusDomain(domain)) {
    return withPinnedFocusDomains(domains);
  }
  const key = domain.toLowerCase();
  return withPinnedFocusDomains(
    domains.filter((d) => d.toLowerCase() !== key && !isPinnedFocusDomain(d)),
  );
}
