import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { storageGet, storageSet } from '@/chrome/storage';
import { Toast } from '@/components/ui/Toast';
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

const CLUSTERS = [
  { name: 'Development', sites: 12, tone: 'accent' as const },
  { name: 'Learning', sites: 4, tone: 'muted' as const },
];

const PRODUCTIVE_DOMAINS = [
  { host: 'github.com', label: 'Engineering Flow', icon: 'code' as const },
  { host: 'notion.so', label: 'Knowledge Management', icon: 'doc' as const },
];

type DomainTab = 'productive' | 'distracting';

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
  const [domainTab, setDomainTab] = useState<DomainTab>('productive');

  const dirty = draftPersonaId !== savedPersonaId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await storageGet<string>(STORAGE_KEYS.ACTIVE_PERSONA, DEFAULT_PERSONA);
      const id = isPersonaId(stored) ? stored : DEFAULT_PERSONA;
      if (!cancelled) {
        setSavedPersonaId(id);
        setDraftPersonaId(id);
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

  return (
    <div className="relative box-border flex h-full min-h-0 w-full flex-col overflow-hidden px-pad pb-3 pt-1">
      <div className="md-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-0.5">
        {/* Persona selection */}
        <section
          className="relative shrink-0 overflow-hidden rounded-3xl border border-md-border-subtle bg-md-surface/80 p-5"
          aria-label="Persona selection"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-md-accent/10 blur-3xl" />
          <div className="mb-5 flex items-center justify-between">
            <h3 className="m-0 text-lg font-semibold tracking-tight text-md-fg">
              Persona selection
            </h3>
            <PsychologyIcon />
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
          <button
            type="button"
            disabled={!ready || !dirty || saving}
            onClick={() => void savePersona()}
            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-md-accent px-4 py-3 text-sm font-bold text-md-fg-on-accent shadow-[0_8px_24px_color-mix(in_srgb,#f9b17a_28%,transparent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? 'Saving…' : 'Save persona'}
          </button>
        </section>

        {/* Clusters */}
        <section
          className="shrink-0 rounded-3xl border border-md-border-subtle bg-md-surface/80 p-5"
          aria-label="Clusters"
        >
          <h3 className="m-0 text-lg font-semibold tracking-tight text-md-fg">Clusters</h3>
          <p className="mt-2 mb-5 text-sm text-md-fg-muted">Manage your focus environments.</p>
          <div className="flex flex-col gap-3">
            {CLUSTERS.map((cluster) => (
              <div
                key={cluster.name}
                className="flex items-center justify-between rounded-xl border border-md-border-subtle bg-md-surface-raised px-3.5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      'size-3 rounded-full',
                      cluster.tone === 'accent' ? 'bg-md-accent' : 'bg-md-fg-muted',
                    ].join(' ')}
                  />
                  <span className="text-sm font-medium text-md-fg">{cluster.name}</span>
                </div>
                <span className="text-xs font-semibold tracking-wide text-md-fg-muted">
                  {cluster.sites} Sites
                </span>
              </div>
            ))}
            <button
              type="button"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-md-border-subtle py-3 text-sm font-semibold text-md-fg-muted transition-colors hover:border-md-accent/50 hover:text-md-accent"
            >
              <PlusIcon />
              New Cluster
            </button>
          </div>
        </section>

        {/* Domain Management */}
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
                Categorize incoming cognitive signals.
              </p>
            </div>
            <div
              className="flex rounded-xl bg-md-bg p-1"
              role="tablist"
              aria-label="Domain category"
            >
              <button
                type="button"
                role="tab"
                aria-selected={domainTab === 'productive'}
                onClick={() => setDomainTab('productive')}
                className={[
                  'flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  domainTab === 'productive'
                    ? 'bg-md-surface-raised text-md-fg shadow-sm'
                    : 'text-md-fg-muted hover:text-md-fg',
                ].join(' ')}
              >
                Productive
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={domainTab === 'distracting'}
                onClick={() => setDomainTab('distracting')}
                className={[
                  'flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  domainTab === 'distracting'
                    ? 'bg-md-surface-raised text-md-fg shadow-sm'
                    : 'text-md-fg-muted hover:text-md-fg',
                ].join(' ')}
              >
                Distracting
              </button>
            </div>
          </div>

          {domainTab === 'productive' ? (
            <div className="flex flex-col gap-3" role="tabpanel">
              {PRODUCTIVE_DOMAINS.map((domain) => (
                <div
                  key={domain.host}
                  className="group flex items-center justify-between rounded-2xl bg-md-surface-raised px-4 py-3.5 transition-colors hover:bg-md-border/30"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-10 place-items-center rounded-xl bg-md-accent-soft text-md-accent">
                      <DomainGlyph type={domain.icon} />
                    </div>
                    <div>
                      <p className="m-0 text-sm font-medium text-md-fg">{domain.host}</p>
                      <p className="m-0 text-xs text-md-fg-muted">{domain.label}</p>
                    </div>
                  </div>
                  <span className="text-md-fg-muted opacity-0 transition-opacity group-hover:opacity-100">
                    <CloseIcon />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border border-md-border-subtle bg-md-surface-raised p-6 text-center"
              role="tabpanel"
            >
              <BlockIcon />
              <p className="mt-2 mb-0 text-sm font-bold text-md-fg">42 Domains Blocked</p>
              <p className="mt-1 mb-0 text-xs text-md-fg-muted">
                Social Media &amp; News feeds restricted during focus.
              </p>
              <button
                type="button"
                className="mt-4 cursor-pointer rounded-lg bg-[#93000a] px-4 py-2 text-xs font-bold text-[#ffdad6] transition-opacity hover:opacity-90"
              >
                Review List
              </button>
            </div>
          )}
        </section>

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

function DomainGlyph({ type }: { type: 'code' | 'doc' }) {
  if (type === 'code') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path
          d="M8 8 4.5 12 8 16M16 8l3.5 4L16 16M13.5 6.5 10.5 17.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M7 4h7l4 4v12H7V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="36"
      height="36"
      fill="none"
      className="text-[#ffb4ab]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
