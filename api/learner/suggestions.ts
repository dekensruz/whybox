import type { LearnerContext } from '../../shared/lesson.js';
import { handle, json, readBody } from '../../server/http.js';
import { sanitizeLearner } from '../../server/lessonPlan.js';
import { callModel, MODELS, ModelError } from '../../server/meta.js';
import { buildSuggestionParts, parseSuggestions, type LearningRecord } from '../../server/suggestions.js';

const text = (value: unknown, max: number) => String(value ?? '').slice(0, max);

/** Six questions chosen for this learner: to revisit, to go further, and to discover. */
export const POST = handle(async (request) => {
  const { learner, record } = await readBody<{ learner: LearnerContext; record?: Partial<LearningRecord> }>(request);
  const safeRecord: LearningRecord = {
    lessons: (Array.isArray(record?.lessons) ? record.lessons : []).slice(0, 20).map((lesson) => ({
      title: text(lesson?.title, 80),
      subject: text(lesson?.subject, 30),
      mastery: Math.max(0, Math.min(1, Number(lesson?.mastery) || 0)),
    })),
    toReview: (Array.isArray(record?.toReview) ? record.toReview : []).slice(0, 5).map((title) => text(title, 80)),
  };
  const { text: answer } = await callModel({
    model: MODELS.generation(),
    parts: buildSuggestionParts(sanitizeLearner(learner), safeRecord),
    effort: 'low',
  });
  try {
    return json({ suggestions: parseSuggestions(answer) });
  } catch (error) {
    throw new ModelError(`Unusable suggestions: ${(error as Error).message}`);
  }
});
