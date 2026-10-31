import type { LearnerContext, LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { buildAnswerCheckParts, parseAnswerCheck, sanitizeLearner } from '../../server/lessonPlan.js';
import { callModel, ModelError, openFirst } from '../../server/meta.js';

interface CheckRequest {
  plan: LessonPlan;
  learner: LearnerContext;
  answer: string;
  attempt: number;
}

/** Checks a learner's written answer to the lesson's exercise and gives feedback aimed at their own mistake. */
export const POST = handle(async (request) => {
  const { plan, learner, answer, attempt } = await readBody<CheckRequest>(request);
  const exercise = plan?.exercise;
  if (!exercise) throw new BadRequest('This lesson has no exercise');
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 1000) throw new BadRequest('Invalid answer');

  const parts = buildAnswerCheckParts(plan, exercise, answer.trim(), Math.max(1, Number(attempt) || 1), sanitizeLearner(learner));
  // A child's own words are read by the open-weight model.
  const check = await openFirst(async (model) => {
    const { text } = await callModel({ model, parts, effort: 'low' });
    try {
      return parseAnswerCheck(text);
    } catch (error) {
      throw new ModelError((error as Error).message);
    }
  });
  return json(check);
});
