import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { learnerFromProfile } from './api';
import { LessonView } from './LessonView';
import { PreparationProgress } from './PreparationProgress';
import { useLessonPipeline } from './useLessonPipeline';

export function LessonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { profile } = useSession();
  const learner = useMemo(() => (profile ? learnerFromProfile(profile) : null), [profile]);
  const { lesson, stage, checks, retry } = useLessonPipeline(id, learner);

  if (!lesson) return <Navigate to="/" replace />;

  const ready = lesson.status === 'ready';
  const failed = lesson.status === 'failed';
  const progress = <PreparationProgress stage={stage} checks={checks} planned={Boolean(lesson.plan)} />;

  return (
    <Screen header={<BackButton to="/" />}>
      {failed ? (
        <div className="flex flex-1 flex-col justify-center gap-6 py-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{t('lesson.failedTitle')}</h1>
            <p className="leading-relaxed text-muted">{t('lesson.failedHint')}</p>
          </div>
          <Button onClick={retry}>{t('lesson.retry')}</Button>
        </div>
      ) : lesson.plan ? (
        // As soon as the lesson is planned, the learner starts thinking while the experiment is built and checked.
        <LessonView plan={lesson.plan} html={ready ? lesson.html : undefined} verification={lesson.verification} preparation={progress} />
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-10 py-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{t('lesson.preparingTitle')}</h1>
            <p className="leading-relaxed text-muted text-pretty">{t('lesson.preparingHint')}</p>
          </div>
          {progress}
        </div>
      )}
    </Screen>
  );
}
