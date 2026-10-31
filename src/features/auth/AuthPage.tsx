import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { PasswordField } from '@/components/ui/PasswordField';
import { useI18n } from '@/i18n';
import { CodeForm } from './CodeForm';
import { ErrorMessage } from './ErrorMessage';
import {
  EmailAuthError,
  MIN_PASSWORD_LENGTH,
  resendCode,
  sendResetCode,
  signIn,
  signUp,
  type AuthErrorKind,
  type CodePurpose,
} from './emailAuth';

type View = 'signup' | 'signin' | 'forgot' | { code: CodePurpose };

export function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { onlineSignInAvailable, signInWithGoogle, continueAsGuest } = useSession();
  const [view, setView] = useState<View>(params.get('mode') === 'signin' ? 'signin' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);

  const show = (next: View) => {
    setError(null);
    setView(next);
  };

  /** Runs an auth action, turning failures into a message. */
  const attempt = async (action: () => Promise<void>) => {
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

  const submitCredentials = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (view === 'signup') {
      return attempt(async () => {
        await signUp(address, password);
        show({ code: 'signup' });
      });
    }
    return attempt(async () => {
      try {
        await signIn(address, password);
      } catch (caught) {
        // An unconfirmed account gets a fresh code and goes to the code screen.
        if (!(caught instanceof EmailAuthError) || caught.kind !== 'email-not-confirmed') throw caught;
        await resendCode(address, 'signup');
        show({ code: 'signup' });
      }
    });
  };

  const submitReset = (event: FormEvent) => {
    event.preventDefault();
    return attempt(async () => {
      await sendResetCode(email.trim());
      show({ code: 'recovery' });
    });
  };

  const continueWithoutAccount = () => {
    continueAsGuest();
    navigate('/onboarding');
  };

  const header = (
    <>
      <Logo />
      <LanguageSwitch />
    </>
  );

  if (typeof view === 'object') {
    return (
      <Screen header={header}>
        <CodeForm
          email={email.trim()}
          purpose={view.code}
          onVerified={() => view.code === 'recovery' && navigate('/password', { replace: true })}
          onChangeEmail={() => show(view.code === 'signup' ? 'signup' : 'forgot')}
        />
      </Screen>
    );
  }

  if (view === 'forgot') {
    return (
      <Screen header={header}>
        <Intro title={t('auth.reset.title')} subtitle={t('auth.reset.hint')}>
          <form onSubmit={submitReset} className="flex flex-col gap-4">
            <EmailField value={email} onChange={setEmail} />
            <ErrorMessage kind={error} />
            <Button block type="submit" disabled={busy}>
              {t('auth.reset.submit')}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => show('signin')}>
            {t('auth.reset.back')}
          </Button>
        </Intro>
      </Screen>
    );
  }

  const isSignUp = view === 'signup';
  // Only flag a mismatch once the confirmation is as long as the password, not while it is being typed.
  const passwordsDiffer = confirmation.length >= password.length && confirmation.length > 0 && confirmation !== password;

  return (
    <Screen header={header}>
      <Intro title={isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')} subtitle={t('auth.subtitle')}>
        {onlineSignInAvailable ? (
          <div className="flex flex-col gap-5">
            <Button block variant="secondary" onClick={() => attempt(signInWithGoogle)}>
              <GoogleIcon />
              {t('auth.google')}
            </Button>

            <div className="flex items-center gap-3 text-sm text-subtle">
              <span className="h-px flex-1 bg-line" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
              <EmailField value={email} onChange={setEmail} />
              <div className="flex flex-col gap-2">
                <PasswordField
                  label={t('auth.passwordLabel')}
                  required
                  minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {isSignUp ? (
                  <p className="text-sm text-subtle">{t('auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}</p>
                ) : (
                  <button type="button" onClick={() => show('forgot')} className="self-end text-sm text-muted hover:text-ink">
                    {t('auth.forgot')}
                  </button>
                )}
              </div>
              {isSignUp && (
                <div className="flex flex-col gap-2">
                  <PasswordField
                    label={t('auth.confirmPasswordLabel')}
                    required
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                  {passwordsDiffer && (
                    <p role="alert" className="text-sm text-danger">
                      {t('auth.passwordMismatch')}
                    </p>
                  )}
                </div>
              )}
              <ErrorMessage kind={error} />
              <Button block type="submit" disabled={busy || (isSignUp && confirmation !== password)}>
                {isSignUp ? t('auth.signUpSubmit') : t('auth.signInSubmit')}
              </Button>
            </form>

            <Button variant="ghost" onClick={() => show(isSignUp ? 'signin' : 'signup')}>
              {isSignUp ? t('auth.toSignIn') : t('auth.toSignUp')}
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-line px-4 py-3 text-sm leading-relaxed text-muted">{t('auth.unavailable')}</p>
        )}

        <div className="flex flex-col items-center gap-1 border-t border-line pt-6">
          <Button variant="ghost" onClick={continueWithoutAccount}>
            {t('auth.guest')}
          </Button>
          <span className="text-xs text-subtle">{t('auth.guestHint')}</span>
        </div>
      </Intro>
    </Screen>
  );
}

function Intro({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        <p className="leading-relaxed text-muted text-pretty">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <TextField
      label={t('auth.emailLabel')}
      type="email"
      required
      autoComplete="email"
      placeholder={t('auth.emailPlaceholder')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
