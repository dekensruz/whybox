import type { LessonRequest } from '../../shared/lesson';
import { handle, json, readBody } from '../../server/http';
import { buildPlanParts, parsePlan, validateLessonRequest } from '../../server/lessonPlan';
import { callModel, MODELS, ModelError } from '../../server/meta';

const ATTEMPTS = 2;

/** Plans a personalized lesson from a question or a photo. */
export const POST = handle(async (request) => {
  const lessonRequest = validateLessonRequest(await readBody<LessonRequest>(request));
  const parts = buildPlanParts(lessonRequest);

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { text, usage } = await callModel({ model: MODELS.generation(), parts, effort: 'low' });
    try {
      return json({ plan: parsePlan(text), usage });
    } catch (error) {
      console.warn(`Lesson plan attempt ${attempt} rejected: ${(error as Error).message}`);
    }
  }
  throw new ModelError('No usable lesson plan');
});
