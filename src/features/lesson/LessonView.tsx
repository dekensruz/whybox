import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CounterTour, LearnerContext, LessonPlan, RealExperimentResult, TourStep, Understanding } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { RealExperiment } from './real/RealExperiment';
import { SimulationFrame } from './SimulationFrame';
import type { LessonOutcome, Verification } from './types';

const UNDERSTANDINGS: Array<{ value: Understanding; key: 'lesson.understandingClear' | 'lesson.understandingPartly' | 'lesson.understandingLost' }> = [
  { value: 'clear', key: 'lesson.understandingClear' },
  { value: 'partly', key: 'lesson.understandingPartly' },
  { value: 'lost', key: 'lesson.understandingLost' },
];

const SWIPE_DISTANCE = 60;

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

type Slide =
  | { kind: 'hook' }
  | { kind: 'predict' }
  | { kind: 'reveal' }
  | { kind: 'step'; index: number }
  | { kind: 'concept'; index: number }
  | { kind: 'example' }
  | { kind: 'summary' }
  | { kind: 'real' }
  | { kind: 'end' };

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{children}</p>;
}

/**
 * A lesson as a sequence of cards, one idea at a time, to swipe through: the question, the learner's prediction,
 * the reveal, a guided tour of the experiment (starting with the learner's own wrong idea, if any),
 * then the key words, an example, what to remember, the real experiment and how well it was understood.
 */
export function LessonView(props: LessonViewProps) {
  const { plan, html, verification, language, preparation, outcome, counter, onPredict, onTourComplete, onUnderstanding } = props;
  const { learner, realExperiment, onRealResult } = props;
  const { t } = useI18n();
  const navigate = useNavigate();
  const [choice, setChoice] = useState<number | null>(outcome?.chosen ?? null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [solutionShown, setSolutionShown] = useState(false);
  const correct = outcome?.predictionCorrect ?? false;

  const tour = useMemo<TourEntry[]>(
    () => [
      ...(!correct && counter ? counter.steps.map((step) => ({ ...step, againstIdea: true })) : []),
      ...plan.steps.map((step) => ({ ...step, againstIdea: false })),
    ],
    [plan, counter, correct],
  );

  const slides = useMemo<Slide[]>(
    () => [
      { kind: 'hook' },
      { kind: 'predict' },
      { kind: 'reveal' },
      ...tour.map((_, step): Slide => ({ kind: 'step', index: step })),
      ...plan.concepts.map((_, concept): Slide => ({ kind: 'concept', index: concept })),
      { kind: 'example' },
      { kind: 'summary' },
      ...(plan.homeExperiment && learner ? [{ kind: 'real' } as Slide] : []),
      { kind: 'end' },
    ],
    [tour, plan, learner],
  );
  const slide = slides[Math.min(index, slides.length - 1)];

  // The experiment keeps the state of the last step seen, so it does not jump when leaving the tour.
  const defaults = useMemo(
    () => Object.fromEntries(plan.simulation.parameters.map((parameter) => [parameter.name, parameter.default])),
    [plan],
  );
  const [tourIndex, setTourIndex] = useState(0);
  useEffect(() => {
    if (slide.kind === 'step') setTourIndex(slide.index);
  }, [slide]);
  const step = tour[Math.min(tourIndex, tour.length - 1)];
  const stepState = useMemo(() => ({ ...defaults, ...step.parameters }), [defaults, step]);

  useEffect(() => {
    if (slide.kind === 'step' && slide.index === tour.length - 1 && outcome && !outcome.tourCompleted) onTourComplete();
  }, [slide, tour.length, outcome, onTourComplete]);

  // Going forward is held back where the learner has something to do first.
  const canGoForward =
    index < slides.length - 1 && !(slide.kind === 'predict' && !outcome) && !(slide.kind === 'step' && !html);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= slides.length) return;
      setDirection(next > index ? 'forward' : 'back');
      setIndex(next);
      window.scrollTo({ top: 0 });
    },
    [index, slides.length],
  );
  const forward = () => {
    if (slide.kind === 'predict' && !outcome) {
      if (choice === null) return;
      onPredict(choice);
      setDirection('forward');
      setIndex(index + 1);
      return;
    }
    if (canGoForward) go(index + 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight' && canGoForward) go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, canGoForward]);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && canGoForward) go(index + 1);
    if (dx > 0) go(index - 1);
  };

  const primaryLabel =
    slide.kind === 'hook'
      ? t('lesson.start')
      : slide.kind === 'predict' && !outcome
        ? t('lesson.validate')
        : slide.kind === 'end'
          ? t('lesson.finish')
          : t('lesson.next');
  const primaryDisabled = slide.kind === 'end' ? false : slide.kind === 'predict' && !outcome ? choice === null : !canGoForward;
  const onPrimary = () => (slide.kind === 'end' ? navigate('/') : forward());
  const isStep = slide.kind === 'step';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-paper/95 px-6 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur lg:px-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          aria-label={t('lesson.close')}
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
          </svg>
        </button>
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={slides.length}
          aria-valuenow={index + 1}
          aria-label={plan.title}
        >
          {slides.map((_, position) => (
            <span key={position} className={cx('h-1 flex-1 rounded-full transition-colors', position <= index ? 'bg-ink' : 'bg-line')} />
          ))}
        </div>
      </header>

      <main
        className={cx('mx-auto flex w-full flex-1 flex-col px-6 py-6 lg:px-10', isStep ? 'max-w-5xl' : 'max-w-xl')}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* The experiment stays loaded across the tour, so swiping between steps only moves it. */}
        {html && (
          <div className={cx(isStep ? 'grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start' : 'hidden')}>
            <div className="order-2 lg:order-1">
              <SimulationFrame html={html} plan={plan} language={language} state={stepState} />
            </div>
            {isStep && (
              <div key={index} className={cx('order-1 flex flex-col gap-3 lg:order-2 lg:sticky lg:top-24', direction === 'forward' ? 'slide-from-right' : 'slide-from-left')}>
                <Eyebrow>
                  {step.againstIdea && <span className="text-ink">{t('lesson.testIdeaLabel')} · </span>}
                  {t('lesson.stepOf', { current: slide.index + 1, total: tour.length })}
                </Eyebrow>
                <h2 className="text-[22px] font-semibold leading-tight tracking-tight">{step.title}</h2>
                <p className="leading-relaxed text-muted">{step.text}</p>
                {step.observe && <p className="border-l-2 border-accent pl-3 font-medium leading-relaxed">{step.observe}</p>}
                {slide.index === tour.length - 1 && <p className="text-sm text-subtle">{t('lesson.explore')}</p>}
                {slide.index === tour.length - 1 && verification && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <span className={cx('size-2 rounded-full', verification.passed === verification.total ? 'bg-ink' : 'bg-accent')} aria-hidden />
                    {t(verification.passed === verification.total ? 'lesson.verified' : 'lesson.partiallyVerified', {
                      passed: verification.passed,
                      total: verification.total,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!isStep && (
          <div key={index} className={cx('flex flex-1 flex-col', direction === 'forward' ? 'slide-from-right' : 'slide-from-left')}>
            {slide.kind === 'hook' && (
              <div className="flex flex-1 flex-col justify-center gap-4 py-10">
                <Eyebrow>{plan.title}</Eyebrow>
                <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-balance lg:text-[40px]">{plan.hook}</h1>
                <p className="text-sm text-subtle">{t('lesson.swipeHint')}</p>
              </div>
            )}

            {slide.kind === 'predict' && (
              <div className="flex flex-col gap-6 py-4">
                <Eyebrow>{t('lesson.predictionLabel')}</Eyebrow>
                <h2 className="text-[24px] font-semibold leading-snug tracking-tight text-balance">{plan.prediction.question}</h2>
                <div role="radiogroup" className="flex flex-col gap-3">
                  {plan.prediction.options.map((option, position) => (
                    <ChoiceCard key={position} title={option} selected={choice === position} onSelect={() => !outcome && setChoice(position)} />
                  ))}
                </div>
              </div>
            )}

            {slide.kind === 'reveal' && (
              <div className="flex flex-1 flex-col justify-center gap-5 py-10">
                <Eyebrow>{t('lesson.predictionLabel')}</Eyebrow>
                <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">
                  {correct ? t('lesson.correct') : t('lesson.incorrect')}
                </h2>
                <p className="text-[17px] leading-relaxed text-muted">{plan.prediction.explanation}</p>
                {!correct && counter && <p className="border-l-2 border-accent pl-4 text-[17px] leading-relaxed">{counter.intro}</p>}
                {!correct && counter === undefined && <p className="text-sm text-subtle">{t('lesson.counterPreparing')}</p>}
              </div>
            )}

            {slide.kind === 'concept' && (
              <div className="flex flex-1 flex-col justify-center gap-4 py-10">
                <Eyebrow>{t('lesson.conceptsLabel')}</Eyebrow>
                <h2 className="text-[30px] font-semibold leading-tight tracking-tight">{plan.concepts[slide.index].term}</h2>
                <p className="text-[18px] leading-relaxed">{plan.concepts[slide.index].definition}</p>
                <p className="border-l-2 border-accent pl-4 text-[17px] leading-relaxed text-muted">{plan.concepts[slide.index].analogy}</p>
              </div>
            )}

            {slide.kind === 'example' && (
              <div className="flex flex-col gap-5 py-6">
                <Eyebrow>{t('lesson.exampleLabel')}</Eyebrow>
                <p className="text-[19px] leading-relaxed">{plan.example.statement}</p>
                {solutionShown ? (
                  <div className="slide-from-right rounded-2xl border border-line bg-surface px-5 py-4">
                    <p className="mb-1.5 text-sm font-medium text-muted">{t('lesson.solutionLabel')}</p>
                    <p className="whitespace-pre-line leading-relaxed">{plan.example.solution}</p>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setSolutionShown(true)}>
                    {t('lesson.showSolution')}
                  </Button>
                )}
              </div>
            )}

            {slide.kind === 'summary' && (
              <div className="flex flex-1 flex-col justify-center gap-5 py-10">
                <Eyebrow>{t('lesson.summaryLabel')}</Eyebrow>
                <p className="border-l-4 border-accent pl-5 text-[26px] font-semibold leading-snug tracking-tight text-balance">{plan.summary}</p>
              </div>
            )}

            {slide.kind === 'real' && plan.homeExperiment && learner && (
              <div className="flex flex-col gap-4 py-4">
                <Eyebrow>{t('lesson.real.label')}</Eyebrow>
                <RealExperiment plan={plan} experiment={plan.homeExperiment} learner={learner} saved={realExperiment} onResult={onRealResult} />
              </div>
            )}

            {slide.kind === 'end' && (
              <div className="flex flex-1 flex-col justify-center gap-6 py-10">
                <h2 className="text-[28px] font-semibold leading-tight tracking-tight">{t('lesson.understandingQuestion')}</h2>
                {outcome?.understanding ? (
                  <p className="leading-relaxed text-muted">{t('lesson.understandingThanks')}</p>
                ) : (
                  <div role="radiogroup" className="flex flex-col gap-3">
                    {UNDERSTANDINGS.map(({ value, key }) => (
                      <ChoiceCard key={value} title={t(key)} selected={false} onSelect={() => onUnderstanding(value)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isStep && !html && (
          <div className="flex flex-1 flex-col justify-center gap-6 py-10">
            <p className="text-[19px] font-medium leading-relaxed">{t('lesson.waitExperiment')}</p>
            <p className="leading-relaxed text-muted">{t('lesson.buildingWhileYouThink')}</p>
            {preparation}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 border-t border-line bg-paper/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:px-10">
        <div className={cx('mx-auto flex w-full gap-3', isStep ? 'max-w-5xl' : 'max-w-xl')}>
          <Button variant="secondary" className="flex-1" disabled={index === 0} onClick={() => go(index - 1)}>
            {t('lesson.previous')}
          </Button>
          <Button className="flex-[2]" disabled={primaryDisabled} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
