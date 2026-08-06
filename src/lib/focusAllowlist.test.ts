import { describe, expect, it } from 'vitest';
import {
  FOCUS_ALLOWED_MIN,
  addFocusAllowedDomain,
  canStartFocusWithAllowlist,
  isFocusDomainAllowed,
  isPinnedFocusDomain,
  removeFocusAllowedDomain,
  withPinnedFocusDomains,
} from '@/lib/focusAllowlist';

describe('focusAllowlist', () => {
  it('always includes google.com', () => {
    expect(withPinnedFocusDomains([])).toEqual(['google.com']);
    expect(isPinnedFocusDomain('www.google.com')).toBe(true);
    expect(isFocusDomainAllowed('google.com', [])).toBe(true);
    expect(isFocusDomainAllowed('mail.google.com', ['github.com'])).toBe(true);
  });

  it('requires at least three domains to start (including pinned)', () => {
    expect(canStartFocusWithAllowlist([])).toBe(false);
    expect(canStartFocusWithAllowlist(['a.com'])).toBe(false);
    expect(canStartFocusWithAllowlist(['a.com', 'b.com'])).toBe(true);
    expect(FOCUS_ALLOWED_MIN).toBe(3);
  });

  it('adds normalized unique domains', () => {
    const first = addFocusAllowedDomain([], 'https://www.github.com/foo');
    expect(first).toEqual({ ok: true, domains: ['google.com', 'github.com'] });

    const dup = addFocusAllowedDomain(['github.com'], 'github.com');
    expect(dup).toEqual({ ok: false, reason: 'duplicate' });

    const bad = addFocusAllowedDomain([], 'not a domain');
    expect(bad).toEqual({ ok: false, reason: 'invalid' });
  });

  it('matches subdomains against allowlist entries', () => {
    expect(isFocusDomainAllowed('docs.github.com', ['github.com'])).toBe(true);
    expect(isFocusDomainAllowed('reddit.com', ['github.com'])).toBe(false);
  });

  it('cannot remove pinned google.com', () => {
    expect(removeFocusAllowedDomain(['google.com', 'a.com'], 'google.com')).toEqual([
      'google.com',
      'a.com',
    ]);
    expect(removeFocusAllowedDomain(['a.com', 'b.com'], 'a.com')).toEqual([
      'google.com',
      'b.com',
    ]);
  });
});
