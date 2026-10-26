import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { ErrorMessage } from './ErrorMessage';
import { EmailAuthError, resendCode, verifyCode, type AuthErrorKind, type CodePurpose } from './emailAuth';

const CODE_LENGTH = 6;

interface CodeFormProps {
  email: string;
  purpose: CodePurpose;
  onVerified: () => void;
  onChangeEmail: () => void;
}

/** Asks for the 6-digit code sent by email, to confirm an account or reset a password. */
export function CodeForm({ email, purpose, onVerified, onChangeEmail }: CodeFormProps) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const [resent, setResent] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof EmailAuthError ? caught.kind : 'unknown');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      await verifyCode(email, code, purpose);
      onVerified();
    });
  };

  const resend = () =>
    run(async () => {
      await resendCode(email, purpose);
      setResent(true);
    });

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{t('auth.code.title')}</h1>
        <p className="leading-relaxed text-muted text-pretty">{t('auth.code.hint', { email })}</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">{t('auth.code.label')}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            className="h-16 w-full rounded-xl border border-line bg-surface text-center font-mono text-[28px] tracking-[0.5em] text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </label>
        <ErrorMessage kind={error} />
        {resent && !error && (
          <p role="status" className="text-sm text-muted">
            {t('auth.code.resent')}
          </p>
        )}
        <Button block type="submit" disabled={busy || code.length !== CODE_LENGTH}>
          {t('auth.code.submit')}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-1">
        <Button variant="ghost" onClick={resend} disabled={busy}>
          {t('auth.code.resend')}
        </Button>
        <Button variant="ghost" onClick={onChangeEmail}>
          {t('auth.code.changeEmail')}
        </Button>
      </div>
    </div>
  );
}
