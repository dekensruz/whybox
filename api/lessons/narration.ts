import type { LearnerContext, LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { sanitizeLearner } from '../../server/lessonPlan.js';
import { callModel, MODELS, ModelError } from '../../server/meta.js';
import { buildNarrationParts, parseNarration } from '../../server/narration.js';

/** Writes what the tutor says aloud on each card of a lesson. */
export const POST = handle(async (request) => {
  const { plan, learner } = await readBody<{ plan: LessonPlan; learner: LearnerContext }>(request);
  if (!plan?.steps || !plan.prediction || !Array.isArray(plan.concepts)) throw new BadRequest('Missing plan');
  const { text } = await callModel({ model: MODELS.generation(), parts: buildNarrationParts(plan, sanitizeLearner(learner)), effort: 'low' });
  try {
    return json({ narration: parseNarration(text, plan) });
  } catch (error) {
    throw new ModelError(`Unusable narration: ${(error as Error).message}`);
  }
});
