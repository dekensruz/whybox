import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengeStart } from '@shared/challenge';
import type { CounterTour, LearnerContext, LessonPlan, Narration, RealExperimentResult, TourStep, Understanding } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { chime, miss, setSoundEnabled, soundEnabled } from '@/lib/sound';
import { prepareSpeech, setVoiceEnabled, speak, speechSupported, stopSpeaking, voiceEnabled } from '@/lib/speech';
import { ExerciseCard, type ExerciseResult } from './ExerciseCard';
import { describeMeasure } from './measure';
import { MissionsPanel } from './MissionsPanel';
import { RealExperiment } from './real/RealExperiment';
import { SimulationFrame } from './SimulationFrame';
import { Tutor } from './Tutor';
import { AnswerLine, VerdictMark } from './Verdict';
import { starsFor, Victory, type VictoryState } from './Victory';
import type { TutorGesture } from './avatar/tutorScene';
import type { IllustrationKind, LessonOutcome, Verification } from './types';

const UNDERSTANDINGS: Array<{ value: Understanding; key: 'lesson.understandingClear' | 'lesson.understandingPartly' | 'lesson.understandingLost' }> = [
  { value: 'clear', key: 'lesson.understandingClear' },
  { value: 'partly', key: 'lesson.understandingPartly' },
  { value: 'lost', key: 'lesson.understandingLost' },
];

const SWIPE_DISTANCE = 60;

// The 3D tutor carries three.js: it loads only when the voice is on.
const TutorAvatar = lazy(() => import('./avatar/TutorAvatar'));

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
  onExercise: (result: ExerciseResult) => void;
  /** Object URLs of the lesson's Muse Image illustrations, when they are ready. */
  illustrations: Partial<Record<IllustrationKind, string>>;
  /** What the tutor says on each card, once written; until then it reads the cards themselves. */
  narration?: Narration;
  /** Called with the stars won so far in this visit of the lesson. */
  onStars?: (stars: number) => void;
}

/** An illustration that fades in when it arrives, keeping its place so the card does not jump. */
function Illustration({ src }: { src?: string }) {
  return (
    <div className="aspect-[3/2] w-full overflow-hidden rounded-2xl bg-surface">
      {src && <img src={src} alt="" className="h-full w-full animate-[fade-in_0.6s_ease-out] object-cover" />}
    </div>
  );
}

type TourEntry = TourStep & { againstIdea: boolean };

type Slide =
  | { kind: 'hook' }
  | { kind: 'predict' }
  | { kind: 'reveal' }
  | { kind: 'step'; index: number }
  | { kind: 'missions' }
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
  const { learner, realExperiment, onRealResult, onExercise, illustrations, narration } = props;
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
      ...(plan.missions?.length ? [{ kind: 'missions' } as Slide] : []),
      ...plan.concepts.map((_, concept): Slide => ({ kind: 'concept', index: concept })),
      ...(plan.exercise || plan.example ? [{ kind: 'example' } as Slide] : []),
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
  // A new version re-applies the step, after the learner moved the controls away from it.
  const [stateVersion, setStateVersion] = useState(0);
  const stepState = useMemo(() => ({ ...defaults, ...step.parameters }), [defaults, step, stateVersion]);

  // The step text describes the step's own values: notice when the learner's values no longer match it.
  const [liveValues, setLiveValues] = useState<Record<string, number> | null>(null);
  const [liveMeasures, setLiveMeasures] = useState<Record<string, number> | null>(null);
  const settle = useRef<number | undefined>(undefined);
  // Each setting the learner stops on is one try: fewer tries to win a level, more stars.
  const tries = useRef(0);
  const onValues = useCallback((values: Record<string, number>, measures: Record<string, number>) => {
    setLiveMeasures(measures);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      tries.current++;
      setLiveValues(values);
    }, 400);
  }, []);
  const [victory, setVictory] = useState<VictoryState | null>(null);
  const [stars, setStars] = useState(0);
  const win = useCallback((next: VictoryState) => {
    setVictory(next);
    setStars((total) => total + next.stars);
  }, []);
  const { onStars } = props;
  useEffect(() => {
    if (stars > 0) onStars?.(stars);
  }, [stars, onStars]);

  // A challenge step is not shown: the learner finds its state alone, starting from the previous step's state,
  // and reads the explanation only once found. "Show me" applies the step's own state instead.
  const [solved, setSolved] = useState<Record<number, 'found' | 'shown'>>({});
  const challenge = step.challenge;
  const challengeOpen = slide.kind === 'step' && Boolean(challenge) && !solved[slide.index];
  const startState = useMemo(
    () => challengeStart(defaults, tourIndex > 0 ? tour[tourIndex - 1].parameters : {}, step.parameters, step.challenge?.find ?? []),
    [defaults, tour, tourIndex, step],
  );
  const onChallenge = useRef<number | null>(null);
  onChallenge.current = challengeOpen && slide.kind === 'step' ? slide.index : null;
  useEffect(() => {
    const at = onChallenge.current;
    const value = liveMeasures?.[challenge?.measurement ?? ''];
    if (at === null || !challenge || value === undefined || value < challenge.min || value > challenge.max) return;
    chime();
    setSolved((current) => ({ ...current, [at]: 'found' }));
    win({ title: t('lesson.challengeWon'), stars: starsFor(tries.current) });
  }, [liveMeasures]);

  const experimentState =
    slide.kind === 'missions' ? defaults : challenge && solved[tourIndex] !== 'shown' ? startState : stepState;
  const leftStep =
    liveValues !== null &&
    experimentState === stepState &&
    Object.entries(stepState).some(([name, value]) => name in liveValues && Math.abs(liveValues[name] - value) > Math.max(1e-6, Math.abs(value) * 1e-3));
  const challengeMeasurement = plan.simulation.measurements.find((measurement) => measurement.name === challenge?.measurement);

  // Missions start from the experiment's default settings, which the server checked do not already win them.
  // They are played in order, and only count once the experiment changes on the missions card.
  const missions = plan.missions ?? [];
  const [reached, setReached] = useState(0);
  const onMissions = useRef(false);
  onMissions.current = slide.kind === 'missions';
  useEffect(() => {
    const mission = missions[reached];
    const value = liveMeasures?.[mission?.measurement ?? ''];
    if (!onMissions.current || !mission || value === undefined || value < mission.min || value > mission.max) return;
    chime(reached === missions.length - 1);
    setReached(reached + 1);
    win({ title: t('lesson.levelWon', { current: reached + 1, total: missions.length }), text: mission.success, stars: starsFor(tries.current) });
    tries.current = 0;
  }, [liveMeasures]);

  // A level starts when a challenge opens or a mission begins: its tries start from zero.
  const level = slide.kind === 'missions' ? `missions-${reached}` : challengeOpen ? `step-${index}` : null;
  useEffect(() => {
    tries.current = 0;
  }, [level]);
  useEffect(() => setVictory(null), [index]);

  const [sound, setSound] = useState(soundEnabled);
  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };
  const fullscreenSupported = typeof document !== 'undefined' && document.fullscreenEnabled;
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    request.catch(() => {
      /* the browser refused: the lesson stays as it is */
    });
  };

  useEffect(() => {
    if (slide.kind === 'step' && slide.index === tour.length - 1 && outcome && !outcome.tourCompleted) onTourComplete();
  }, [slide, tour.length, outcome, onTourComplete]);

  // Going forward is held back where the learner has something to do first.
  const canGoForward =
    index < slides.length - 1 && !(slide.kind === 'predict' && !outcome) && !(slide.kind === 'step' && (!html || challengeOpen));
  // With challenges, the learner works out why in the experiment: the explanation waits for the end of the tour.
  const discovery = tour.some((entry) => entry.challenge);

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
      if (choice === plan.prediction.answerIndex) chime();
      else miss();
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
  const isStep = slide.kind === 'step' || slide.kind === 'missions';

  // The tutor says each card aloud when it appears, and again when a challenge is solved.
  const [voice, setVoice] = useState(() => speechSupported() && voiceEnabled());
  const [speaking, setSpeaking] = useState(false);
  const counterSteps = tour.filter((entry) => entry.againstIdea).length;
  const spoken = (() => {
    switch (slide.kind) {
      case 'hook':
        return narration?.hook || plan.hook;
      case 'predict':
        return outcome ? '' : narration?.prediction || plan.prediction.question;
      case 'reveal':
        return [
          correct ? t('lesson.correct') : t('lesson.incorrect'),
          discovery ? t('lesson.revealSearch') : plan.prediction.explanation,
          !correct && counter ? counter.intro : '',
        ].join(' ');
      case 'step': {
        const entry = tour[slide.index];
        const line = entry.againstIdea ? undefined : narration?.steps[slide.index - counterSteps];
        if (entry.challenge && solved[slide.index]) return line?.found || `${entry.text} ${entry.observe}`;
        return line?.intro || entry.challenge?.question || `${entry.text} ${entry.observe}`;
      }
      case 'missions':
        return narration?.missions || t('lesson.missionsIntro');
      case 'concept':
        return narration?.concepts[slide.index] || `${plan.concepts[slide.index].term}. ${plan.concepts[slide.index].definition}`;
      case 'example':
        return narration?.exercise || plan.exercise?.question || plan.example?.statement || '';
      case 'summary':
        return narration?.summary || plan.summary;
      case 'end':
        return outcome?.understanding ? '' : t('lesson.understandingQuestion');
      default:
        return '';
    }
  })();
  const say = useCallback(
    (text: string) => speak(text, language, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }),
    [language],
  );
  useEffect(() => {
    if (voice && spoken) say(spoken);
    else stopSpeaking();
  }, [voice, spoken, say]);
  useEffect(() => stopSpeaking, []);
  // Every line is prepared in advance, while the learner reads, so each card speaks without waiting.
  useEffect(() => {
    if (!voice || !narration) return;
    [
      narration.hook,
      narration.prediction,
      ...narration.steps.flatMap((line) => [line.intro, line.found ?? '']),
      ...narration.concepts,
      narration.exercise ?? '',
      narration.missions ?? '',
      narration.summary,
    ].forEach((line) => prepareSpeech(line, language));
  }, [voice, narration, language]);
  const toggleVoice = () => {
    setVoiceEnabled(!voice);
    setVoice(!voice);
  };
  const toggleTutor = () => (speaking ? stopSpeaking() : spoken && say(spoken));

  // The tutor's gesture follows the moment of the lesson.
  const gesture: TutorGesture = (() => {
    if (victory) return 'celebrate';
    switch (slide.kind) {
      case 'predict':
        return 'think';
      case 'example':
        return outcome?.exercise?.correct ? 'celebrate' : 'think';
      case 'reveal':
        return correct ? 'happy' : 'encourage';
      case 'step':
        if (challengeOpen) return 'think';
        return challenge && solved[slide.index] === 'found' ? 'celebrate' : 'point';
      case 'missions':
        return missions.length > 0 && reached >= missions.length ? 'celebrate' : 'point';
      case 'real':
        return 'point';
      case 'end':
        return 'happy';
      default:
        return 'explain';
    }
  })();

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
        {speechSupported() && (
          <button
            type="button"
            onClick={toggleVoice}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            aria-label={voice ? t('lesson.voiceOn') : t('lesson.voiceOff')}
            aria-pressed={voice}
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="7.5" cy="7" r="3" />
              <path d="M2.5 16.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
              {voice ? <path d="M14.5 5a4 4 0 0 1 0 5M16.8 3a7 7 0 0 1 0 9" /> : <path d="m14 5.5 4 4m0-4-4 4" />}
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={toggleSound}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          aria-label={sound ? t('lesson.soundOn') : t('lesson.soundOff')}
          aria-pressed={sound}
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 7.5h2.5L10 4.5v11l-4-3H3.5z" />
            {sound ? <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.5 6.5 0 0 1 0 9" /> : <path d="m13 8 4 4m0-4-4 4" />}
          </svg>
        </button>
        {fullscreenSupported && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            aria-label={fullscreen ? t('lesson.exitFullscreen') : t('lesson.fullscreen')}
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {fullscreen ? (
                <path d="M7.5 3.5v4h-4M12.5 3.5v4h4M7.5 16.5v-4h-4M12.5 16.5v-4h4" />
              ) : (
                <path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" />
              )}
            </svg>
          </button>
        )}
      </header>

      <main
        className={cx('mx-auto flex w-full flex-1 flex-col px-6 py-6 lg:px-10', isStep ? 'max-w-5xl' : 'max-w-xl')}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* The experiment stays loaded across the tour, so swiping between steps only moves it. */}
        {html && (
          <div className={cx(isStep ? 'grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start' : 'hidden')}>
            <div className="relative order-2 lg:order-1">
              {victory && <Victory victory={victory} onClose={() => setVictory(null)} />}
              <SimulationFrame html={html} plan={plan} language={language} state={experimentState} onValues={onValues} sound={sound} />
            </div>
            {slide.kind === 'missions' && (
              <div key={index} className={cx('order-1 flex flex-col gap-3 lg:order-2 lg:sticky lg:top-24', direction === 'forward' ? 'slide-from-right' : 'slide-from-left')}>
                <Eyebrow>{t('lesson.missionsLabel')}</Eyebrow>
                <MissionsPanel
                  missions={missions}
                  measurements={plan.simulation.measurements}
                  measures={liveMeasures}
                  reached={reached}
                  stars={stars}
                  language={language}
                />
              </div>
            )}
            {slide.kind === 'step' && (
              <div key={index} className={cx('order-1 flex flex-col gap-3 lg:order-2 lg:sticky lg:top-24', direction === 'forward' ? 'slide-from-right' : 'slide-from-left')}>
                <Eyebrow>
                  {step.againstIdea && <span className="text-ink">{t('lesson.testIdeaLabel')} · </span>}
                  {challenge && <span className="text-ink">{t('lesson.challengeLabel')} · </span>}
                  {t('lesson.stepOf', { current: slide.index + 1, total: tour.length })}
                </Eyebrow>
                <h2 className="text-[22px] font-semibold leading-tight tracking-tight">{step.title}</h2>
                {challenge && (
                  <p className={cx('text-[18px] leading-relaxed', challengeOpen ? 'font-medium' : 'text-muted')}>{challenge.question}</p>
                )}
                {challengeOpen && challenge ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm leading-relaxed text-muted">{t('lesson.challengeHint')}</p>
                    {liveMeasures?.[challenge.measurement] !== undefined && challengeMeasurement && (
                      <p className="text-sm tabular-nums text-muted">
                        {challengeMeasurement.label} ·{' '}
                        <span className="font-medium text-ink">
                          {describeMeasure(challengeMeasurement, liveMeasures[challenge.measurement], language)}
                        </span>
                      </p>
                    )}
                    <Button variant="ghost" onClick={() => setSolved((current) => ({ ...current, [slide.index]: 'shown' }))}>
                      {t('lesson.showMe')}
                    </Button>
                  </div>
                ) : (
                  <div key={`answer-${slide.index}`} className={cx('flex flex-col gap-3', challenge && 'slide-from-right')}>
                    {challenge && solved[slide.index] && (
                      <p role="status" className="font-semibold">
                        {t(solved[slide.index] === 'found' ? 'lesson.challengeFound' : 'lesson.challengeShown')}
                      </p>
                    )}
                    <p className="leading-relaxed text-muted">{step.text}</p>
                    {step.observe && <p className="border-l-2 border-accent pl-3 font-medium leading-relaxed">{step.observe}</p>}
                    {discovery && slide.index === tour.length - 1 && (
                      <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                        <p className="mb-1 text-sm font-medium text-muted">{t('lesson.whyLabel')}</p>
                        <p className="leading-relaxed">{plan.prediction.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
                {leftStep && (
                  <div className="slide-from-right flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                    <p className="text-sm leading-relaxed text-muted">{t('lesson.stepChanged')}</p>
                    <Button variant="secondary" onClick={() => setStateVersion((version) => version + 1)}>
                      {t('lesson.backToStep')}
                    </Button>
                  </div>
                )}
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
              <div className="flex flex-1 flex-col justify-center gap-4 py-6">
                {plan.illustrations && <Illustration src={illustrations.hook} />}
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
                <div className="flex items-center gap-4">
                  <VerdictMark correct={correct} />
                  <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">
                    {correct ? t('lesson.correct') : t('lesson.incorrect')}
                  </h2>
                </div>
                {outcome && (
                  <div className="flex flex-col gap-2">
                    <AnswerLine correct={correct} label={t('lesson.yourAnswer')}>
                      {plan.prediction.options[outcome.chosen]}
                    </AnswerLine>
                    {!correct && (
                      <AnswerLine correct label={t('lesson.goodAnswer')}>
                        {plan.prediction.options[plan.prediction.answerIndex]}
                      </AnswerLine>
                    )}
                  </div>
                )}
                <p className="text-[17px] leading-relaxed text-muted">{discovery ? t('lesson.revealSearch') : plan.prediction.explanation}</p>
                {!correct && counter && <p className="border-l-2 border-accent pl-4 text-[17px] leading-relaxed">{counter.intro}</p>}
                {!correct && counter === undefined && <p className="text-sm text-subtle">{t('lesson.counterPreparing')}</p>}
              </div>
            )}

            {slide.kind === 'concept' && (
              <div className="flex flex-1 flex-col justify-center gap-4 py-6">
                {plan.illustrations?.concepts?.[slide.index] && <Illustration src={illustrations[`concept${slide.index}`]} />}
                <Eyebrow>{t('lesson.conceptsLabel')}</Eyebrow>
                <h2 className="text-[30px] font-semibold leading-tight tracking-tight">{plan.concepts[slide.index].term}</h2>
                <p className="text-[18px] leading-relaxed">{plan.concepts[slide.index].definition}</p>
                <p className="border-l-2 border-accent pl-4 text-[17px] leading-relaxed text-muted">{plan.concepts[slide.index].analogy}</p>
              </div>
            )}

            {slide.kind === 'example' && plan.exercise && (
              <div className="flex flex-col gap-5 py-6">
                {plan.illustrations?.exercise && <Illustration src={illustrations.exercise} />}
                <Eyebrow>{t('lesson.exerciseLabel')}</Eyebrow>
                <ExerciseCard plan={plan} exercise={plan.exercise} learner={learner} onDone={onExercise} />
              </div>
            )}

            {/* Lessons created before exercises existed keep their worked example. */}
            {slide.kind === 'example' && !plan.exercise && plan.example && (
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
              <div className="flex flex-1 flex-col justify-center gap-5 py-6">
                {plan.illustrations && <Illustration src={illustrations.summary} />}
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
        <div className={cx('mx-auto flex w-full items-center gap-3', isStep ? 'max-w-5xl' : 'max-w-xl')}>
          {voice && (
            <Suspense fallback={<Tutor speaking={speaking} onToggle={toggleTutor} />}>
              <TutorAvatar
                gesture={gesture}
                speaking={speaking}
                onToggle={toggleTutor}
                fallback={<Tutor speaking={speaking} onToggle={toggleTutor} />}
              />
            </Suspense>
          )}
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
