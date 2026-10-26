import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/90 disabled:bg-ink/30',
  secondary: 'border border-line bg-surface text-ink hover:border-ink/40 disabled:text-subtle',
  ghost: 'text-muted hover:text-ink disabled:text-subtle',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

export function Button({ variant = 'primary', block = false, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  );
}
