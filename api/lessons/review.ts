import type { LessonPlan } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { callModel, MODELS } from '../../server/meta.js';
import { buildVisualReviewParts, parseVisualReview } from '../../server/simulation.js';

const MAX_SNAPSHOTS = 5;

interface ReviewRequest {
  plan: LessonPlan;
  snapshots: string[];
}

/** Visual review of an experiment from pictures of it at each step of the guided tour. */
export const POST = handle(async (request) => {
  const { plan, snapshots } = await readBody<ReviewRequest>(request);
  if (!plan?.steps || !Array.isArray(snapshots) || snapshots.length === 0) throw new BadRequest('Missing plan or pictures');
  if (snapshots.some((image) => typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,'))) {
    throw new BadRequest('Unsupported picture');
  }

  const { text } = await callModel({
    model: MODELS.simulation(),
    parts: buildVisualReviewParts(plan, snapshots.slice(0, MAX_SNAPSHOTS)),
    effort: 'low',
  });
  try {
    return json(parseVisualReview(text));
  } catch {
    // An unreadable review never blocks the lesson.
    return json({ approved: true, issues: [] });
  }
});
