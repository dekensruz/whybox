import { useId, useState, type InputHTMLAttributes } from 'react';
import { useI18n } from '@/i18n';

/** Password input with a button to show or hide what was typed. */
export function PasswordField({ label, ...props }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useI18n();
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="h-12 w-full rounded-xl border border-line bg-surface pl-4 pr-12 text-[15px] text-ink transition-colors focus:border-ink focus:outline-none"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-subtle transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M4 20 20 4" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
