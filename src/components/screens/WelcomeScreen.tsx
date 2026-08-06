import { BrandMark } from '@/components/ui/BrandMark';

type WelcomeScreenProps = {
  onStart: () => void;
};

/**
 * First-run welcome — fits entirely in popup height (no scroll).
 * No login / account CTAs.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <main className="box-border flex h-full w-full flex-col overflow-hidden bg-md-bg p-pad text-md-fg">
      <header className="flex shrink-0 items-center gap-2.5">
        <BrandMark size="sm" />
        <span className="text-base font-semibold tracking-tight">MindDrift</span>
      </header>

      <section className="flex min-h-0 flex-1 flex-col justify-center gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-semibold leading-snug tracking-tight">
            Welcome to <span className="text-md-accent">MindDrift</span>
          </h1>
          <p className="m-0 text-sm leading-relaxed text-md-fg-muted">
            Catch your focus before it drifts. Master your cognitive clarity through
            intentional flow.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-md-accent px-4 py-3 text-sm font-semibold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
          onClick={onStart}
        >
          Start Your Flow
          <span className="font-medium leading-none" aria-hidden="true">
            →
          </span>
        </button>
      </section>

      <ul className="mt-4 grid shrink-0 list-none grid-cols-2 gap-2 p-0">
        <li className="flex items-start gap-2 rounded-md border border-md-border-subtle bg-md-surface p-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md bg-md-accent-soft text-md-accent"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="1.25" fill="currentColor" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-md-fg">Private Workspace</span>
            <span className="mt-0.5 block text-[0.65rem] leading-snug text-md-fg-muted">
              Stays on this device
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2 rounded-md border border-md-border-subtle bg-md-surface p-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md bg-md-accent-soft text-md-accent"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M4 19V9l5 3 5-7 6 9"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 19h16"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-md-fg">Local Insights</span>
            <span className="mt-0.5 block text-[0.65rem] leading-snug text-md-fg-muted">
              No cloud account
            </span>
          </span>
        </li>
      </ul>
    </main>
  );
}
