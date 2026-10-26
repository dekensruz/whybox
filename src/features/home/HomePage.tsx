import type { ReactNode } from 'react';
import { useSession } from '@/app/SessionProvider';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { useI18n } from '@/i18n';

export function HomePage() {
  const { t } = useI18n();
  const { profile, signOut } = useSession();

  return (
    <Screen
      header={
        <>
          <Logo />
          <button type="button" onClick={signOut} className="text-sm text-muted hover:text-ink">
            {t('home.signOut')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-10 pt-10">
        <div className="flex flex-col gap-2">
          <p className="text-muted">{t('home.greeting', { name: profile?.firstName ?? '' })}</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">{t('home.prompt')}</h1>
        </div>

        <div className="grid gap-3">
          <ActionCard title={t('home.photo')} hint={t('home.photoHint')} icon={<CameraIcon />} />
          <ActionCard title={t('home.question')} hint={t('home.questionHint')} icon={<QuestionIcon />} />
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted">{t('home.recent')}</h2>
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-subtle">{t('home.empty')}</p>
        </section>
      </div>
    </Screen>
  );
}

function ActionCard({ title, hint, icon }: { title: string; hint: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-5 text-left transition-colors hover:border-ink/30"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
      <svg viewBox="0 0 20 20" className="size-5 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="m7.5 4.5 5.5 5.5-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9.2 9.2a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.2-1.5 2.3v.5" strokeLinecap="round" />
      <circle cx="12" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
