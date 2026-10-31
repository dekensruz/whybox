import { useState, type FormEvent } from 'react';
import type { Exercise, LearnerContext, LessonPlan } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { VoiceButton } from '@/components/VoiceButton';
import { useI18n } from '@/i18n';
import { checkAnswer } from './api';

export interface ExerciseResult {
  correct: boolean;
  attempts: number;
}

interface ExerciseCardProps {
  plan: LessonPlan;
  exercise: Exercise;
  learner: LearnerContext | null;
  onDone: (result: ExerciseResult) => void;
}

type Feedback = { correct: boolean; text: string } | null;

/** Parses "12", "12,5", "12.5 m" into a number. */
const readNumber = (value: string) => Number(value.replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0] ?? NaN);

/**
 * The learner answers first. A wrong answer gets a hint (from the lesson, or written from their own answer),
 * the second one a closer hint; the solution comes after that, or whenever they ask.
 */
export function ExerciseCard({ plan, exercise, learner, onDone }: ExerciseCardProps) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [checking, setChecking] = useState(false);
  const [solutionShown, setSolutionShown] = useState(false);
  const solved = feedback?.correct ?? false;

  const finish = (correct: boolean, tries: number) => onDone({ correct, attempts: tries });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const attempt = attempts + 1;
    setAttempts(attempt);
    const hint = exercise.hints[Math.min(attempt - 1, exercise.hints.length - 1)] ?? '';

    if (exercise.kind === 'number' || exercise.kind === 'choice') {
      const correct =
        exercise.kind === 'number'
          ? Math.abs(readNumber(answer) - exercise.answer) <= Math.max(1e-9, Math.abs(exercise.answer) * exercise.tolerance)
          : choice === exercise.answerIndex;
      setFeedback({ correct, text: correct ? '' : hint });
      if (correct) finish(true, attempt);
      return;
    }

    // Written explanations are read by Whybox, which answers from what the learner actually wrote.
    if (!learner) return;
    setChecking(true);
    try {
      const check = await checkAnswer(plan, learner, answer, attempt);
      setFeedback({ correct: check.correct, text: check.feedback });
      if (check.correct) finish(true, attempt);
    } catch {
      setFeedback({ correct: false, text: hint });
    } finally {
      setChecking(false);
    }
  };

  const showSolution = () => {
    setSolutionShown(true);
    if (!solved) finish(false, attempts);
  };

  const canSubmit = !checking && !solved && (exercise.kind === 'choice' ? choice !== null : answer.trim().length > 0);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[19px] leading-relaxed">{exercise.question}</p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {exercise.kind === 'choice' && (
          <div role="radiogroup" className="flex flex-col gap-3">
            {exercise.options.map((option, index) => (
              <ChoiceCard key={index} title={option} selected={choice === index} onSelect={() => !solved && setChoice(index)} />
            ))}
          </div>
        )}
        {exercise.kind === 'number' && (
          <TextField
            label={exercise.unit ? `${t('lesson.answerLabel')} (${exercise.unit})` : t('lesson.answerLabel')}
            inputMode="decimal"
            value={answer}
            disabled={solved}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}
        {exercise.kind === 'explain' && (
          <>
            <TextAreaField
              label={t('lesson.answerLabel')}
              placeholder={t('lesson.answerPlaceholder')}
              maxLength={600}
              value={answer}
              disabled={solved}
              onChange={(event) => setAnswer(event.target.value)}
            />
            {!solved && <VoiceButton onText={(spoken) => setAnswer((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken))} />}
          </>
        )}

        {checking && <p className="text-sm text-muted">{t('lesson.checking')}</p>}

        {feedback && (
          <div
            role="status"
            className={feedback.correct ? 'rounded-2xl border border-ink bg-surface px-5 py-4' : 'rounded-2xl border border-accent bg-accent-soft px-5 py-4'}
          >
            <p className="font-medium">{feedback.correct ? t('lesson.rightAnswer') : t('lesson.tryAgain')}</p>
            {feedback.text && <p className="mt-1 leading-relaxed">{feedback.text}</p>}
            {!feedback.correct && attempts >= 2 && <p className="mt-2 text-sm text-muted">{t('lesson.lastTry')}</p>}
          </div>
        )}

        {!solved && (
          <Button type="submit" disabled={!canSubmit}>
            {t('lesson.check')}
          </Button>
        )}
      </form>

      {solutionShown || solved ? (
        <div className="slide-from-right rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="mb-1.5 text-sm font-medium text-muted">{t('lesson.solutionLabel')}</p>
          <p className="whitespace-pre-line leading-relaxed">{exercise.solution}</p>
        </div>
      ) : (
        attempts > 0 && (
          <Button variant="ghost" onClick={showSolution}>
            {t('lesson.showSolution')}
          </Button>
        )
      )}
    </div>
  );
}
