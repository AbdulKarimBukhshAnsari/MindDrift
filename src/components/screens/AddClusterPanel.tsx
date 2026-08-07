import { useEffect, useId, useState, type FormEvent } from 'react';
import { getActiveTabDomain } from '@/chrome/tabs';
import { saveNewFocusCluster } from '@/chrome/focusClusters';
import {
  addDomainToClusterList,
  createFocusCluster,
  removeDomainFromClusterList,
} from '@/lib/focusClusters';
import type { FocusCluster } from '@/types/focusCluster';

type AddClusterPanelProps = {
  onBack: () => void;
  onSaved?: (cluster: FocusCluster) => void;
};

/**
 * Create a named focus cluster — name, domains, add current tab domain, save.
 */
export function AddClusterPanel({ onBack, onSaved }: AddClusterPanelProps) {
  const nameId = useId();
  const domainId = useId();
  const [name, setName] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const domain = await getActiveTabDomain();
      if (!cancelled) setCurrentDomain(domain);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function tryAddDomain(raw: string) {
    const result = addDomainToClusterList(domains, raw);
    if (!result.ok) {
      setError(
        result.reason === 'duplicate'
          ? 'That domain is already in this cluster.'
          : 'Enter a valid website (e.g. github.com).',
      );
      return false;
    }
    setError(null);
    setDomains(result.domains);
    return true;
  }

  function handleAddCurrent() {
    if (!currentDomain) {
      setError('No website tab to add — open a page first.');
      return;
    }
    const result = addDomainToClusterList(domains, currentDomain);
    if (!result.ok) {
      setError(
        result.reason === 'duplicate'
          ? `${currentDomain} is already in this cluster.`
          : 'Could not add the current site.',
      );
      return;
    }
    setError(null);
    setDomains(result.domains);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const created = createFocusCluster(name, domains);
    if (!created.ok) {
      setError(
        created.reason === 'name'
          ? 'Enter a cluster name.'
          : 'Add at least one website domain.',
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveNewFocusCluster(created.cluster);
      onSaved?.(created.cluster);
      onBack();
    } catch {
      setError('Could not save this cluster. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const canAddCurrent =
    Boolean(currentDomain) && !domains.includes(currentDomain);

  return (
    <div className="box-border flex h-full min-h-0 w-full flex-col overflow-hidden px-pad pb-3 pt-1">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-md-border-subtle bg-md-surface/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-md-fg-muted transition-colors hover:bg-md-surface-raised hover:text-md-fg"
            aria-label="Back"
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
            <h2 className="m-0 text-base font-semibold tracking-tight">Add cluster</h2>
            <p className="m-0 text-xs text-md-fg-muted">
              Name your focus environment and the sites it includes.
            </p>
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSave(e)}
        >
          <label className="mb-1 shrink-0 text-xs font-semibold text-md-fg-muted" htmlFor={nameId}>
            Cluster name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            disabled={busy}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Development"
            className="mb-3 w-full shrink-0 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2 text-sm text-md-fg outline-none placeholder:text-md-fg-muted focus-visible:border-md-accent"
          />

          <label className="mb-1 shrink-0 text-xs font-semibold text-md-fg-muted" htmlFor={domainId}>
            Domains
          </label>
          <div className="mb-2 flex shrink-0 gap-2">
            <input
              id={domainId}
              type="text"
              value={draft}
              disabled={busy}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tryAddDomain(draft)) setDraft('');
                }
              }}
              placeholder="e.g. github.com"
              className="min-w-0 flex-1 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2 text-sm text-md-fg outline-none placeholder:text-md-fg-muted focus-visible:border-md-accent"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => {
                if (tryAddDomain(draft)) setDraft('');
              }}
              className="shrink-0 cursor-pointer rounded-md bg-md-surface-raised px-3 py-2 text-sm font-semibold text-md-fg transition-colors hover:bg-md-border/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            disabled={busy || !canAddCurrent}
            onClick={handleAddCurrent}
            className="mb-3 inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-md-accent/40 bg-md-accent-soft px-3 py-2.5 text-sm font-semibold text-md-accent transition-colors hover:border-md-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon />
            {currentDomain
              ? `Add current domain · ${currentDomain}`
              : 'Add current domain'}
          </button>

          {error ? (
            <p className="m-0 mb-2 shrink-0 text-xs text-md-accent" role="alert">
              {error}
            </p>
          ) : null}

          <ul className="md-scroll m-0 mb-3 min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto p-0">
            {domains.length === 0 ? (
              <li className="rounded-md border border-dashed border-md-border-subtle px-3 py-4 text-center text-xs text-md-fg-muted">
                No domains yet — add sites or use the current tab.
              </li>
            ) : (
              domains.map((domain) => (
                <li
                  key={domain}
                  className="flex items-center justify-between gap-2 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-md-fg">{domain}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDomains(removeDomainFromClusterList(domains, domain))}
                    className="shrink-0 cursor-pointer rounded-sm px-2 py-1 text-xs font-semibold text-md-fg-muted transition-colors hover:bg-md-surface-raised hover:text-md-fg disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>

          <p className="m-0 mb-3 shrink-0 text-xs text-md-fg-muted">
            google.com is always included during focus sessions.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-md-accent px-4 py-3 text-sm font-bold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save cluster'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
