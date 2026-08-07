import { useEffect, useState } from 'react';
import { STORAGE_KEYS, type DomainClassification } from '@/constants';
import {
  addDistractingDomain,
  addProductiveDomain,
  listStoredDomains,
  removeClassifiedDomain,
} from '@/chrome/domainClassifications';
import { getActiveTabDomain } from '@/chrome/tabs';

type DomainTab = DomainClassification;

type DomainManagementPanelProps = {
  onToast?: (message: string) => void;
};

/**
 * Productive / Distracting lists — persona-independent (`domainClassifications`).
 * Suggested distraction candidates stay hidden until the user accepts via prompt or adds here.
 */
export function DomainManagementPanel({ onToast }: DomainManagementPanelProps) {
  const [tab, setTab] = useState<DomainTab>('productive');
  const [domains, setDomains] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh(kind: DomainTab = tab) {
    const list = await listStoredDomains(kind);
    setDomains(list);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await listStoredDomains(tab);
      if (!cancelled) {
        setDomains(list);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    function onChanged(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) {
      if (area !== 'local') return;
      if (changes[STORAGE_KEYS.DOMAIN_CLASSIFICATIONS] !== undefined) {
        void refresh();
      }
    }
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [tab]);

  async function handleAdd(raw: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        tab === 'productive' ? await addProductiveDomain(raw) : await addDistractingDomain(raw);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setDraft('');
      await refresh();
      onToast?.(
        tab === 'productive'
          ? `Added productive — ${result.domain}`
          : `Added distracting — ${result.domain}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCurrent() {
    const current = await getActiveTabDomain();
    if (!current) {
      setError('No website tab to add — open a page first.');
      return;
    }
    await handleAdd(current);
  }

  async function handleRemove(domain: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await removeClassifiedDomain(domain);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      await refresh();
      onToast?.(`Removed — ${result.domain}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="shrink-0 rounded-3xl border border-md-border-subtle bg-md-surface/80 p-5"
      aria-label="Domain Management"
    >
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h3 className="m-0 text-lg font-semibold tracking-tight text-md-fg">
            Domain Management
          </h3>
          <p className="mt-1 mb-0 text-sm text-md-fg-muted">
            Productive and distracting sites for tab-switch detection — shared across personas.
          </p>
        </div>
        <div className="flex rounded-xl bg-md-bg p-1" role="tablist" aria-label="Domain category">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'productive'}
            onClick={() => {
              setTab('productive');
              setError(null);
              setDraft('');
            }}
            className={[
              'flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === 'productive'
                ? 'bg-md-surface-raised text-md-fg shadow-sm'
                : 'text-md-fg-muted hover:text-md-fg',
            ].join(' ')}
          >
            Productive
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'distracting'}
            onClick={() => {
              setTab('distracting');
              setError(null);
              setDraft('');
            }}
            className={[
              'flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === 'distracting'
                ? 'bg-md-surface-raised text-md-fg shadow-sm'
                : 'text-md-fg-muted hover:text-md-fg',
            ].join(' ')}
          >
            Distracting
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={!ready || busy}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd(draft);
            }
          }}
          placeholder={tab === 'productive' ? 'e.g. github.com' : 'e.g. youtube.com'}
          className="min-w-0 flex-1 rounded-md border border-md-border-subtle bg-md-bg px-3 py-2 text-sm text-md-fg outline-none placeholder:text-md-fg-muted focus-visible:border-md-accent"
        />
        <button
          type="button"
          disabled={!ready || busy || !draft.trim()}
          onClick={() => void handleAdd(draft)}
          className="shrink-0 cursor-pointer rounded-md bg-md-accent px-3 py-2 text-sm font-bold text-md-fg-on-accent disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void handleAddCurrent()}
        className="mb-3 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-md-accent/40 bg-md-accent-soft px-3 py-2.5 text-sm font-semibold text-md-accent transition-colors hover:border-md-accent disabled:opacity-40"
      >
        Add current domain
      </button>

      {error ? (
        <p className="m-0 mb-2 text-xs text-md-accent" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2" role="tabpanel">
        {!ready ? (
          <p className="m-0 text-sm text-md-fg-muted">Loading…</p>
        ) : domains.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-md-border-subtle px-3 py-4 text-center text-sm text-md-fg-muted">
            {tab === 'productive'
              ? 'No productive sites yet — add tools you work in.'
              : 'No distracting sites yet. Suggested sites stay hidden until you accept a prompt or add one here.'}
          </p>
        ) : (
          domains.map((domain) => (
            <div
              key={domain}
              className="flex items-center justify-between gap-2 rounded-2xl bg-md-surface-raised px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={[
                    'grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold',
                    tab === 'productive'
                      ? 'bg-md-accent-soft text-md-accent'
                      : 'bg-[#93000a]/35 text-[#ffdad6]',
                  ].join(' ')}
                >
                  {tab === 'productive' ? 'P' : 'D'}
                </div>
                <p className="m-0 truncate text-sm font-medium text-md-fg">{domain}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove(domain)}
                className="shrink-0 cursor-pointer rounded-sm px-2 py-1 text-xs font-semibold text-md-fg-muted transition-colors hover:bg-md-bg hover:text-md-fg disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
