import { useMemo, useState, type ReactNode } from 'react';
import type { LessonPlan } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { SimulationFrame } from './SimulationFrame';
import type { Verification } from './types';

function Section({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('flex flex-col gap-4', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{label}</h2>
      {children}
    </section>
  );
}

interface LessonViewProps {
  plan: LessonPlan;
  /** Missing while the experiment is still being built and checked. */
  html?: string;
  verification?: Verification;
  /** Progress shown in place of the experiment until it is ready. */
  preparation?: ReactNode;
}

/**
 * A lesson in the order a good teacher would give it: a question, a prediction,
 * then a guided tour of the experiment, and finally the words, an example and what to remember.
 */
export function LessonView({ plan, html, verification, preparation }: LessonViewProps) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { prediction, steps } = plan;
  const correct = choice === prediction.answerIndex;
  const fullyVerified = verification && verification.passed === verification.total;

  // Each step starts from the defaults so that only what the step changes is visible.
  const defaults = useMemo(
    () => Object.fromEntries(plan.simulation.parameters.map((parameter) => [parameter.name, parameter.default])),
    [plan],
  );
  const step = steps[stepIndex];
  const stepState = useMemo(() => ({ ...defaults, ...step.parameters }), [defaults, step]);
  const lastStep = stepIndex === steps.length - 1;

  return (
    <article className="flex flex-col gap-12 pt-4">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">{plan.title}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">{plan.hook}</h1>
      </header>

      <Section label={t('lesson.predictionLabel')}>
        <p className="text-[17px] leading-relaxed">{prediction.question}</p>
        <div role="radiogroup" className="flex flex-col gap-3">
          {prediction.options.map((option, index) => (
            <ChoiceCard key={index} title={option} selected={choice === index} onSelect={() => !revealed && setChoice(index)} />
          ))}
        </div>
        {revealed ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-5">
            <p className="font-medium">{correct ? t('lesson.correct') : t('lesson.incorrect')}</p>
            <p className="leading-relaxed text-muted">{prediction.explanation}</p>
          </div>
        ) : (
          <Button onClick={() => setRevealed(true)} disabled={choice === null}>
            {t('lesson.reveal')}
          </Button>
        )}
      </Section>

      {revealed && !html && (
        <Section label={t('lesson.experimentLabel')}>
          <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface px-5 py-6">
            <p className="leading-relaxed text-muted">{t('lesson.buildingWhileYouThink')}</p>
            {preparation}
          </div>
        </Section>
      )}

      {revealed && html && (
        <>
          <Section label={t('lesson.experimentLabel')}>
            <SimulationFrame html={html} title={plan.title} state={stepState} />
            {verification && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <span className={cx('size-2 rounded-full', fullyVerified ? 'bg-ink' : 'bg-accent')} aria-hidden />
                {t(fullyVerified ? 'lesson.verified' : 'lesson.partiallyVerified', { passed: verification.passed, total: verification.total })}
              </p>
            )}
          </Section>

          {plan.concepts.length > 0 && (
            <Section label={t('lesson.conceptsLabel')}>
              <dl className="flex flex-col divide-y divide-line">
                {plan.concepts.map((concept) => (
                  <div key={concept.term} className="flex flex-col gap-1.5 py-4 first:pt-0">
                    <dt className="font-semibold">{concept.term}</dt>
                    <dd className="leading-relaxed">{concept.definition}</dd>
                    <dd className="leading-relaxed text-muted">{concept.analogy}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          <Section label={t('lesson.exampleLabel')}>
            <p className="leading-relaxed">{plan.example.statement}</p>
            <div className="rounded-2xl border border-line bg-surface px-5 py-4">
              <p className="mb-1.5 text-sm font-medium text-muted">{t('lesson.solutionLabel')}</p>
              <p className="whitespace-pre-line leading-relaxed">{plan.example.solution}</p>
            </div>
          </Section>

          <Section label={t('lesson.summaryLabel')}>
            <p className="border-l-2 border-accent pl-4 text-[17px] font-medium leading-relaxed">{plan.summary}</p>
          </Section>

          {/* The guided tour stays on screen while the learner looks at the experiment. */}
          <aside
            aria-live="polite"
            className="sticky bottom-0 -mx-6 mt-auto border-t border-line bg-paper/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur"
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                {t('lesson.stepOf', { current: stepIndex + 1, total: steps.length })}
              </p>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="leading-relaxed text-muted">{step.text}</p>
              {step.observe && (
                <p className="border-l-2 border-accent pl-3 text-[15px] font-medium leading-relaxed">{step.observe}</p>
              )}
              {lastStep && <p className="text-sm text-subtle">{t('lesson.explore')}</p>}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" className="flex-1" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}>
                {t('lesson.previous')}
              </Button>
              <Button className="flex-1" disabled={lastStep} onClick={() => setStepIndex(stepIndex + 1)}>
                {t('lesson.next')}
              </Button>
            </div>
          </aside>
        </>
      )}
    </article>
  );
}
