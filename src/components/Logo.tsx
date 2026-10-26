import { cx } from '@/lib/cx';

/** The mark: an open box with a point of light coming out of it. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cx('size-8', className)}>
      <rect width="64" height="64" rx="14" fill="var(--color-ink)" />
      <path
        d="M18 28v12a8 8 0 0 0 8 8h12a8 8 0 0 0 8-8V28"
        fill="none"
        stroke="var(--color-paper)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="20" r="5.5" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Whybox</span>
    </span>
  );
}
