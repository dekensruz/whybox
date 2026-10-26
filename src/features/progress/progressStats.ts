// Progress figures shown on the dashboard and the progress page, all derived from the learner's lessons.
import type { Understanding } from '@shared/lesson';
import { buildLearnerMemory } from '@/features/lesson/learnerMemory';
import type { Lesson } from '@/features/lesson/types';

export interface ProgressStats {
  lessonsDone: number;
  predictionsRight: number;
  predictions: number;
  ideasTested: number;
  realExperiments: number;
  subjects: Array<{ subject: string; count: number }>;
  understanding: Record<Understanding, number>;
  wrongIdeas: Array<{ idea: string; lesson: string }>;
  adapt: 'simpler' | 'same' | 'deeper';
}

export const progressStats = (lessons: Lesson[]): ProgressStats => {
  const followed = lessons.filter((lesson) => lesson.plan && lesson.outcome);
  const subjects = new Map<string, number>();
  followed.forEach((lesson) => subjects.set(lesson.plan!.subject, (subjects.get(lesson.plan!.subject) ?? 0) + 1));
  const understanding: Record<Understanding, number> = { clear: 0, partly: 0, lost: 0 };
  followed.forEach((lesson) => lesson.outcome!.understanding && understanding[lesson.outcome!.understanding]++);

  return {
    lessonsDone: followed.length,
    predictions: followed.length,
    predictionsRight: followed.filter((lesson) => lesson.outcome!.predictionCorrect).length,
    ideasTested: followed.filter((lesson) => lesson.counter).length,
    realExperiments: lessons.filter((lesson) => lesson.realExperiment).length,
    subjects: [...subjects.entries()].map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count),
    understanding,
    wrongIdeas: followed
      .filter((lesson) => !lesson.outcome!.predictionCorrect)
      .map((lesson) => ({ idea: lesson.plan!.prediction.options[lesson.outcome!.chosen], lesson: lesson.plan!.title }))
      .filter((item) => Boolean(item.idea)),
    adapt: buildLearnerMemory(lessons).adapt,
  };
};
