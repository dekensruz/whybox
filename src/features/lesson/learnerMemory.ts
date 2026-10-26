// The learner memory: what Whybox has learned from previous lessons, sent with every new lesson request
// so the lesson adapts its depth, connects to what was seen, and addresses past wrong ideas.
import type { LearnerMemory } from '@shared/lesson';
import type { Lesson } from './types';

const RECENT_LESSONS = 8;
const WRONG_IDEAS = 5;

export const buildLearnerMemory = (lessons: Lesson[], excludeId?: string): LearnerMemory => {
  const done = lessons.filter((lesson) => lesson.id !== excludeId && lesson.plan && lesson.outcome).slice(0, RECENT_LESSONS);

  const recentLessons = done.map((lesson) => ({
    title: lesson.plan!.title,
    subject: lesson.plan!.subject,
    predictionCorrect: lesson.outcome!.predictionCorrect,
    understanding: lesson.outcome!.understanding ?? null,
  }));

  const wrongIdeas = done
    .filter((lesson) => !lesson.outcome!.predictionCorrect)
    .map((lesson) => lesson.plan!.prediction.options[lesson.outcome!.chosen])
    .filter((idea): idea is string => Boolean(idea))
    .slice(0, WRONG_IDEAS);

  // Depth follows what the learner actually showed, not only their declared level.
  const lastThree = recentLessons.slice(0, 3);
  const struggled = lastThree.filter((lesson) => lesson.understanding === 'lost' || (!lesson.predictionCorrect && lesson.understanding !== 'clear'));
  const mastered = lastThree.filter((lesson) => lesson.understanding === 'clear' && lesson.predictionCorrect);
  const adapt = struggled.length >= 2 ? 'simpler' : lastThree.length === 3 && mastered.length === 3 ? 'deeper' : 'same';

  return { recentLessons, wrongIdeas, adapt };
};
