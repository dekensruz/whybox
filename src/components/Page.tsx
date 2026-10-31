import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Logo } from './Logo';

interface PageProps {
  title?: string;
  subtitle?: string;
  /** Right side of the phone header. */
  action?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

/** A page inside the app shell: logo header on phones (the side menu shows it on large screens), then the content. */
export function Page({ title, subtitle, action, wide = false, children }: PageProps) {
  return (
    <div className={cx('mx-auto w-full px-6 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-10 lg:pt-10', wide ? 'max-w-5xl' : 'max-w-2xl')}>
      <header className="flex h-12 items-center justify-between lg:hidden">
        <Logo />
        {action}
      </header>
      {(title || subtitle) && (
        <div className="flex flex-col gap-2 pb-8 pt-8 lg:pt-0">
          {title && <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">{title}</h1>}
          {subtitle && <p className="leading-relaxed text-muted text-pretty">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
