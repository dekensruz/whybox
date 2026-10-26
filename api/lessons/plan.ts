import type { LessonPlan, LessonRequest } from '../../shared/lesson.js';
import { handle, json, readBody } from '../../server/http.js';
import { buildPlanParts, buildReviewParts, parsePlan, validateLessonRequest } from '../../server/lessonPlan.js';
import { callModel, MODELS, ModelError } from '../../server/meta.js';

const ATTEMPTS = 2;

/** Plans a personalized lesson from a question or a photo, then has an editor agent simplify and check it. */
export const POST = handle(async (request) => {
  const lessonRequest = validateLessonRequest(await readBody<LessonRequest>(request));
  const parts = buildPlanParts(lessonRequest);

  let draft: LessonPlan | null = null;
  for (let attempt = 1; attempt <= ATTEMPTS && !draft; attempt++) {
    const { text } = await callModel({ model: MODELS.generation(), parts, effort: 'low' });
    try {
      draft = parsePlan(text);
    } catch (error) {
      console.warn(`Lesson plan attempt ${attempt} rejected: ${(error as Error).message}`);
    }
  }
  if (!draft) throw new ModelError('No usable lesson plan');

  try {
    const { text } = await callModel({ model: MODELS.generation(), parts: buildReviewParts(draft, lessonRequest.learner), effort: 'medium' });
    // The editor may also correct the experiment's formulas; the result goes through the same validation.
    return json({ plan: parsePlan(text) });
  } catch (error) {
    console.warn(`Lesson review skipped: ${(error as Error).message}`);
    return json({ plan: draft });
  }
});
