import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/features/profile/types';
import { useI18n } from '@/i18n';
import { STEPS_BY_ROLE, type Draft, type StepId } from './steps';
import { StepContent } from './StepContent';

const initialDraft = (language: string): Draft => ({
  role: undefined,
  firstName: '',
  levels: [],
  country: '',
  city: '',
  learningLanguage: language,
  interests: [],
  subjects: [],
  deviceUsage: undefined,
});

const isComplete = (step: StepId, draft: Draft): boolean => {
  switch (step) {
    case 'role':
      return Boolean(draft.role);
    case 'name':
      return draft.firstName.trim().length > 0;
    case 'level':
      return draft.levels.length > 0;
    case 'place':
      return Boolean(draft.country) && draft.city.trim().length > 0;
    case 'language':
      return Boolean(draft.learningLanguage);
    case 'interests':
      return draft.interests.length > 0;
    case 'subjects':
      return draft.role === 'student' || draft.subjects.length > 0;
    case 'device':
      return Boolean(draft.deviceUsage);
    case 'done':
      return true;
  }
};

export function OnboardingPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { updateProfile } = useSession();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(language));
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const steps = useMemo(() => STEPS_BY_ROLE[draft.role ?? 'student'], [draft.role]);
  const step = steps[index];
  const questionCount = steps.length - 1;

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const next = async () => {
    if (step !== 'done') {
      setIndex((current) => current + 1);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      await updateProfile({ ...draft, firstName: draft.firstName.trim(), city: draft.city.trim() } as Profile);
      navigate('/', { replace: true });
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={
        step !== 'done' && (
          <div className="flex w-full items-center gap-4">
            <button
              type="button"
              onClick={() => (index === 0 ? navigate(-1) : setIndex(index - 1))}
              className="-ml-2 flex size-10 items-center justify-center rounded-full text-muted hover:text-ink"
              aria-label={t('common.back')}
            >
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={questionCount}
              aria-valuenow={index + 1}
              aria-label={t('onboarding.step', { current: index + 1, total: questionCount })}
            >
              <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${((index + 1) / questionCount) * 100}%` }} />
            </div>
          </div>
        )
      }
      footer={
        <div className="flex flex-col gap-3">
          {saveFailed && (
            <p role="alert" className="text-center text-sm text-danger">
              {t('auth.errors.unknown')}
            </p>
          )}
          <Button block onClick={next} disabled={!isComplete(step, draft) || saving}>
            {step === 'done' ? t('onboarding.done.cta') : t('common.continue')}
          </Button>
        </div>
      }
    >
      <div key={step} className="flex flex-1 flex-col pt-8">
        <StepContent step={step} draft={draft} update={update} />
      </div>
    </Screen>
  );
}
