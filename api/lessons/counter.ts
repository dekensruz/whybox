import type { LearnerContext, LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { buildCounterParts, parseCounter, sanitizeLearner } from '../../server/lessonPlan.js';
import { callModel, ModelError, openFirst } from '../../server/meta.js';

interface CounterRequest {
  plan: LessonPlan;
  learner: LearnerContext;
  /** The option the learner chose in the prediction. */
  idea: string;
}

/** A short guided tour, on the lesson's own experiment, that lets the learner test their wrong idea. */
export const POST = handle(async (request) => {
  const { plan, learner, idea } = await readBody<CounterRequest>(request);
  if (!plan?.simulation?.parameters || !plan.prediction || typeof idea !== 'string' || !idea.trim()) {
    throw new BadRequest('Missing plan or idea');
  }
  const parts = buildCounterParts(plan, idea.slice(0, 200), sanitizeLearner(learner));
  // The tour answers the learner's own wrong idea, so it runs on the open-weight model.
  const tour = await openFirst(async (model) => {
    const { text } = await callModel({ model, parts, effort: 'low' });
    try {
      return parseCounter(text, plan, idea.slice(0, 200));
    } catch (error) {
      throw new ModelError(`Unusable counter tour: ${(error as Error).message}`);
    }
  });
  return json({ tour });
});
