import { useState } from 'react';

export type PersonaId = 'deep-reader' | 'standard-worker' | 'rapid-researcher';

type PersonaScreenProps = {
  onContinue: () => void;
};

const PERSONAS: {
  id: PersonaId;
  title: string;
  blurb: string;
  traits: [string, string];
  recommended?: boolean;
  icon: 'book' | 'work' | 'lab';
}[] = [
  {
    id: 'deep-reader',
    title: 'Deep Reader',
    blurb: 'Zero-distraction for long-form reading. Minimal UI footprint.',
    traits: ['Hidden Toolbars', 'Muted Colors'],
    icon: 'book',
  },
  {
    id: 'standard-worker',
    title: 'Standard Worker',
    blurb: 'Balanced focus for everyday tasks. Non-intrusive awareness.',
    traits: ['Smart Batching', 'Contextual Sidebars'],
    recommended: true,
    icon: 'work',
  },
  {
    id: 'rapid-researcher',
    title: 'Rapid Researcher',
    blurb: 'High-density switching for synthesis and mapping.',
    traits: ['Multi-tab Sync', 'Active Graphing'],
    icon: 'lab',
  },
];

function PersonaIcon({ type }: { type: 'book' | 'work' | 'lab' }) {
  if (type === 'book') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
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
 * Select Your Focus Persona — from Stitch Pro Theme.
 * UI only; fits popup height with no scroll. No footer / thanks.
 */
export function PersonaScreen({ onContinue }: PersonaScreenProps) {
  const [selected, setSelected] = useState<PersonaId>('standard-worker');

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
        <p className="m-0 text-xs leading-snug text-md-fg-muted">
          Tailor your cognitive environment. Each persona recalibrates notifications and
          density to match your flow.
        </p>
      </div>

      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 p-0" role="listbox" aria-label="Focus personas">
        {PERSONAS.map((persona) => {
          const isSelected = selected === persona.id;
          return (
            <li key={persona.id} className="min-h-0 flex-1">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelected(persona.id)}
                className={[
                  'relative flex h-full w-full cursor-pointer flex-col justify-center rounded-md border px-2.5 py-2 text-left transition-colors',
                  isSelected
                    ? 'border-md-accent bg-md-surface'
                    : 'border-md-border-subtle bg-md-bg hover:bg-md-surface',
                ].join(' ')}
              >
                {persona.recommended ? (
                  <span className="absolute top-1.5 right-1.5 rounded-sm bg-md-accent px-1.5 py-0.5 text-[0.55rem] font-semibold tracking-wide text-md-fg-on-accent uppercase">
                    Recommended
                  </span>
                ) : null}

                <div className="mb-1 flex items-center gap-2 pr-16">
                  <span
                    className={[
                      'grid size-7 shrink-0 place-items-center rounded-full',
                      isSelected
                        ? 'bg-md-accent text-md-fg-on-accent'
                        : 'bg-md-accent-soft text-md-accent',
                    ].join(' ')}
                  >
                    <PersonaIcon type={persona.icon} />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">{persona.title}</span>
                </div>

                <p className="m-0 mb-1.5 text-[0.68rem] leading-snug text-md-fg-muted">
                  {persona.blurb}
                </p>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {persona.traits.map((trait) => (
                    <span
                      key={trait}
                      className={[
                        'inline-flex items-center gap-1 text-[0.62rem]',
                        isSelected ? 'text-md-accent' : 'text-md-fg-muted',
                      ].join(' ')}
                    >
                      <span aria-hidden="true">✓</span>
                      {trait}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex shrink-0 flex-col gap-2">
        <button
          type="button"
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-md-accent px-4 py-2.5 text-sm font-semibold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
          onClick={onContinue}
        >
          Initialize Flow State
        </button>
        <button
          type="button"
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-md-accent bg-transparent px-4 py-2 text-sm font-semibold text-md-accent transition-colors hover:bg-md-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
          onClick={onContinue}
        >
          Custom Configuration
        </button>
      </div>
    </main>
  );
}
