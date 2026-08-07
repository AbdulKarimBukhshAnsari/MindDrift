import { describe, expect, it } from 'vitest';
import {
  clearDomainKind,
  listClassifiedDomains,
  setDomainKind,
} from '@/lib/domainClassifications';

describe('domainClassifications', () => {
  it('sets and lists by kind', () => {
    const first = setDomainKind({}, 'https://www.github.com', 'productive');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = setDomainKind(first.classifications, 'youtube.com', 'distracting');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(listClassifiedDomains(second.classifications, 'productive')).toEqual(['github.com']);
    expect(listClassifiedDomains(second.classifications, 'distracting')).toEqual(['youtube.com']);
  });

  it('clears a classified domain', () => {
    const set = setDomainKind({}, 'reddit.com', 'distracting');
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    const cleared = clearDomainKind(set.classifications, 'reddit.com');
    expect(cleared).toEqual({
      ok: true,
      domain: 'reddit.com',
      classifications: {},
    });
  });
});
