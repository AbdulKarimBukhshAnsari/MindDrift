import { ICON_PATHS, iconUrl } from '@/constants/icons';

type BrandMarkProps = {
  /** `sm` = 32px (headers), `md` = 40px (intervention). */
  size?: 'sm' | 'md';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'size-8',
  md: 'size-10',
} as const;

/**
 * MindDrift brand mark — peach brain logo on black.
 * Use for headers and intervention chrome only (not persona/nav icons).
 */
export function BrandMark({ size = 'sm', className }: BrandMarkProps) {
  return (
    <img
      src={iconUrl(ICON_PATHS.logo)}
      alt=""
      width={size === 'sm' ? 32 : 40}
      height={size === 'sm' ? 32 : 40}
      className={[SIZE_CLASS[size], 'shrink-0 rounded-md object-cover', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
      draggable={false}
    />
  );
}
