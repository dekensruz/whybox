import { useNavigate } from 'react-router-dom';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { CircuitIllustration } from './CircuitIllustration';

export function WelcomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Screen
      header={
        <>
          <Logo />
          <LanguageSwitch />
        </>
      }
      footer={
        <div className="flex flex-col gap-3">
          <Button block onClick={() => navigate('/auth')}>
            {t('welcome.start')}
          </Button>
          <Button block variant="ghost" onClick={() => navigate('/auth')}>
            {t('welcome.haveAccount')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-10 py-8">
        <CircuitIllustration className="mx-auto w-full max-w-72" />
        <div className="flex flex-col gap-4">
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-balance">{t('welcome.title')}</h1>
          <p className="text-base leading-relaxed text-muted text-pretty">{t('welcome.subtitle')}</p>
        </div>
      </div>
    </Screen>
  );
}
