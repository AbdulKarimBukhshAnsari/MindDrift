import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { applyFocusCluster, loadFocusClusters } from '@/chrome/focusClusters';
import { storageGet, storageSet } from '@/chrome/storage';
import { AddClusterPanel } from '@/components/screens/AddClusterPanel';
import { DomainManagementPanel } from '@/components/screens/DomainManagementPanel';
import { Toast } from '@/components/ui/Toast';
import { effectiveFocusDomains } from '@/lib/focusClusters';
import type { FocusCluster } from '@/types/focusCluster';
import type { PersonaId } from '@/types/persona';

const DEFAULT_PERSONA: PersonaId = 'standard-worker';
const TOAST_MS = 2500;

const PERSONAS: {
  id: PersonaId;
  title: string;
  blurb: string;
  icon: 'diamond' | 'groups' | 'brush';
}[] = [
  {
    id: 'deep-reader',
    title: 'Deep Reader',
    blurb: 'Quieter nudges for long-form focus.',
    icon: 'diamond',
  },
  {
    id: 'standard-worker',
    title: 'Standard Worker',
    blurb: 'Balanced alerts when switching gets chaotic.',
    icon: 'groups',
  },
  {
    id: 'rapid-researcher',
    title: 'Rapid Researcher',
    blurb: 'Only flags drift outside your workspace.',
    icon: 'brush',
  },
];

function isPersonaId(value: string): value is PersonaId {
  return PERSONAS.some((persona) => persona.id === value);
}

/**
 * Profile tab — Stitch Profile & Settings (Pro Theme), without avatar.
 * Persona selection persists to chrome.storage.local.
 */
export function ProfileScreen() {
  const [savedPersonaId, setSavedPersonaId] = useState<PersonaId>(DEFAULT_PERSONA);
  const [draftPersonaId, setDraftPersonaId] = useState<PersonaId>(DEFAULT_PERSONA);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clusters, setClusters] = useState<FocusCluster[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  const [showAddCluster, setShowAddCluster] = useState(false);

  const dirty = draftPersonaId !== savedPersonaId;

  async function refreshClusters() {
    const loaded = await loadFocusClusters();
    setClusters(loaded.clusters);
    setActiveClusterId(loaded.activeId);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [stored, loaded] = await Promise.all([
        storageGet<string>(STORAGE_KEYS.ACTIVE_PERSONA, DEFAULT_PERSONA),
        loadFocusClusters(),
      ]);
      const id = isPersonaId(stored) ? stored : DEFAULT_PERSONA;
      if (!cancelled) {
        setSavedPersonaId(id);
        setDraftPersonaId(id);
        setClusters(loaded.clusters);
        setActiveClusterId(loaded.activeId);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  async function savePersona() {
    if (!dirty || saving) return;
    const next = draftPersonaId;
    const title = PERSONAS.find((p) => p.id === next)?.title ?? 'persona';
    setSaving(true);
    try {
      await storageSet(STORAGE_KEYS.ACTIVE_PERSONA, next);
      setSavedPersonaId(next);
      setToastMessage(`Persona saved — ${title}`);
    } finally {
      setSaving(false);
    }
  }

  async function selectCluster(id: string) {
    setExpandedClusterId((current) => (current === id ? null : id));
    if (id === activeClusterId) return;
    const applied = await applyFocusCluster(clusters, id);
    if (applied) {
      setActiveClusterId(applied.id);
      setToastMessage(`Cluster active — ${applied.name}`);
    }
  }

  if (showAddCluster) {
    return (
      <AddClusterPanel
        onBack={() => setShowAddCluster(false)}
        onSaved={(cluster) => {
          void refreshClusters();
          setToastMessage(`Cluster saved — ${cluster.name}`);
        }}
      />
    );
  }

  return (
    <div className="relative box-border flex h-full min-h-0 w-full flex-col overflow-hidden px-pad pb-3 pt-1">
      <div className="md-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-0.5">
        {/* Persona selection */}
        <section
          className="relative shrink-0 overflow-hidden rounded-3xl border border-md-border-subtle bg-md-surface/80 p-5"
          aria-label="Persona selection"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-md-accent/10 blur-3xl" />
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="m-0 text-lg font-semibold tracking-tight text-md-fg">
              Persona selection
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!ready || !dirty || saving}
                onClick={() => void savePersona()}
                className="cursor-pointer rounded-lg bg-md-accent px-3 py-1.5 text-xs font-bold text-md-fg-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <PsychologyIcon />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Focus persona">
            {PERSONAS.map((persona) => {
              const selected = persona.id === draftPersonaId;
              return (
                <button
                  key={persona.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!ready || saving}
                  onClick={() => setDraftPersonaId(persona.id)}
                  className={[
                    'flex cursor-pointer flex-col items-start rounded-2xl p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    selected
                      ? 'bg-md-accent text-md-fg-on-accent shadow-[0_10px_28px_color-mix(in_srgb,#f9b17a_28%,transparent)]'
                      : 'border border-md-border-subtle bg-md-surface-raised text-md-fg hover:border-md-accent/40',
                  ].join(' ')}
                >
                  <span className={selected ? 'opacity-90' : 'text-md-fg-muted'}>
                    <PersonaGlyph type={persona.icon} />
                  </span>
                  <span className="mt-3 text-sm font-bold leading-tight">{persona.title}</span>
                  <span
                    className={[
                      'mt-1 text-xs leading-snug',
                      selected ? 'opacity-80' : 'text-md-fg-muted',
                    ].join(' ')}
                  >
                    {persona.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Clusters */}
        <section
          className="shrink-0 rounded-3xl border border-md-border-subtle bg-md-surface/80 p-5"
          aria-label="Clusters"
        >
          <h3 className="m-0 text-lg font-semibold tracking-tight text-md-fg">Clusters</h3>
          <p className="mt-2 mb-5 text-sm text-md-fg-muted">Manage your focus environments.</p>
          <div className="flex flex-col gap-3">
            {clusters.length === 0 ? (
              <p className="m-0 rounded-xl border border-dashed border-md-border-subtle px-3 py-4 text-center text-sm text-md-fg-muted">
                No clusters yet — create one for Focus sessions.
              </p>
            ) : (
              clusters.map((cluster, index) => {
                const selected = cluster.id === activeClusterId;
                const expanded = cluster.id === expandedClusterId;
                const sites = effectiveFocusDomains(cluster);
                return (
                  <div
                    key={cluster.id}
                    className={[
                      'overflow-hidden rounded-xl border transition-colors',
                      selected
                        ? 'border-md-accent/50 bg-md-accent-soft'
                        : 'border-md-border-subtle bg-md-surface-raised',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => void selectCluster(cluster.id)}
                      className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left hover:opacity-95"
                      aria-expanded={expanded}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={[
                            'size-3 shrink-0 rounded-full',
                            selected || index % 2 === 0 ? 'bg-md-accent' : 'bg-md-fg-muted',
                          ].join(' ')}
                        />
                        <span className="truncate text-sm font-medium text-md-fg">
                          {cluster.name}
                        </span>
                      </div>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-wide text-md-fg-muted">
                        {sites.length} Sites
                        <ChevronIcon open={expanded} />
                      </span>
                    </button>
                    {expanded ? (
                      <ul className="m-0 list-none space-y-1.5 border-t border-md-border-subtle px-3.5 py-3 pl-9">
                        {sites.map((domain) => (
                          <li
                            key={domain}
                            className="truncate text-sm text-md-fg"
                          >
                            {domain}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            )}
            <button
              type="button"
              onClick={() => setShowAddCluster(true)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-md-border-subtle py-3 text-sm font-semibold text-md-fg-muted transition-colors hover:border-md-accent/50 hover:text-md-accent"
            >
              <PlusIcon />
              Add cluster
            </button>
          </div>
        </section>

        <DomainManagementPanel onToast={setToastMessage} />

        {/* Cognitive Insight */}
        <section
          className="shrink-0 rounded-3xl border border-md-border-subtle bg-md-bg p-5"
          aria-label="Cognitive insight"
        >
          <p className="m-0 mb-2 text-xs font-bold tracking-[0.08em] text-md-accent uppercase">
            Cognitive Insight
          </p>
          <h3 className="m-0 mb-3 text-lg font-semibold tracking-tight text-md-fg">
            Your flow state peaked 12% higher this week.
          </h3>
          <p className="m-0 mb-5 text-sm leading-relaxed text-md-fg-muted">
            Switching your Persona to &apos;Deep Reader&apos; during morning sessions has
            significantly reduced context-switching fatigue.
          </p>
          <button
            type="button"
            className="mb-5 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-md-accent transition-all hover:gap-3"
          >
            View Detailed Report
            <ArrowIcon />
          </button>
          <div className="flex h-36 items-end justify-between gap-2 overflow-hidden rounded-2xl bg-md-surface-raised p-4">
            <div className="h-[30%] w-8 rounded-t-lg bg-md-accent/20" />
            <div className="h-[50%] w-8 rounded-t-lg bg-md-accent/40" />
            <div className="h-[80%] w-8 rounded-t-lg bg-md-accent/60" />
            <div className="h-full w-8 rounded-t-lg bg-md-accent shadow-[0_8px_20px_color-mix(in_srgb,#f9b17a_28%,transparent)]" />
            <div className="h-[70%] w-8 rounded-t-lg bg-md-accent/50" />
          </div>
        </section>
      </div>

      <Toast message={toastMessage ?? ''} open={Boolean(toastMessage)} />
    </div>
  );
}

function PsychologyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      className="text-md-fg-muted"
      aria-hidden="true"
    >
      <path
        d="M12 3a6 6 0 0 0-4.5 9.9V17h9v-4.1A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 17v2.5h5V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
      <circle cx="14" cy="10" r="0.9" fill="currentColor" />
    </svg>
  );
}

function PersonaGlyph({ type }: { type: 'diamond' | 'groups' | 'brush' }) {
  if (type === 'diamond') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path
          d="M12 3 4.5 9.5 12 21l7.5-11.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M4.5 9.5h15" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === 'groups') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3.5 18c.8-2.6 2.6-4 5.5-4s4.7 1.4 5.5 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M14 14.2c1.5-.4 2.8.1 3.8 1.4.6.8 1 1.6 1.2 2.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M15.5 4.5 19 8l-9.5 9.5H6v-3.5L15.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5 17 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M5 12h12M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
