import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import type { RealExperimentResult, Understanding } from '@shared/lesson';
import { useSession } from '@/app/SessionProvider';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { learnerFromProfile, requestCounterTour } from './api';
import { LessonView } from './LessonView';
import { PreparationProgress } from './PreparationProgress';
import { useLessonPipeline } from './useLessonPipeline';

export function LessonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { profile } = useSession();
  const learner = useMemo(() => (profile ? learnerFromProfile(profile) : null), [profile]);
  const { lesson, stage, checks, retry, update } = useLessonPipeline(id, learner);
  const counterRequested = useRef(false);

  const plan = lesson?.plan;
  const outcome = lesson?.outcome;

  // A wrong prediction gets its own short tour, prepared while the experiment is still being built.
  useEffect(() => {
    if (!plan || !learner || !outcome || outcome.predictionCorrect || lesson?.counter !== undefined || counterRequested.current) return;
    counterRequested.current = true;
    requestCounterTour(plan, learner, plan.prediction.options[outcome.chosen])
      .then((counter) => update({ counter }))
      .catch(() => update({ counter: null }));
  }, [plan, learner, outcome, lesson?.counter, update]);

  const onPredict = useCallback(
    (chosen: number) => plan && update({ outcome: { chosen, predictionCorrect: chosen === plan.prediction.answerIndex } }),
    [plan, update],
  );
  const onTourComplete = useCallback(() => outcome && update({ outcome: { ...outcome, tourCompleted: true } }), [outcome, update]);
  const onUnderstanding = useCallback(
    (understanding: Understanding) => outcome && update({ outcome: { ...outcome, understanding } }),
    [outcome, update],
  );

  const onRealResult = useCallback(
    (realExperiment: RealExperimentResult & { objectSizeCm: number }) => update({ realExperiment }),
    [update],
  );

  if (!lesson) return <Navigate to="/" replace />;

  const ready = lesson.status === 'ready';
  const progress = <PreparationProgress stage={stage} checks={checks} planned={Boolean(plan)} />;

  return (
    <Screen header={<BackButton to="/" />}>
      {lesson.status === 'failed' ? (
        <div className="flex flex-1 flex-col justify-center gap-6 py-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{t('lesson.failedTitle')}</h1>
            <p className="leading-relaxed text-muted">{t('lesson.failedHint')}</p>
          </div>
          <Button onClick={retry}>{t('lesson.retry')}</Button>
        </div>
      ) : plan ? (
        // As soon as the lesson is planned, the learner starts thinking while the experiment is built and checked.
        <LessonView
          plan={plan}
          html={ready ? lesson.html : undefined}
          verification={lesson.verification}
          language={learner?.language ?? 'en'}
          preparation={progress}
          outcome={outcome}
          counter={lesson.counter}
          onPredict={onPredict}
          onTourComplete={onTourComplete}
          onUnderstanding={onUnderstanding}
          learner={learner}
          realExperiment={lesson.realExperiment}
          onRealResult={onRealResult}
        />
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
