import { describe, expect, it } from 'vitest';
import {
  DISTRACTION_INTENTIONAL_MS,
  DISTRACTION_OPT_IN_MS,
} from '@/constants';
import {
  acceptDistractionDomain,
  declineDistractionDomain,
  isSuggestedDistractionDomain,
  resolveDistractionAlarm,
  shouldOfferOptIn,
  shouldRunIntentionalCheck,
  shouldSuppressFocusBreakForDomain,
} from '@/lib/distractionControl';
import { classifyDomain } from '@/lib/classifyDomain';

describe('distractionControl', () => {
  it('recognizes suggested candidates', () => {
    expect(isSuggestedDistractionDomain('https://www.instagram.com/')).toBe(true);
    expect(isSuggestedDistractionDomain('github.com')).toBe(false);
  });

  it('offers opt-in only when unprompted candidate', () => {
    expect(shouldOfferOptIn('instagram.com', {})).toBe(true);
    expect(shouldOfferOptIn('instagram.com', { 'instagram.com': 'accepted' })).toBe(
      false,
    );
    expect(shouldOfferOptIn('instagram.com', { 'instagram.com': 'declined' })).toBe(
      false,
    );
    expect(shouldOfferOptIn('github.com', {})).toBe(false);
  });

  it('does not change status for short dwell (< opt-in)', () => {
    expect(
      resolveDistractionAlarm({
        domain: 'instagram.com',
        dwellMs: DISTRACTION_OPT_IN_MS - 1,
        promptStatus: {},
        snoozedUntil: 0,
        now: 1_000,
        optInMs: DISTRACTION_OPT_IN_MS,
        intentionalMs: DISTRACTION_INTENTIONAL_MS,
      }),
    ).toBeNull();
  });

  it('fires opt-in after threshold when still unprompted', () => {
    expect(
      resolveDistractionAlarm({
        domain: 'instagram.com',
        dwellMs: DISTRACTION_OPT_IN_MS,
        promptStatus: {},
        snoozedUntil: 0,
        now: 1_000,
        optInMs: DISTRACTION_OPT_IN_MS,
        intentionalMs: DISTRACTION_INTENTIONAL_MS,
      }),
    ).toBe('opt-in');
  });

  it('accept writes distracting classification for risk scoring', () => {
    const next = acceptDistractionDomain('instagram.com', {}, {});
    expect(next).toEqual({
      domain: 'instagram.com',
      promptStatus: { 'instagram.com': 'accepted' },
      classifications: { 'instagram.com': 'distracting' },
    });
    expect(classifyDomain('instagram.com', next!.classifications)).toBe('distracting');
  });

  it('decline mutes forever — no opt-in, no intentional', () => {
    const next = declineDistractionDomain('reddit.com', {});
    expect(next?.promptStatus['reddit.com']).toBe('declined');
    expect(shouldOfferOptIn('reddit.com', next!.promptStatus)).toBe(false);
    expect(
      shouldRunIntentionalCheck('reddit.com', next!.promptStatus, 0, Date.now()),
    ).toBe(false);
    expect(
      resolveDistractionAlarm({
        domain: 'reddit.com',
        dwellMs: DISTRACTION_INTENTIONAL_MS,
        promptStatus: next!.promptStatus,
        snoozedUntil: 0,
        now: 1_000,
        optInMs: DISTRACTION_OPT_IN_MS,
        intentionalMs: DISTRACTION_INTENTIONAL_MS,
      }),
    ).toBeNull();
  });

  it('fires intentional only for accepted domains after 15m', () => {
    const status = { 'tiktok.com': 'accepted' as const };
    expect(
      resolveDistractionAlarm({
        domain: 'tiktok.com',
        dwellMs: DISTRACTION_INTENTIONAL_MS - 1,
        promptStatus: status,
        snoozedUntil: 0,
        now: 1_000,
        optInMs: DISTRACTION_OPT_IN_MS,
        intentionalMs: DISTRACTION_INTENTIONAL_MS,
      }),
    ).toBeNull();
    expect(
      resolveDistractionAlarm({
        domain: 'tiktok.com',
        dwellMs: DISTRACTION_INTENTIONAL_MS,
        promptStatus: status,
        snoozedUntil: 0,
        now: 1_000,
        optInMs: DISTRACTION_OPT_IN_MS,
        intentionalMs: DISTRACTION_INTENTIONAL_MS,
      }),
    ).toBe('intentional');
  });

  it('respects Engine B snooze', () => {
    expect(
      shouldRunIntentionalCheck(
        'tiktok.com',
        { 'tiktok.com': 'accepted' },
        5_000,
        4_000,
      ),
    ).toBe(false);
  });

  it('suppresses focus-break on unprompted candidates and accepted domains', () => {
    expect(shouldSuppressFocusBreakForDomain('instagram.com', {})).toBe(true);
    expect(
      shouldSuppressFocusBreakForDomain('instagram.com', {
        'instagram.com': 'accepted',
      }),
    ).toBe(true);
    expect(
      shouldSuppressFocusBreakForDomain('instagram.com', {
        'instagram.com': 'declined',
      }),
    ).toBe(false);
    expect(shouldSuppressFocusBreakForDomain('github.com', {})).toBe(false);
  });
});
