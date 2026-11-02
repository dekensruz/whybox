import type { CheckFailure, LearnerContext, LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { callModel, MODELS } from '../../server/meta.js';
import { buildRepairParts, buildSimulationParts, extractHtml } from '../../server/simulation.js';

interface SimulationRequest {
  plan: LessonPlan;
  learner: LearnerContext;
  /** When present, the previous version and the checks it failed: the experiment is repaired instead of rebuilt. */
  repair?: { html: string; failures: CheckFailure[]; visualIssues?: string[] };
}

const NO_HANDLE =
  'The learner cannot touch anything in the scene: add g.handle on the object that each movable parameter changes ' +
  '(the ball, the rope end, the water level...), so the learner drags the thing itself instead of a slider.';

/** A 2D scene must let the learner act on an object; 3D scenes are turned with a finger instead. */
const lacksHandle = (plan: LessonPlan, html: string) => plan.simulation.dimension !== '3d' && !/\bg\.handle\(/.test(html);

/** Builds the interactive experiment of a lesson, or repairs one that failed verification. */
export const POST = handle(async (request) => {
  const { plan, learner, repair } = await readBody<SimulationRequest>(request);
  if (!plan?.simulation?.parameters || !learner) throw new BadRequest('Missing plan or learner');

  const parts = repair
    ? buildRepairParts(plan, repair.html, repair.failures ?? [], (repair.visualIssues ?? []).map(String).slice(0, 6))
    : buildSimulationParts(plan, learner);
  const { text, usage } = await callModel({ model: MODELS.simulation(), parts, effort: 'medium' });
  let html = extractHtml(text);

  // An experiment the learner only watches is not one: a scene with nothing to grab gets one repair.
  if (lacksHandle(plan, html)) {
    try {
      const fixed = await callModel({ model: MODELS.simulation(), parts: buildRepairParts(plan, html, [], [NO_HANDLE]), effort: 'medium' });
      const candidate = extractHtml(fixed.text);
      if (!lacksHandle(plan, candidate)) html = candidate;
    } catch (error) {
      console.warn(`Handle repair skipped: ${(error as Error).message}`);
    }
  }
  return json({ html, usage });
});
