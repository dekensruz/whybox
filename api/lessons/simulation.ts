import type { CheckFailure, LearnerContext, LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { callModel, MODELS } from '../../server/meta.js';
import { buildRepairParts, buildSimulationParts, extractHtml } from '../../server/simulation.js';

interface SimulationRequest {
  plan: LessonPlan;
  learner: LearnerContext;
  /** When present, the previous version and the checks it failed: the experiment is repaired instead of rebuilt. */
  repair?: { html: string; failures: CheckFailure[] };
}

/** Builds the interactive experiment of a lesson, or repairs one that failed verification. */
export const POST = handle(async (request) => {
  const { plan, learner, repair } = await readBody<SimulationRequest>(request);
  if (!plan?.simulation?.parameters || !learner) throw new BadRequest('Missing plan or learner');

  const parts = repair ? buildRepairParts(plan, repair.html, repair.failures) : buildSimulationParts(plan, learner);
  const { text, usage } = await callModel({ model: MODELS.generation(), parts, effort: 'medium' });
  return json({ html: extractHtml(text), usage });
});
