import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import type { PipelineStage } from './useLessonPipeline';

const STAGES = ['planning', 'building', 'verifying', 'reviewing'] as const;

interface PreparationProgressProps {
  stage: PipelineStage | null;
  checks: { passed: number; total: number } | null;
  /** Whether the lesson plan already exists (the first stage is then done). */
  planned: boolean;
}

/** The stages of a lesson being prepared, as a checklist the learner can follow. */
export function PreparationProgress({ stage, checks, planned }: PreparationProgressProps) {
  const { t } = useI18n();
  const activeIndex = stage === 'repairing' ? STAGES.indexOf('reviewing') : stage ? STAGES.indexOf(stage) : planned ? 1 : 0;

  return (
    <ol className="flex flex-col gap-5" aria-live="polite">
      {STAGES.map((item, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
        const label = item === 'reviewing' && stage === 'repairing' ? t('lesson.stages.repairing') : t(`lesson.stages.${item}`);
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
              {item === 'verifying' && checks && state === 'active' && <span className="text-sm text-muted">{t('lesson.checks', checks)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
