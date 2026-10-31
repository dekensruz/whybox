import type { LearnerContext, LessonPlan, RealExperimentResult } from '../../shared/lesson.js';
import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { sanitizeLearner } from '../../server/lessonPlan.js';
import { ModelError } from '../../server/meta.js';
import { analyseMotion, buildTrack, measureMotion, segmentVideo } from '../../server/realExperiment.js';
import { EXPERIMENT_BUCKET, supabaseAdmin } from '../../server/supabaseAdmin.js';

interface AnalyzeRequest {
  path: string;
  plan: LessonPlan;
  learner: LearnerContext;
  durationSeconds: number;
  objectSizeCm: number;
}

const MAX_DURATION_SECONDS = 20;

/** Tracks the object in the learner's video with SAM 3.1, measures the motion and compares it with the lesson. */
export const POST = handle(async (request) => {
  const { path, plan, learner, durationSeconds, objectSizeCm } = await readBody<AnalyzeRequest>(request);
  const experiment = plan?.homeExperiment;
  if (typeof path !== 'string' || !/^[\d-]+\/[\w-]+\.(mp4|mov)$/.test(path)) throw new BadRequest('Invalid video');
  if (!experiment) throw new BadRequest('This lesson has no home experiment');
  const duration = Number(durationSeconds);
  if (!(duration > 0 && duration <= MAX_DURATION_SECONDS)) throw new BadRequest('Video must last 20 seconds at most');
  const size = Number(objectSizeCm) > 0 && Number(objectSizeCm) < 200 ? Number(objectSizeCm) : experiment.targetSizeCm;

  const storage = supabaseAdmin().storage.from(EXPERIMENT_BUCKET);
  try {
    const { data, error } = await storage.createSignedUrl(path, 600);
    if (error || !data) throw new ModelError(`Video URL failed: ${error?.message}`, 500);

    const boxes = await segmentVideo(data.signedUrl, experiment.target);
    const { track, frameWidth, frameHeight } = buildTrack(boxes, duration);
    if (track.length < 5) {
      const result: RealExperimentResult = { frameWidth, frameHeight, track, metrics: [], verdict: 'unclear', explanation: '' };
      return json({ result, found: false });
    }

    const measured = measureMotion(track, frameHeight, size);
    const analysis = await analyseMotion(plan, experiment, sanitizeLearner(learner), measured, size);
    const result: RealExperimentResult = { frameWidth, frameHeight, track, ...analysis };
    return json({ result, found: true });
  } finally {
    // The video is only needed for this analysis: it is deleted right away.
    await storage.remove([path]).catch(() => undefined);
  }
});
