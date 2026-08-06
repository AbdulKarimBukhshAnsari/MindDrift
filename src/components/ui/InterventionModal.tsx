import { BrandMark } from '@/components/ui/BrandMark';

type InterventionModalProps = {
  message: string;
  continueLabel: string;
  goBackLabel: string;
  snoozeLabel: string;
  onContinue: () => void;
  onGoBack: () => void;
  onSnooze: () => void;
};

/**
 * Focus-break prompt — top-right, page-blocking dim, design-system tokens.
 */
export function InterventionModal({
  message,
  continueLabel,
  goBackLabel,
  snoozeLabel,
  onContinue,
  onGoBack,
  onSnooze,
}: InterventionModalProps) {
  return (
    <div
      className="fixed inset-0 z-[2147483646] font-sans"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,#051424_62%,transparent)] backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-5">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Focus break"
          className="pointer-events-auto w-[min(42rem,calc(100vw-2.5rem))] animate-[md-rise_240ms_ease-out] rounded-lg border border-md-border-subtle bg-md-bg p-6 text-md-fg shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          <div className="mb-5 flex items-start gap-3.5">
            <BrandMark size="md" className="mt-0.5" />
            <div className="min-w-0">
              <p className="m-0 text-xs font-semibold tracking-wide text-md-accent uppercase">
                MindDrift
              </p>
              <p className="m-0 mt-2 text-lg leading-snug font-semibold tracking-tight">
                {message}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5">
              <button
                type="button"
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-md-border-subtle bg-md-surface px-3 py-3 text-sm font-semibold text-md-fg transition-colors hover:bg-md-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
                onClick={onContinue}
              >
                {continueLabel}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-md-accent px-3 py-3 text-sm font-semibold text-md-fg-on-accent transition-colors hover:bg-md-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
                onClick={onGoBack}
              >
                {goBackLabel}
              </button>
            </div>
            <button
              type="button"
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-md-border-subtle bg-transparent px-3 py-2.5 text-sm font-semibold text-md-fg-muted transition-colors hover:bg-md-surface hover:text-md-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-accent"
              onClick={onSnooze}
            >
              {snoozeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
