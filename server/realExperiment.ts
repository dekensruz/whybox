// "Do it for real": SAM 3.1 tracks the object in the learner's video, the motion is measured,
// then Muse Spark compares the measurements with the law of the lesson.
import type { HomeExperiment, LearnerContext, LessonPlan, RealExperimentResult, TrackPoint } from '../shared/lesson.js';
import { describeLearner, WRITING_RULES } from './lessonPlan.js';
import { callModel, MODELS, ModelError, type InputPart } from './meta.js';

const DEFAULT_FPS = 30;

interface Box {
  frame: number;
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

/**
 * Parses SAM's video output: one line per frame, "<Nf>id<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..|><|mask;...|>,id...".
 * Masks are ignored: the box centre is enough to follow a moving object.
 */
export const parseSegmentation = (text: string): Box[] => {
  const boxes: Box[] = [];
  for (const line of text.matchAll(/<(\d+)f>([^\n]*)/g)) {
    const frame = Number(line[1]);
    for (const record of line[2].matchAll(/(\d+)<\|box;([^|]*)\|>/g)) {
      const fields = Object.fromEntries(
        record[2].split(';').map((pair) => {
          const [key, value] = pair.split('=');
          return [key, Number(value)];
        }),
      );
      if ([fields.x1, fields.y1, fields.x2, fields.y2, fields.w, fields.h].every(Number.isFinite)) {
        boxes.push({ frame, id: Number(record[1]), x1: fields.x1, y1: fields.y1, x2: fields.x2, y2: fields.y2, w: fields.w, h: fields.h });
      }
    }
  }
  return boxes;
};

/** Keeps the object seen in the most frames, as a time series. */
export const buildTrack = (boxes: Box[], durationSeconds: number): { track: TrackPoint[]; frameWidth: number; frameHeight: number } => {
  if (boxes.length === 0) return { track: [], frameWidth: 0, frameHeight: 0 };
  const counts = new Map<number, number>();
  boxes.forEach((box) => counts.set(box.id, (counts.get(box.id) ?? 0) + 1));
  const mainId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const own = boxes.filter((box) => box.id === mainId).sort((a, b) => a.frame - b.frame);
  const lastFrame = Math.max(...boxes.map((box) => box.frame));
  const fps = durationSeconds > 0 ? (lastFrame + 1) / durationSeconds : DEFAULT_FPS;
  const track = own.map((box) => ({
    t: box.frame / fps,
    x: (box.x1 + box.x2) / 2,
    y: (box.y1 + box.y2) / 2,
    w: box.x2 - box.x1,
    h: box.y2 - box.y1,
  }));
  return { track, frameWidth: own[0].w, frameHeight: own[0].h };
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

/** Generic measurements of the motion, in centimetres and seconds, using the object's real size as the ruler. */
export const measureMotion = (track: TrackPoint[], frameHeight: number, targetSizeCm: number) => {
  if (track.length < 3) return [];
  const scale = targetSizeCm / Math.max(1, median(track.map((point) => Math.max(point.w, point.h))));
  // Smoothed positions in centimetres, y pointing up.
  const points = track.map((point, index) => {
    const window = track.slice(Math.max(0, index - 1), index + 2);
    return {
      t: point.t,
      x: (window.reduce((sum, p) => sum + p.x, 0) / window.length) * scale,
      y: ((frameHeight - window.reduce((sum, p) => sum + p.y, 0) / window.length) * scale),
    };
  });
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  let maxSpeed = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t;
    if (dt > 0) maxSpeed = Math.max(maxSpeed, Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) / dt);
  }

  // Fall: from the moment the object starts to drop to its lowest point.
  const startY = ys[0];
  const dropStart = points.find((p) => startY - p.y > 1);
  const lowest = points.reduce((low, p) => (p.y < low.y ? p : low), points[0]);
  const fallTime = dropStart && lowest.t > dropStart.t ? lowest.t - dropStart.t : null;

  // Swing: average time between crossings of the middle position, with a small dead zone against noise.
  const middle = (Math.max(...xs) + Math.min(...xs)) / 2;
  const deadZone = (Math.max(...xs) - Math.min(...xs)) * 0.1;
  const crossings: number[] = [];
  let side = 0;
  points.forEach((p) => {
    const current = p.x > middle + deadZone ? 1 : p.x < middle - deadZone ? -1 : 0;
    if (current !== 0 && side !== 0 && current !== side) crossings.push(p.t);
    if (current !== 0) side = current;
  });
  const period = crossings.length >= 3 ? (2 * (crossings[crossings.length - 1] - crossings[0])) / (crossings.length - 1) : null;

  const metrics = [
    { label: 'tracked duration', value: points[points.length - 1].t - points[0].t, unit: 's' },
    { label: 'vertical travel', value: Math.max(...ys) - Math.min(...ys), unit: 'cm' },
    { label: 'horizontal travel', value: Math.max(...xs) - Math.min(...xs), unit: 'cm' },
    { label: 'top speed', value: maxSpeed, unit: 'cm/s' },
  ];
  if (fallTime !== null) metrics.push({ label: 'fall time', value: fallTime, unit: 's' });
  if (period !== null) metrics.push({ label: 'swing period', value: period, unit: 's' });
  return metrics.map((metric) => ({ ...metric, value: Number(metric.value.toFixed(3)) }));
};

export const segmentVideo = async (videoUrl: string, target: string) => {
  const { text } = await callModel({
    model: MODELS.segmentation(),
    parts: [
      { type: 'input_text', text: target },
      { type: 'input_video', video_url: videoUrl },
    ],
    metadata: { mask_encoding: 'one_bit' },
  });
  return parseSegmentation(text);
};

const buildAnalysisParts = (
  plan: LessonPlan,
  experiment: HomeExperiment,
  learner: LearnerContext,
  metrics: Array<{ label: string; value: number; unit: string }>,
  objectSizeCm: number,
): InputPart[] => [
  {
    type: 'input_text',
    text: `You are Whybox. The learner just did a real experiment at home, filmed it, and the object was tracked automatically.

The learner:
${describeLearner(learner)}

The lesson: ${plan.title}. ${plan.summary}
The experiment: ${experiment.title}. Motion: ${experiment.motion}.
What the lesson predicts: ${experiment.prediction}
Real size of the tracked object (${experiment.target}): ${objectSizeCm} cm, used as the ruler.

Measurements from the video (approximate: a phone camera, a hand-held start, perspective):
${metrics.map((m) => `- ${m.label}: ${m.value} ${m.unit}`).join('\n')}

Task:
1. Pick the 2 or 3 measurements that matter for this lesson and give them a short label in the learner's language.
2. Compute what the lesson's law predicts for this situation, showing the formula and the numbers in one short line,
   written correctly (for example t = √(2h / g) = √(2 × 1 / 9,8) ≈ 0,45 s).
3. Compare. Real measurements are never perfect: explain the gap kindly and concretely (air, friction, the start of
   the video, the angle of the phone). Say "matches" within about 15%, "close" within about 35%, "different" beyond,
   "unclear" if the measurements cannot say anything (object lost, no motion).

${WRITING_RULES}

Answer with JSON only:
{
  "metrics": [{ "label": "...", "value": 0.45, "unit": "s" }],
  "verdict": "matches | close | different | unclear",
  "explanation": "3 to 5 short sentences: what was measured, what the law predicts, why they agree or not"
}`,
  },
];

export const analyseMotion = async (
  plan: LessonPlan,
  experiment: HomeExperiment,
  learner: LearnerContext,
  metrics: Array<{ label: string; value: number; unit: string }>,
  objectSizeCm: number,
): Promise<Pick<RealExperimentResult, 'metrics' | 'verdict' | 'explanation'>> => {
  const { text } = await callModel({
    model: MODELS.generation(),
    parts: buildAnalysisParts(plan, experiment, learner, metrics, objectSizeCm),
    effort: 'low',
  });
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let result: Partial<RealExperimentResult>;
  try {
    result = JSON.parse(fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    throw new ModelError('Unreadable experiment analysis');
  }
  const verdicts = ['matches', 'close', 'different', 'unclear'] as const;
  return {
    metrics: (Array.isArray(result.metrics) ? result.metrics : [])
      .filter((m) => m && typeof m.label === 'string' && Number.isFinite(Number(m.value)))
      .slice(0, 3)
      .map((m) => ({ label: m.label.slice(0, 40), value: Number(m.value), unit: String(m.unit ?? '').slice(0, 10) })),
    verdict: verdicts.includes(result.verdict as (typeof verdicts)[number]) ? (result.verdict as RealExperimentResult['verdict']) : 'unclear',
    explanation: String(result.explanation ?? '').slice(0, 800),
  };
};
