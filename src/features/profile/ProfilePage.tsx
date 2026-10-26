import type { ReactNode } from 'react';
import { useSession } from '@/app/SessionProvider';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/Button';
import { useI18n, type MessageKey } from '@/i18n';
import { countryName } from './countryName';
import { INTERESTS, type Level } from './types';

const LEVEL_KEYS: Record<Level, MessageKey> = {
  primary: 'onboarding.level.primary',
  lower_secondary: 'onboarding.level.lowerSecondary',
  upper_secondary: 'onboarding.level.upperSecondary',
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-medium sm:text-right">{children}</span>
    </div>
  );
}

export function ProfilePage() {
  const { t, language } = useI18n();
  const { profile, user, mode, signOut } = useSession();
  if (!profile) return null;

  const learningLanguage = new Intl.DisplayNames([language], { type: 'language' }).of(profile.learningLanguage) ?? profile.learningLanguage;
  const interests = profile.interests
    .map((interest) => ((INTERESTS as readonly string[]).includes(interest) ? t(`options.interests.${interest as (typeof INTERESTS)[number]}`) : interest))
    .join(', ');

  return (
    <Page title={t('profile.title')}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          <Row label={t('onboarding.name.placeholder')}>{profile.firstName}</Row>
          <Row label={t('profile.level')}>{profile.levels.map((level) => t(LEVEL_KEYS[level])).join(', ')}</Row>
          <Row label={t('profile.place')}>
            {[profile.city, countryName(profile.country, language)].filter(Boolean).join(', ')}
          </Row>
          <Row label={t('profile.learningLanguage')}>{learningLanguage.charAt(0).toUpperCase() + learningLanguage.slice(1)}</Row>
          {interests && <Row label={t('profile.interests')}>{interests}</Row>}
          <Row label={t('profile.interfaceLanguage')}>
            <LanguageSwitch />
          </Row>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{mode === 'account' ? `${t('profile.account')} : ${user?.email ?? ''}` : t('profile.guest')}</p>
          <Button variant="secondary" onClick={signOut}>
            {t('home.signOut')}
          </Button>
        </div>
      </div>
    </Page>
  );
}
