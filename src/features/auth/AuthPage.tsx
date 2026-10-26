import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useI18n } from '@/i18n';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { onlineSignInAvailable, signInWithGoogle, signInWithEmail, continueAsGuest } = useSession();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleGoogle = () => signInWithGoogle().catch(() => setStatus('error'));

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    try {
      await signInWithEmail(email.trim());
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/onboarding');
  };

  return (
    <Screen
      header={
        <>
          <Logo />
          <LanguageSwitch />
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{t('auth.title')}</h1>
          <p className="leading-relaxed text-muted">{t('auth.subtitle')}</p>
        </div>

        {onlineSignInAvailable ? (
          <div className="flex flex-col gap-5">
            <Button block variant="secondary" onClick={handleGoogle}>
              <GoogleIcon />
              {t('auth.google')}
            </Button>

            <div className="flex items-center gap-3 text-sm text-subtle">
              <span className="h-px flex-1 bg-line" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-line" />
            </div>

            {status === 'sent' ? (
              <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed">
                {t('auth.emailSent')}
              </p>
            ) : (
              <form onSubmit={handleEmail} className="flex flex-col gap-3">
                <TextField
                  label={t('auth.emailLabel')}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button block type="submit" disabled={status === 'sending'}>
                  {t('auth.emailSubmit')}
                </Button>
              </form>
            )}

            {status === 'error' && (
              <p role="alert" className="text-sm text-danger">
                {t('auth.error')}
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-line px-4 py-3 text-sm leading-relaxed text-muted">{t('auth.unavailable')}</p>
        )}

        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" onClick={handleGuest}>
            {t('auth.guest')}
          </Button>
          <span className="text-xs text-subtle">{t('auth.guestHint')}</span>
        </div>
      </div>
    </Screen>
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
