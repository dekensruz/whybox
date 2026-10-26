import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useI18n } from '@/i18n';
import { EmailAuthError, MIN_PASSWORD_LENGTH, setNewPassword, type AuthErrorKind } from './emailAuth';
import { ErrorMessage } from './ErrorMessage';

/** Reached after a valid reset code: the user is signed in and chooses a new password. */
export function NewPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { loading, mode } = useSession();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);

  if (!loading && mode !== 'account') return <Navigate to="/auth?mode=signin" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setNewPassword(password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof EmailAuthError ? caught.kind : 'unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Logo />}>
      <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-8 py-8">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{t('auth.newPassword.title')}</h1>
        <div className="flex flex-col gap-2">
          <TextField
            label={t('auth.newPassword.label')}
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-sm text-subtle">{t('auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}</p>
        </div>
        <ErrorMessage kind={error} />
        <Button block type="submit" disabled={busy || password.length < MIN_PASSWORD_LENGTH}>
          {t('auth.newPassword.submit')}
        </Button>
      </form>
    </Screen>
  );
}
