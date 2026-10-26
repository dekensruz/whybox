import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface ScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Mobile-first page frame: optional header, scrollable content, footer pinned to the bottom. */
export function Screen({ header, footer, children, className }: ScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      {header && <header className="flex h-12 items-center justify-between">{header}</header>}
      <main className={cx('flex flex-1 flex-col', className)}>{children}</main>
      {footer && <footer className="pt-6">{footer}</footer>}
    </div>
  );
}
