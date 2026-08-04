import { useId, useState } from 'react';
import type { PersonaId } from '@/types/persona';

export type { PersonaId };

type PersonaScreenProps = {
  onContinue: (personaId: PersonaId) => void;
};

const PERSONAS: {
  id: PersonaId;
  title: string;
  forWhom: string;
  behavior: string;
  recommended?: boolean;
  icon: 'book' | 'work' | 'lab';
}[] = [
  {
    id: 'deep-reader',
    title: 'Deep Reader',
    forWhom: 'Students, writers, and long-form readers.',
    behavior:
      'Flags switching quickly; quieter, less frequent nudges so deep work isn’t interrupted.',
    icon: 'book',
  },
  {
    id: 'standard-worker',
    title: 'Standard Worker',
    forWhom: 'PMs, marketers, and everyday office browsing.',
    behavior: 'Balanced alerts when switching gets chaotic — the default starting point.',
    recommended: true,
    icon: 'work',
  },
  {
    id: 'rapid-researcher',
    title: 'Rapid Researcher',
    forWhom: 'Developers, analysts, and multi-source investigators.',
    behavior:
      'Treats jumping across work tools as normal; only flags drift outside your workspace.',
    icon: 'lab',
  },
];

function PersonaIcon({ type }: { type: 'book' | 'work' | 'lab' }) {
  if (type === 'book') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path
          d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M5 18.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'work') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Select Your Focus Persona — named vertical rail + detail pane.
 * PRD plain-language copy; fits popup height with no scroll.
 */
export function PersonaScreen({ onContinue }: PersonaScreenProps) {
  const [selected, setSelected] = useState<PersonaId>('standard-worker');
  const baseId = useId();
  const active = PERSONAS.find((p) => p.id === selected) ?? PERSONAS[1];

  function selectByOffset(offset: number) {
    const index = PERSONAS.findIndex((p) => p.id === selected);
    const next = PERSONAS[(index + offset + PERSONAS.length) % PERSONAS.length];
    setSelected(next.id);
  }

  return (
    <main className="box-border flex h-full w-full flex-col overflow-hidden bg-md-bg p-pad text-md-fg">
      <header className="mb-3 flex shrink-0 items-center gap-2.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-md bg-md-accent text-md-fg-on-accent"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M4 8.5c2.5-2 5-2 7.5 0s5 2 7.5 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 12.5c2.5-2 5-2 7.5 0s5 2 7.5 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 16.5c2.5-2 5-2 7.5 0s5 2 7.5 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="text-base font-semibold tracking-tight">MindDrift</span>
      </header>

      <div className="mb-3 shrink-0">
        <h1 className="mb-1 text-xl font-semibold leading-snug tracking-tight">
          Select Your Focus Persona
        </h1>
        <p className="m-0 text-sm leading-relaxed text-md-fg-muted">
          Pick the style that matches how you browse — MindDrift tunes its nudges to match.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div
          className="flex w-[38%] shrink-0 flex-col gap-2"
          role="tablist"
          aria-label="Focus personas"
          aria-orientation="vertical"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
              event.preventDefault();
              selectByOffset(1);
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
              event.preventDefault();
              selectByOffset(-1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setSelected(PERSONAS[0].id);
            } else if (event.key === 'End') {
              event.preventDefault();
              setSelected(PERSONAS[PERSONAS.length - 1].id);
            }
          }}
        >
          {PERSONAS.map((persona) => {
            const isSelected = selected === persona.id;
            const tabId = `${baseId}-tab-${persona.id}`;
            const panelId = `${baseId}-panel-${persona.id}`;
            return (
              <button
                key={persona.id}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelected(persona.id)}
                className={[
                  'relative flex min-h-0 flex-1 cursor-pointer flex-col items-start justify-center gap-1.5 rounded-md border px-3 py-2.5 text-left transition-colors',
                  isSelected
                    ? 'border-md-accent bg-md-surface'
                    : 'border-md-border-subtle bg-md-bg hover:bg-md-surface',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-8 shrink-0 place-items-center rounded-full',
                    isSelected
                      ? 'bg-md-accent text-md-fg-on-accent'
                      : 'bg-md-accent-soft text-md-accent',
                  ].join(' ')}
                >
                  <PersonaIcon type={persona.icon} />
                </span>
                <span className="text-sm font-semibold leading-snug tracking-tight">
                  {persona.title}
                </span>
                {persona.recommended ? (
                  <span
                    className={[
                      'text-xs font-medium',
                      isSelected ? 'text-md-accent' : 'text-md-fg-muted',
                    ].join(' ')}
                  >
                    Recommended
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <section
          id={`${baseId}-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
          className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-md-border-subtle bg-md-surface p-4"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold tracking-tight">{active.title}</h2>
            {active.recommended ? (
              <span className="rounded-sm bg-md-accent px-2 py-0.5 text-xs font-semibold tracking-wide text-md-fg-on-accent uppercase">
                Recommended
              </span>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div>
              <p className="m-0 mb-1 text-xs font-semibold tracking-wide text-md-fg-muted uppercase">
                For
              </p>
              <p className="m-0 text-sm leading-relaxed text-md-fg">{active.forWhom}</p>
            </div>
            <div>
              <p className="m-0 mb-1 text-xs font-semibold tracking-wide text-md-fg-muted uppercase">
                MindDrift will
              </p>
              <p className="m-0 text-sm leading-relaxed text-md-fg">{active.behavior}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-2">
        <button
          type="button"
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-md-accent px-4 py-2.5 text-sm font-semibold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
          onClick={() => onContinue(selected)}
        >
          Confirm and continue
        </button>
      </div>
    </main>
  );
}
