import {
  FOCUS_ALLOWED_MIN,
  isPinnedFocusDomain,
  withPinnedFocusDomains,
} from '@/lib/focusAllowlist';
import { normalizeDomain } from '@/lib/domain';
import type { FocusCluster } from '@/types/focusCluster';

export type ClusterCreateError = 'name' | 'domains';

/** Normalize + dedupe user domains; drops empty / pinned hosts. */
export function normalizeClusterDomains(inputs: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const input of inputs) {
    const domain = normalizeDomain(input);
    if (!domain || isPinnedFocusDomain(domain) || seen.has(domain)) continue;
    seen.add(domain);
    out.push(domain);
  }
  return out;
}

export function addDomainToClusterList(
  domains: readonly string[],
  input: string,
): { ok: true; domains: string[] } | { ok: false; reason: 'invalid' | 'duplicate' } {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: false, reason: 'invalid' };
  const current = normalizeClusterDomains(domains);
  if (isPinnedFocusDomain(domain) || current.includes(domain)) {
    return { ok: false, reason: 'duplicate' };
  }
  return { ok: true, domains: [...current, domain] };
}

export function removeDomainFromClusterList(
  domains: readonly string[],
  domain: string,
): string[] {
  const key = normalizeDomain(domain) || domain.toLowerCase();
  return normalizeClusterDomains(domains).filter((d) => d !== key);
}

/** Domains used for focus enforcement (always includes google.com). */
export function effectiveFocusDomains(cluster: FocusCluster): string[] {
  return withPinnedFocusDomains(normalizeClusterDomains(cluster.domains));
}

export function canStartWithCluster(cluster: FocusCluster | null | undefined): boolean {
  if (!cluster) return false;
  return effectiveFocusDomains(cluster).length >= FOCUS_ALLOWED_MIN;
}

export function createFocusCluster(
  name: string,
  domains: readonly string[],
  now = Date.now(),
  id: string = crypto.randomUUID(),
): { ok: true; cluster: FocusCluster } | { ok: false; reason: ClusterCreateError } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: 'name' };

  const normalized = normalizeClusterDomains(domains);
  if (normalized.length === 0) return { ok: false, reason: 'domains' };

  return {
    ok: true,
    cluster: {
      id,
      name: trimmed,
      domains: normalized,
      createdAt: now,
    },
  };
}

export function upsertFocusCluster(
  clusters: readonly FocusCluster[],
  cluster: FocusCluster,
): FocusCluster[] {
  const idx = clusters.findIndex((c) => c.id === cluster.id);
  if (idx === -1) return [...clusters, cluster];
  const next = [...clusters];
  next[idx] = cluster;
  return next;
}

export function findFocusCluster(
  clusters: readonly FocusCluster[],
  id: string | null | undefined,
): FocusCluster | undefined {
  if (!id) return undefined;
  return clusters.find((c) => c.id === id);
}

/**
 * If the user already has an allowlist but no named clusters, seed one so
 * Focus settings can select it.
 */
export function seedClusterFromAllowlist(
  clusters: readonly FocusCluster[],
  allowlist: readonly string[],
  now = Date.now(),
): FocusCluster[] {
  if (clusters.length > 0) return [...clusters];
  const domains = normalizeClusterDomains(allowlist);
  if (domains.length === 0) return [];
  const created = createFocusCluster('My focus', domains, now, 'seed-focus');
  return created.ok ? [created.cluster] : [];
}
