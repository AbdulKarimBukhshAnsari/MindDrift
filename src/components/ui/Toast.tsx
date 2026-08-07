type ToastProps = {
  message: string;
  open: boolean;
};

/**
 * Compact confirmation toast for the popup — sits above the bottom nav.
 */
export function Toast({ message, open }: ToastProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-pad bottom-3 z-30 flex justify-center"
    >
      <div className="animate-[md-rise_220ms_ease-out] rounded-xl border border-md-border-subtle bg-md-surface-raised px-4 py-2.5 text-sm font-semibold text-md-fg shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
        <span className="mr-2 inline-block text-md-accent" aria-hidden="true">
          ✓
        </span>
        {message}
      </div>
    </div>
  );
}
