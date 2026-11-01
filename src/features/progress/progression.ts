// The learner's progression, derived from their lessons: points and levels, days in a row, mastery of each subject,
// and badges. Everything is computed from what the learner actually did, so it can never drift from their lessons.
import type { Lesson } from '@/features/lesson/types';

const POINTS_PER_LEVEL = 300;

/** Points for one lesson: taking part counts, and so does each sign of understanding. */
export const lessonPoints = (lesson: Lesson) => {
  const outcome = lesson.outcome;
  if (!outcome) return 0;
  return (
    40 +
    (outcome.predictionCorrect ? 20 : 0) +
    (outcome.tourCompleted ? 20 : 0) +
    (outcome.stars ?? 0) * 10 +
    (outcome.exercise?.correct ? (outcome.exercise.attempts <= 1 ? 40 : 25) : 0) +
    (outcome.understanding ? 10 : 0) +
    (lesson.realExperiment ? 50 : 0)
  );
};

/** How well a lesson was understood, from 0 to 1, from everything the learner showed. */
export const lessonMastery = (lesson: Lesson) => {
  const outcome = lesson.outcome;
  if (!outcome) return 0;
  const prediction = outcome.predictionCorrect ? 1 : 0.4;
  const exercise = !outcome.exercise ? 0.6 : outcome.exercise.correct ? (outcome.exercise.attempts <= 1 ? 1 : 0.75) : 0.2;
  const understanding = { clear: 1, partly: 0.55, lost: 0.15 }[outcome.understanding ?? 'partly'];
  const stars = Math.min(1, (outcome.stars ?? 0) / 6);
  return 0.2 * prediction + 0.35 * exercise + 0.3 * understanding + 0.15 * stars;
};

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export interface Badge {
  id: 'first' | 'three' | 'ten' | 'streak3' | 'streak7' | 'stars10' | 'stars50' | 'perfect' | 'tester' | 'real';
  earned: boolean;
}

export interface Progression {
  points: number;
  level: number;
  /** Points inside the current level, and how many it takes. */
  levelPoints: number;
  levelSize: number;
  stars: number;
  lessonsDone: number;
  streak: number;
  /** The last 7 days, oldest first: whether the learner learned that day. */
  week: Array<{ date: Date; active: boolean }>;
  subjects: Array<{ subject: string; lessons: number; mastery: number }>;
  badges: Badge[];
  /** Lessons to revisit: followed, but not yet well understood. */
  toReview: Lesson[];
}

export const progression = (lessons: Lesson[], today = new Date()): Progression => {
  const done = lessons.filter((lesson) => lesson.plan && lesson.outcome);
  const points = done.reduce((total, lesson) => total + lessonPoints(lesson), 0);
  const stars = done.reduce((total, lesson) => total + (lesson.outcome!.stars ?? 0), 0);

  // Days with at least one lesson followed; the streak counts back from today (or yesterday, until the learner
  // comes back today).
  const days = new Set(done.map((lesson) => dayKey(new Date(lesson.createdAt))));
  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    return { date, active: days.has(dayKey(date)) };
  });

  const bySubject = new Map<string, number[]>();
  done.forEach((lesson) => bySubject.set(lesson.plan!.subject, [...(bySubject.get(lesson.plan!.subject) ?? []), lessonMastery(lesson)]));
  const subjects = [...bySubject.entries()]
    .map(([subject, scores]) => ({ subject, lessons: scores.length, mastery: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.lessons - a.lessons);

  const perfect = done.some(
    (lesson) => lesson.outcome!.predictionCorrect && lesson.outcome!.exercise?.correct && lesson.outcome!.exercise.attempts <= 1 && lesson.outcome!.understanding === 'clear',
  );
  const longest = (() => {
    let best = 0;
    days.forEach((key) => {
      const [year, month, day] = key.split('-').map(Number);
      const date = new Date(year, month, day);
      let run = 0;
      while (days.has(dayKey(date))) {
        run++;
        date.setDate(date.getDate() + 1);
      }
      best = Math.max(best, run);
    });
    return best;
  })();
  const badges: Badge[] = [
    { id: 'first', earned: done.length >= 1 },
    { id: 'three', earned: done.length >= 3 },
    { id: 'ten', earned: done.length >= 10 },
    { id: 'streak3', earned: longest >= 3 },
    { id: 'streak7', earned: longest >= 7 },
    { id: 'stars10', earned: stars >= 10 },
    { id: 'stars50', earned: stars >= 50 },
    { id: 'perfect', earned: perfect },
    { id: 'tester', earned: done.some((lesson) => lesson.counter) },
    { id: 'real', earned: lessons.some((lesson) => lesson.realExperiment) },
  ];

  return {
    points,
    level: Math.floor(points / POINTS_PER_LEVEL) + 1,
    levelPoints: points % POINTS_PER_LEVEL,
    levelSize: POINTS_PER_LEVEL,
    stars,
    lessonsDone: done.length,
    streak,
    week,
    subjects,
    badges,
    toReview: done.filter((lesson) => lessonMastery(lesson) < 0.55).slice(0, 3),
  };
};
