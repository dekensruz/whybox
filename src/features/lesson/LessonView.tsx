import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CounterTour, LearnerContext, LessonPlan, RealExperimentResult, TourStep, Understanding } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { RealExperiment } from './real/RealExperiment';
import { SimulationFrame } from './SimulationFrame';
import type { LessonOutcome, Verification } from './types';

function Section({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('flex flex-col gap-4', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{label}</h2>
      {children}
    </section>
  );
}

const UNDERSTANDINGS: Array<{ value: Understanding; key: 'lesson.understandingClear' | 'lesson.understandingPartly' | 'lesson.understandingLost' }> = [
  { value: 'clear', key: 'lesson.understandingClear' },
  { value: 'partly', key: 'lesson.understandingPartly' },
  { value: 'lost', key: 'lesson.understandingLost' },
];

interface LessonViewProps {
  plan: LessonPlan;
  /** Missing while the experiment is still being built and checked. */
  html?: string;
  verification?: Verification;
  /** Language the lesson is written in, for number formatting in the experiment. */
  language: string;
  /** Progress shown in place of the experiment until it is ready. */
  preparation?: ReactNode;
  outcome?: LessonOutcome;
  /** Tour against the learner's wrong prediction: undefined while it is being prepared, null if unavailable. */
  counter?: CounterTour | null;
  onPredict: (chosen: number) => void;
  onTourComplete: () => void;
  onUnderstanding: (understanding: Understanding) => void;
  learner: LearnerContext | null;
  realExperiment?: RealExperimentResult & { objectSizeCm: number };
  onRealResult: (result: RealExperimentResult & { objectSizeCm: number }) => void;
}

type TourEntry = TourStep & { againstIdea: boolean };

/**
 * A lesson in the order a good teacher would give it: a question, a prediction,
 * then a guided tour of the experiment (starting with the learner's own wrong idea, if any),
 * and finally the words, an example, what to remember, and how well it was understood.
 */
export function LessonView(props: LessonViewProps) {
  const { plan, html, verification, language, preparation, outcome, counter, onPredict, onTourComplete, onUnderstanding } = props;
  const { learner, realExperiment, onRealResult } = props;
  const { t } = useI18n();
  const [choice, setChoice] = useState<number | null>(outcome?.chosen ?? null);
  const [stepIndex, setStepIndex] = useState(0);
  const revealed = Boolean(outcome);
  const { prediction } = plan;
  const correct = outcome?.predictionCorrect ?? false;
  const fullyVerified = verification && verification.passed === verification.total;

  const tour = useMemo<TourEntry[]>(
    () => [
      ...(!correct && counter ? counter.steps.map((step) => ({ ...step, againstIdea: true })) : []),
      ...plan.steps.map((step) => ({ ...step, againstIdea: false })),
    ],
    [plan, counter, correct],
  );

  // Each step starts from the defaults so that only what the step changes is visible.
  const defaults = useMemo(
    () => Object.fromEntries(plan.simulation.parameters.map((parameter) => [parameter.name, parameter.default])),
    [plan],
  );
  const step = tour[Math.min(stepIndex, tour.length - 1)];
  const stepState = useMemo(() => ({ ...defaults, ...step.parameters }), [defaults, step]);
  const lastStep = stepIndex >= tour.length - 1;

  useEffect(() => {
    if (html && lastStep && outcome && !outcome.tourCompleted) onTourComplete();
  }, [html, lastStep, outcome, onTourComplete]);

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
            {!correct && counter && <p className="mt-2 border-l-2 border-accent pl-3 leading-relaxed">{counter.intro}</p>}
            {!correct && counter === undefined && <p className="mt-2 text-sm text-subtle">{t('lesson.counterPreparing')}</p>}
          </div>
        ) : (
          <Button onClick={() => choice !== null && onPredict(choice)} disabled={choice === null}>
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
            <SimulationFrame html={html} plan={plan} language={language} state={stepState} />
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

          {plan.homeExperiment && learner && (
            <Section label={t('lesson.real.label')}>
              <RealExperiment plan={plan} experiment={plan.homeExperiment} learner={learner} saved={realExperiment} onResult={onRealResult} />
            </Section>
          )}

          <Section label={t('lesson.understandingQuestion')}>
            {outcome?.understanding ? (
              <p className="leading-relaxed text-muted">{t('lesson.understandingThanks')}</p>
            ) : (
              <div role="radiogroup" className="flex flex-col gap-3">
                {UNDERSTANDINGS.map(({ value, key }) => (
                  <ChoiceCard key={value} title={t(key)} selected={false} onSelect={() => onUnderstanding(value)} />
                ))}
              </div>
            )}
          </Section>

          {/* The guided tour stays on screen while the learner looks at the experiment. */}
          <aside
            aria-live="polite"
            className="sticky bottom-0 -mx-6 mt-auto border-t border-line bg-paper/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur"
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">
                {step.againstIdea && <span className="text-ink">{t('lesson.testIdeaLabel')} · </span>}
                {t('lesson.stepOf', { current: stepIndex + 1, total: tour.length })}
              </p>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="leading-relaxed text-muted">{step.text}</p>
              {step.observe && <p className="border-l-2 border-accent pl-3 text-[15px] font-medium leading-relaxed">{step.observe}</p>}
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
