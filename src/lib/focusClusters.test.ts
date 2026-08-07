import { describe, expect, it } from 'vitest';
import {
  addDomainToClusterList,
  canStartWithCluster,
  createFocusCluster,
  effectiveFocusDomains,
  findFocusCluster,
  normalizeClusterDomains,
  removeDomainFromClusterList,
  seedClusterFromAllowlist,
  upsertFocusCluster,
} from '@/lib/focusClusters';

describe('focusClusters', () => {
  it('creates a named cluster with normalized domains', () => {
    const result = createFocusCluster('  Dev  ', ['https://www.github.com', 'notion.so'], 1000, 'c1');
    expect(result).toEqual({
      ok: true,
      cluster: {
        id: 'c1',
        name: 'Dev',
        domains: ['github.com', 'notion.so'],
        createdAt: 1000,
      },
    });
  });

  it('rejects empty name or domains', () => {
    expect(createFocusCluster('', ['a.com']).ok).toBe(false);
    expect(createFocusCluster('Dev', []).ok).toBe(false);
  });

  it('pins google.com in effective domains and gates start', () => {
    const ready = createFocusCluster('Dev', ['a.com', 'b.com'], 1, 'c1');
    const short = createFocusCluster('Thin', ['a.com'], 1, 'c2');
    expect(ready.ok && short.ok).toBe(true);
    if (!ready.ok || !short.ok) return;
    expect(effectiveFocusDomains(ready.cluster)).toEqual(['google.com', 'a.com', 'b.com']);
    expect(canStartWithCluster(ready.cluster)).toBe(true);
    expect(canStartWithCluster(short.cluster)).toBe(false);
    expect(canStartWithCluster(null)).toBe(false);
  });

  it('adds and removes draft domains', () => {
    expect(addDomainToClusterList([], 'github.com')).toEqual({
      ok: true,
      domains: ['github.com'],
    });
    expect(addDomainToClusterList(['github.com'], 'github.com')).toEqual({
      ok: false,
      reason: 'duplicate',
    });
    expect(removeDomainFromClusterList(['github.com', 'notion.so'], 'github.com')).toEqual([
      'notion.so',
    ]);
  });

  it('dedupes and drops pinned hosts from user domain lists', () => {
    expect(normalizeClusterDomains(['google.com', 'www.GitHub.com', 'github.com'])).toEqual([
      'github.com',
    ]);
  });

  it('upserts and finds clusters', () => {
    const a = createFocusCluster('A', ['a.com'], 1, 'a');
    const b = createFocusCluster('B', ['b.com'], 2, 'b');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const list = upsertFocusCluster([a.cluster], b.cluster);
    expect(list).toHaveLength(2);
    expect(findFocusCluster(list, 'b')?.name).toBe('B');
    const renamed = { ...b.cluster, name: 'Beta' };
    expect(upsertFocusCluster(list, renamed).find((c) => c.id === 'b')?.name).toBe('Beta');
  });

  it('seeds a cluster from an existing allowlist once', () => {
    const seeded = seedClusterFromAllowlist([], ['google.com', 'github.com', 'notion.so'], 50);
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.name).toBe('My focus');
    expect(seeded[0]?.domains).toEqual(['github.com', 'notion.so']);
    expect(seedClusterFromAllowlist(seeded, ['other.com'])).toEqual(seeded);
  });
});
