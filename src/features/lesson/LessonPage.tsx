import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { learnerFromProfile } from './api';
import { LessonView } from './LessonView';
import { useLessonPipeline, type PipelineStage } from './useLessonPipeline';

const STAGES: PipelineStage[] = ['planning', 'building', 'verifying'];

export function LessonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { profile } = useSession();
  const learner = useMemo(() => (profile ? learnerFromProfile(profile) : null), [profile]);
  const { lesson, stage, checks, retry } = useLessonPipeline(id, learner);

  if (!lesson) return <Navigate to="/" replace />;

  return (
    <Screen header={<BackButton to="/" />}>
      {lesson.status === 'ready' && lesson.plan && lesson.html ? (
        <LessonView plan={lesson.plan} html={lesson.html} verification={lesson.verification} />
      ) : lesson.status === 'failed' ? (
        <FailedView onRetry={retry} />
      ) : (
        <PreparingView stage={stage} checks={checks} />
      )}
    </Screen>
  );
}

function PreparingView({ stage, checks }: { stage: PipelineStage | null; checks: { passed: number; total: number } | null }) {
  const { t } = useI18n();
  const activeIndex = stage === 'repairing' ? 2 : stage ? STAGES.indexOf(stage) : 0;

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-10" aria-live="polite">
      <div className="flex flex-col gap-3">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{t('lesson.preparingTitle')}</h1>
        <p className="leading-relaxed text-muted text-pretty">{t('lesson.preparingHint')}</p>
      </div>
      <ol className="flex flex-col gap-5">
        {STAGES.map((item, index) => {
          const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
          const label = item === 'verifying' && stage === 'repairing' ? t('lesson.stages.repairing') : t(`lesson.stages.${item}`);
          return (
            <li key={item} className="flex items-center gap-4">
              <span
                className={cx(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  state === 'done' && 'border-ink bg-ink text-paper',
                  state === 'active' && 'border-ink text-ink',
                  state === 'pending' && 'border-line text-subtle',
                )}
              >
                {state === 'done' ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === 'active' ? (
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex flex-col">
                <span className={cx('text-[15px]', state === 'pending' ? 'text-subtle' : 'text-ink', state === 'active' && 'font-medium')}>
                  {label}
                </span>
                {item === 'verifying' && checks && state === 'active' && (
                  <span className="text-sm text-muted">{t('lesson.checks', checks)}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FailedView({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{t('lesson.failedTitle')}</h1>
        <p className="leading-relaxed text-muted">{t('lesson.failedHint')}</p>
      </div>
      <Button onClick={onRetry}>{t('lesson.retry')}</Button>
    </div>
  );
}
