import { useState, type ReactNode } from 'react';
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
  html: string;
  verification?: Verification;
}

/** A lesson in the order a good teacher would give it: question, prediction, experiment, explanation, summary. */
export function LessonView({ plan, html, verification }: LessonViewProps) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { prediction } = plan;
  const correct = choice === prediction.answerIndex;
  const fullyVerified = verification && verification.passed === verification.total;

  return (
    <article className="flex flex-col gap-12 pb-10 pt-4">
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
        {!revealed && (
          <Button onClick={() => setRevealed(true)} disabled={choice === null}>
            {t('lesson.reveal')}
          </Button>
        )}
      </Section>

      {revealed && (
        <>
          <Section label={t('lesson.experimentLabel')}>
            <p className="text-muted">{t('lesson.experimentHint')}</p>
            <SimulationFrame html={html} title={plan.title} />
            {verification && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <span className={cx('size-2 rounded-full', fullyVerified ? 'bg-ink' : 'bg-accent')} aria-hidden />
                {t(fullyVerified ? 'lesson.verified' : 'lesson.partiallyVerified', { passed: verification.passed, total: verification.total })}
              </p>
            )}
          </Section>

          <div className="flex flex-col gap-2 rounded-2xl bg-surface px-5 py-5 border border-line">
            <p className="font-medium">{correct ? t('lesson.correct') : t('lesson.incorrect')}</p>
            <p className="leading-relaxed text-muted">{prediction.explanation}</p>
          </div>

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

          <Section label={t('lesson.stepsLabel')}>
            <ol className="flex flex-col gap-6">
              {plan.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

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
        </>
      )}
    </article>
  );
}
