import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useI18n, type MessageKey } from '@/i18n';

const VIDEO_ID = '0cZhsouVcNI';
const REPOSITORY = 'https://github.com/dekensruz/whybox';
const PORTFOLIO = 'https://portfoliodek.netlify.app/';

const STEPS: Array<[MessageKey, MessageKey]> = [
  ['landing.step1Title', 'landing.step1Text'],
  ['landing.step2Title', 'landing.step2Text'],
  ['landing.step3Title', 'landing.step3Text'],
  ['landing.step4Title', 'landing.step4Text'],
];

const MODELS: Array<[string, MessageKey]> = [
  ['Muse Spark', 'landing.modelSpark'],
  ['Muse Wonder', 'landing.modelWonder'],
  ['Muse Image', 'landing.modelImage'],
  ['Muse Voice', 'landing.modelVoice'],
  ['SAM 3.1', 'landing.modelSam'],
  ['Muse Spark Open', 'landing.modelOpen'],
];

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10 lg:py-24">
      <div className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">{eyebrow}</p>
        <h2 className="text-[30px] font-semibold leading-tight tracking-tight text-balance lg:text-[38px]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** A real screen of the app, framed like a window. */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_50px_rgba(20,22,26,0.08)]">
      <img src={src} alt={alt} loading="lazy" className="w-full" />
    </figure>
  );
}

/** The public page: what Whybox is, shown with the app itself, and a way in without an account. */
export function WelcomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { continueAsGuest } = useSession();
  const tryNow = () => {
    continueAsGuest();
    navigate('/onboarding');
  };

  const actions = (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button onClick={tryNow}>{t('landing.tryNow')}</Button>
      <Button variant="secondary" onClick={() => navigate('/auth')}>
        {t('welcome.start')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 lg:px-10">
        <Logo />
        <div className="flex items-center gap-4">
          <LanguageSwitch />
          <button type="button" onClick={() => navigate('/auth?mode=signin')} className="text-sm font-medium text-muted hover:text-ink">
            {t('landing.signIn')}
          </button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1fr_1.05fr] lg:px-10 lg:pb-24 lg:pt-12">
        <div className="flex flex-col gap-6">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight text-balance lg:text-[56px]">
            {t('landing.title')} <span className="text-accent">{t('landing.titleAccent')}</span>
          </h1>
          <p className="max-w-xl text-[18px] leading-relaxed text-muted text-pretty">{t('landing.subtitle')}</p>
          {actions}
        </div>
        <img src="/landing/hero.jpg" alt="" className="w-full rounded-3xl" />
      </section>

      <div className="border-y border-line bg-surface">
        <Section eyebrow={t('landing.whyEyebrow')} title={t('landing.whyTitle')}>
          <p className="max-w-3xl text-[18px] leading-relaxed text-muted">{t('landing.whyText')}</p>
        </Section>
      </div>

      <Section eyebrow={t('landing.transformEyebrow')} title={t('landing.transformTitle')}>
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_auto_1.2fr]">
          <Shot src="/landing/notebook.jpg" alt={t('landing.notebookAlt')} />
          <span aria-hidden className="justify-self-center rotate-90 text-[32px] text-accent lg:rotate-0">→</span>
          <Shot src="/landing/circuit.jpg" alt={t('landing.circuitAlt')} />
        </div>
      </Section>

      <div className="border-y border-line bg-surface">
        <Section eyebrow={t('landing.howEyebrow')} title={t('landing.howTitle')}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], index) => (
              <li key={title} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{index + 1}</span>
                <p className="text-[18px] font-semibold">{t(title)}</p>
                <p className="leading-relaxed text-muted">{t(text)}</p>
              </li>
            ))}
          </ol>
          <div className="grid gap-6 lg:grid-cols-2">
            <Shot src="/landing/stars.jpg" alt={t('landing.starsAlt')} />
            <Shot src="/landing/earth.jpg" alt={t('landing.earthAlt')} />
          </div>
        </Section>
      </div>

      <Section eyebrow={t('landing.videoEyebrow')} title={t('landing.videoTitle')}>
        <div className="aspect-video overflow-hidden rounded-3xl border border-line bg-ink">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
            title={t('landing.videoTitle')}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Section>

      <div className="border-y border-line bg-surface">
        <Section eyebrow={t('landing.modelsEyebrow')} title={t('landing.modelsTitle')}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODELS.map(([name, role]) => (
              <li key={name} className="flex gap-4 rounded-2xl border border-line bg-paper p-5">
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="mt-1 block leading-relaxed text-muted">{t(role)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 lg:px-10">
        <h2 className="max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-balance lg:text-[38px]">{t('landing.closing')}</h2>
        {actions}
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted sm:flex-row sm:justify-between lg:px-10">
          <p>
            {t('landing.footerBefore')}{' '}
            <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
              Dekens Ruzuba
            </a>
            {t('landing.footerAfter')}
          </p>
          <a href={REPOSITORY} className="font-medium text-ink hover:underline">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
