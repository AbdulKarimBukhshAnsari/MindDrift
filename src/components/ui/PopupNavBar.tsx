export type PopupNavId = 'focus' | 'insights' | 'profile';

type PopupNavBarProps = {
  active: PopupNavId;
  onChange: (id: PopupNavId) => void;
};

const NAV_ITEMS: {
  id: PopupNavId;
  label: string;
  icon: 'timer' | 'insights' | 'person';
}[] = [
  { id: 'focus', label: 'Focus', icon: 'timer' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

function NavIcon({ type, filled }: { type: 'timer' | 'insights' | 'person'; filled?: boolean }) {
  if (type === 'timer') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="13"
          r="8"
          stroke="currentColor"
          strokeWidth={filled ? '2' : '1.6'}
          fill={filled ? 'currentColor' : 'none'}
          fillOpacity={filled ? 0.18 : 0}
        />
        <path
          d="M12 9v4l2.5 1.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 3.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'insights') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path
          d="M4 18V10M10 18V6M16 18v-5M20 18H3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.5 5.5l1.2-1.8M18.2 7.2l1.8-1.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.5c1.4-3.2 3.8-4.8 6.5-4.8s5.1 1.6 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bottom tab bar for the main popup — Focus / Insights / Profile.
 * Reusable across home and future feature screens.
 */
export function PopupNavBar({ active, onChange }: PopupNavBarProps) {
  return (
    <nav
      className="flex h-[4.5rem] shrink-0 items-center justify-around rounded-t-xl bg-md-surface-raised shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
      aria-label="Main"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={[
              'flex min-w-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 px-3 py-2 transition-colors',
              isActive ? 'text-md-accent' : 'text-md-fg-muted hover:text-md-fg',
            ].join(' ')}
          >
            <NavIcon type={item.icon} filled={isActive} />
            <span
              className={[
                'text-[11px] font-semibold tracking-wide',
                isActive ? 'font-bold' : 'font-medium',
              ].join(' ')}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
