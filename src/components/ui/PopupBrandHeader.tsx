import { BrandMark } from '@/components/ui/BrandMark';

type PopupBrandHeaderProps = {
  onMenuClick?: () => void;
};

/**
 * Top brand bar for the main popup (MindDrift + menu).
 */
export function PopupBrandHeader({ onMenuClick }: PopupBrandHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-pad">
      <div className="flex items-center gap-2.5 text-md-accent">
        <BrandMark size="sm" />
        <span className="text-xl font-bold tracking-tight">MindDrift</span>
      </div>
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="grid size-9 cursor-pointer place-items-center rounded-md text-md-accent transition-opacity hover:opacity-80"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  );
}
