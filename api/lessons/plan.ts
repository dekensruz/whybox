import type { LessonPlan, LessonRequest } from '../../shared/lesson.js';
import { handle, json, readBody } from '../../server/http.js';
import { buildChildReadParts, buildPlanParts, buildReviewParts, parseChildRead, parsePlan, validateLessonRequest } from '../../server/lessonPlan.js';
import { callModel, MODELS, ModelError } from '../../server/meta.js';

const ATTEMPTS = 2;

/**
 * Plans a personalized lesson from a question or a photo, then two agents work on it: a young reader says where a
 * child would get lost, and an editor rewrites the lesson to fix that, simplify it and check the science.
 */
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

  let childNotes: string[] = [];
  try {
    const { text } = await callModel({ model: MODELS.generation(), parts: buildChildReadParts(draft, lessonRequest.learner), effort: 'low' });
    childNotes = parseChildRead(text);
  } catch (error) {
    console.warn(`Young reader skipped: ${(error as Error).message}`);
  }

  try {
    const { text } = await callModel({
      model: MODELS.generation(),
      parts: buildReviewParts(draft, lessonRequest.learner, childNotes),
      effort: 'medium',
    });
    // The editor may also correct the experiment's formulas; the result goes through the same validation.
    return json({ plan: parsePlan(text), childNotes: childNotes.length });
  } catch (error) {
    console.warn(`Lesson review skipped: ${(error as Error).message}`);
    return json({ plan: draft, childNotes: childNotes.length });
  }
});
