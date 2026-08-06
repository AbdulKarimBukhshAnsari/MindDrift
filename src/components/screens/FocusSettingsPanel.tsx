import { useEffect, useId, useState, type FormEvent } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { storageGet, storageSet } from '@/chrome/storage';
import {
  FOCUS_ALLOWED_MIN,
  addFocusAllowedDomain,
  isPinnedFocusDomain,
  removeFocusAllowedDomain,
  withPinnedFocusDomains,
} from '@/lib/focusAllowlist';

type FocusSettingsPanelProps = {
  onBack: () => void;
};

/**
 * Focus allowlist editor — persist domains allowed during a session (min 3).
 * google.com is always pinned and cannot be removed.
 */
export function FocusSettingsPanel({ onBack }: FocusSettingsPanelProps) {
  const inputId = useId();
  const [domains, setDomains] = useState<string[]>(() => withPinnedFocusDomains([]));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []);
      const next = withPinnedFocusDomains(stored);
      if (!cancelled) {
        setDomains(next);
        setReady(true);
        if (next.length !== stored.length || next[0] !== stored[0]) {
          await storageSet(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, next);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: string[]) {
    const pinned = withPinnedFocusDomains(next);
    setDomains(pinned);
    await storageSet(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, pinned);
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const result = addFocusAllowedDomain(domains, draft);
    if (!result.ok) {
      setError(
        result.reason === 'duplicate'
          ? 'That domain is already on your list.'
          : 'Enter a valid website (e.g. github.com).',
      );
      return;
    }
    setError(null);
    setDraft('');
    await persist(result.domains);
  }

  async function handleRemove(domain: string) {
    if (isPinnedFocusDomain(domain)) return;
    setError(null);
    await persist(removeFocusAllowedDomain(domains, domain));
  }

  const remaining = Math.max(0, FOCUS_ALLOWED_MIN - domains.length);

  return (
    <div className="box-border flex h-full min-h-0 w-full flex-col overflow-hidden px-pad pb-3 pt-1">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-md-border-subtle bg-md-surface/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-md-fg-muted transition-colors hover:bg-md-surface-raised hover:text-md-fg"
            aria-label="Back to focus"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="m-0 text-base font-semibold tracking-tight">Focus settings</h2>
            <p className="m-0 text-xs text-md-fg-muted">
              Allow at least {FOCUS_ALLOWED_MIN} sites (google.com is always included).
            </p>
          </div>
        </div>

        <form className="mb-3 flex shrink-0 gap-2" onSubmit={(e) => void handleAdd(e)}>
          <label className="absolute -left-[9999px]" htmlFor={inputId}>
            Website domain
          </label>
          <input
            id={inputId}
            type="text"
            value={draft}
            disabled={!ready}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. github.com"
            className="min-w-0 flex-1 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2 text-sm text-md-fg outline-none placeholder:text-md-fg-muted focus-visible:border-md-accent"
          />
          <button
            type="submit"
            disabled={!ready || !draft.trim()}
            className="shrink-0 cursor-pointer rounded-md bg-md-accent px-3 py-2 text-sm font-semibold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {error ? (
          <p className="m-0 mb-2 shrink-0 text-xs text-md-accent" role="alert">
            {error}
          </p>
        ) : null}

        <p className="m-0 mb-2 shrink-0 text-xs text-md-fg-muted">
          {remaining > 0
            ? `${domains.length} saved · add ${remaining} more to unlock Start.`
            : `${domains.length} allowed · ready for focus.`}
        </p>

        <ul className="md-scroll m-0 min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto p-0">
          {domains.map((domain) => {
            const pinned = isPinnedFocusDomain(domain);
            return (
              <li
                key={domain}
                className="flex items-center justify-between gap-2 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-md-fg">
                  {domain}
                  {pinned ? (
                    <span className="ml-2 text-[10px] font-semibold tracking-wide text-md-accent uppercase">
                      Always
                    </span>
                  ) : null}
                </span>
                {pinned ? (
                  <span className="shrink-0 px-2 py-1 text-xs text-md-fg-muted">Locked</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRemove(domain)}
                    className="shrink-0 cursor-pointer rounded-sm px-2 py-1 text-xs font-semibold text-md-fg-muted transition-colors hover:bg-md-surface-raised hover:text-md-fg"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
