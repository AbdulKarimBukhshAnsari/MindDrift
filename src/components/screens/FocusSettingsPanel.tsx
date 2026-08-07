import { useEffect, useState } from 'react';
import { applyFocusCluster, loadFocusClusters } from '@/chrome/focusClusters';
import {
  canStartWithCluster,
  effectiveFocusDomains,
  findFocusCluster,
} from '@/lib/focusClusters';
import { FOCUS_ALLOWED_MIN } from '@/lib/focusAllowlist';
import type { FocusCluster } from '@/types/focusCluster';

type FocusSettingsPanelProps = {
  onBack: () => void;
  onAddCluster: () => void;
};

/**
 * Focus settings — pick the active work cluster (domains sync to the allowlist).
 */
export function FocusSettingsPanel({ onBack, onAddCluster }: FocusSettingsPanelProps) {
  const [clusters, setClusters] = useState<FocusCluster[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadFocusClusters();
      if (!cancelled) {
        setClusters(loaded.clusters);
        setActiveId(loaded.activeId);
        setExpandedId(loaded.activeId);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = findFocusCluster(clusters, activeId);
  const effectiveCount = active ? effectiveFocusDomains(active).length : 0;
  const canStart = canStartWithCluster(active);

  async function selectCluster(id: string) {
    if (busy) return;
    setExpandedId((current) => (current === id ? null : id));
    if (id === activeId) return;
    setBusy(true);
    try {
      const applied = await applyFocusCluster(clusters, id);
      if (applied) setActiveId(applied.id);
    } finally {
      setBusy(false);
    }
  }

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
              Choose a cluster for this session (need {FOCUS_ALLOWED_MIN}+ sites incl. google.com).
            </p>
          </div>
        </div>

        <p className="m-0 mb-3 shrink-0 text-xs text-md-fg-muted">
          {!ready
            ? 'Loading clusters…'
            : clusters.length === 0
              ? 'No clusters yet — create one to unlock Start.'
              : canStart
                ? `${active?.name ?? 'Cluster'} · ${effectiveCount} sites · ready for focus.`
                : `${active?.name ?? 'Cluster'} · ${effectiveCount}/${FOCUS_ALLOWED_MIN} sites · add more domains.`}
        </p>

        <div
          className="md-scroll m-0 mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto"
          role="radiogroup"
          aria-label="Focus cluster"
        >
          {clusters.map((cluster, index) => {
            const selected = cluster.id === activeId;
            const expanded = cluster.id === expandedId;
            const sites = effectiveFocusDomains(cluster);
            return (
              <div
                key={cluster.id}
                className={[
                  'overflow-hidden rounded-xl transition-all',
                  selected
                    ? 'bg-md-accent text-md-fg-on-accent shadow-[0_8px_20px_color-mix(in_srgb,#f9b17a_25%,transparent)]'
                    : 'border border-md-border-subtle bg-md-bg text-md-fg',
                ].join(' ')}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-expanded={expanded}
                  disabled={!ready || busy}
                  onClick={() => void selectCluster(cluster.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={[
                        'size-2.5 shrink-0 rounded-full',
                        selected
                          ? 'bg-md-fg-on-accent'
                          : index % 2 === 0
                            ? 'bg-md-accent'
                            : 'bg-md-fg-muted',
                      ].join(' ')}
                    />
                    <p className="m-0 truncate text-sm font-semibold">{cluster.name}</p>
                  </div>
                  <span
                    className={[
                      'flex shrink-0 items-center gap-1.5 text-xs font-semibold',
                      selected ? 'opacity-80' : 'text-md-fg-muted',
                    ].join(' ')}
                  >
                    {sites.length} sites
                    <ChevronIcon open={expanded} />
                  </span>
                </button>
                {expanded ? (
                  <ul
                    className={[
                      'm-0 list-none space-y-1.5 border-t px-3.5 py-3 pl-9',
                      selected ? 'border-md-fg-on-accent/20' : 'border-md-border-subtle',
                    ].join(' ')}
                  >
                    {sites.map((domain) => (
                      <li
                        key={domain}
                        className={[
                          'truncate text-sm',
                          selected ? 'opacity-90' : 'text-md-fg',
                        ].join(' ')}
                      >
                        {domain}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!ready || busy}
          onClick={onAddCluster}
          className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-md-border-subtle py-3 text-sm font-semibold text-md-fg-muted transition-colors hover:border-md-accent/50 hover:text-md-accent disabled:opacity-50"
        >
          <PlusIcon />
          Add cluster
        </button>
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
