import { describe, expect, it } from 'vitest';
import { classifyDomain } from '@/lib/classifyDomain';

describe('classifyDomain', () => {
  it('returns stored distracting / productive', () => {
    expect(
      classifyDomain('instagram.com', { 'instagram.com': 'distracting' }),
    ).toBe('distracting');
    expect(
      classifyDomain('github.com', { 'github.com': 'productive' }),
    ).toBe('productive');
  });

  it('treats suggested candidates as unknown until opted in', () => {
    expect(classifyDomain('instagram.com', {})).toBe('unknown');
    expect(classifyDomain('https://www.reddit.com/r/all', {})).toBe('unknown');
  });

  it('returns unknown for unmarked domains', () => {
    expect(classifyDomain('example.com', {})).toBe('unknown');
  });
});
