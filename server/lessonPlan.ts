// Step 1 of a lesson: understand what the learner asks and plan a personalized lesson.
import { evaluate } from '../shared/expression';
import type { LearnerContext, LessonPlan, LessonRequest } from '../shared/lesson';
import { BadRequest } from './http';
import type { InputPart } from './meta';

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  primary: 'upper primary school (ages 10 to 12)',
  lower_secondary: 'lower secondary school (ages 12 to 15)',
  upper_secondary: 'upper secondary school (ages 15 to 18)',
};

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};

export const describeLearner = (learner: LearnerContext) =>
  [
    `- Role: ${learner.role}`,
    `- Level: ${learner.levels.map((level) => LEVEL_DESCRIPTIONS[level] ?? level).join(', ') || 'not specified'}`,
    `- Lives in: ${learner.city ? `${learner.city}, ` : ''}${countryName(learner.country)}`,
    `- Language of the lesson: ${languageName(learner.language)}`,
    `- Interests: ${learner.interests.join(', ') || 'not specified'}`,
    `- ${learner.role === 'teacher' ? 'Teaches' : 'Finds difficult'}: ${learner.subjects.join(', ') || 'not specified'}`,
    `- Uses the app: ${
      { own: 'alone on their own phone', shared: 'on a phone shared with family or other students', classroom: 'in front of a whole class, on one phone' }[
        learner.deviceUsage
      ]
    }`,
  ].join('\n');

const PLAN_SHAPE = `{
  "title": "short lesson title",
  "subject": "physics | chemistry | biology | math | technology | ...",
  "hook": "one concrete question from the learner's everyday life that this lesson answers",
  "prediction": {
    "question": "a question the learner answers BEFORE seeing the experiment",
    "options": ["3 short options, one correct, the others common misconceptions"],
    "answerIndex": 0,
    "explanation": "why the correct answer is right and why the misconceptions are tempting"
  },
  "concepts": [{ "term": "...", "definition": "plain definition", "analogy": "concrete comparison from the learner's life" }],
  "steps": [{ "title": "...", "text": "one idea per step, tied to what the learner sees in the experiment" }],
  "example": { "statement": "worked example with real local numbers and units", "solution": "solved step by step" },
  "summary": "one sentence to remember",
  "simulation": {
    "description": "what the interactive experiment shows, including what is normally invisible",
    "parameters": [{ "name": "camelCaseId", "label": "...", "unit": "...", "min": 0, "max": 10, "default": 5, "step": 0.5 }],
    "measurements": [{ "name": "camelCaseId", "label": "...", "unit": "...", "formula": "arithmetic of parameter names" }]
  }
}`;

export const buildPlanParts = ({ learner, question, image }: LessonRequest): InputPart[] => {
  const parts: InputPart[] = [
    {
      type: 'input_text',
      text: `You are Whybox, an exceptional teacher who makes hard ideas obvious, in the spirit of the best explainers:
start from a concrete question, go step by step, define every word, use examples from the learner's own life.

The learner:
${describeLearner(learner)}

Task: from the learner's ${image ? 'photo of a lesson (notebook, blackboard or textbook)' : 'question'}, plan ONE lesson built around
an interactive experiment that shows how the thing really works.

Personalization rules:
- Everyday examples must come from where the learner lives (places, objects, jobs, currency, weather) and from their interests.
- Adapt vocabulary and depth to the learner's level. Never talk down to them.
- If the learner uses the app in front of a class, phrase things so a teacher can read them aloud to a group.
- Write everything in ${languageName(learner.language)}. Calm, precise, respectful tone. No emojis, no exclamation marks.

Content rules:
- The science and the math must be exactly right.
- 2 to 4 concepts, 3 to 5 steps.
- The experiment has 2 to 4 parameters and 1 to 3 measurements.
- Each measurement formula is a plain arithmetic expression using only parameter names, numbers, + - * / ^, parentheses
  and sqrt, abs, sin, cos, tan, exp, log, pow, min, max, pi. Angles in formulas are in radians.
  A switch is a parameter with min 0, max 1, step 1, and appears as a factor in the formulas.
- Parameter ranges must be realistic and keep every measurement finite.

Answer with JSON only, exactly this shape:
${PLAN_SHAPE}`,
    },
  ];
  if (question) parts.push({ type: 'input_text', text: `Learner's question: ${question}` });
  if (image) parts.push({ type: 'input_image', image_url: image });
  return parts;
};

const extractJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(candidate);
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

/** Parses the model's plan and rejects anything the app could not use safely. */
export const parsePlan = (text: string): LessonPlan => {
  const plan = extractJson(text) as LessonPlan;
  const { simulation } = plan ?? {};
  if (!plan?.title || !plan.hook || !plan.prediction?.options?.length || !plan.steps?.length || !simulation) {
    throw new Error('Incomplete lesson plan');
  }
  if (!simulation.parameters?.length || !simulation.measurements?.length) throw new Error('Plan has no experiment');

  const defaults: Record<string, number> = {};
  for (const parameter of simulation.parameters) {
    if (!IDENTIFIER.test(parameter.name)) throw new Error(`Invalid parameter name "${parameter.name}"`);
    for (const key of ['min', 'max', 'default', 'step'] as const) parameter[key] = Number(parameter[key]);
    if (!(parameter.min <= parameter.default && parameter.default <= parameter.max)) throw new Error(`Invalid range for ${parameter.name}`);
    if (!(parameter.step > 0)) parameter.step = (parameter.max - parameter.min) / 100 || 1;
    defaults[parameter.name] = parameter.default;
  }
  for (const measurement of simulation.measurements) {
    if (!IDENTIFIER.test(measurement.name)) throw new Error(`Invalid measurement name "${measurement.name}"`);
    if (!Number.isFinite(evaluate(measurement.formula, defaults))) throw new Error(`Formula of ${measurement.name} is not finite`);
  }
  // Models tend to put the right answer first: shuffle so its position teaches nothing.
  const answerIndex = Math.min(Math.max(Number(plan.prediction.answerIndex) || 0, 0), plan.prediction.options.length - 1);
  const answer = plan.prediction.options[answerIndex];
  plan.prediction.options = shuffle(plan.prediction.options);
  plan.prediction.answerIndex = plan.prediction.options.indexOf(answer);
  plan.concepts ??= [];
  return plan;
};

export const validateLessonRequest = (body: LessonRequest): LessonRequest => {
  const { learner, question, image } = body ?? {};
  if (!learner || typeof learner.language !== 'string' || typeof learner.country !== 'string') throw new BadRequest('Missing learner');
  if (!question?.trim() && !image) throw new BadRequest('Provide a question or an image');
  if (question && question.length > 1000) throw new BadRequest('Question is too long');
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image)) throw new BadRequest('Unsupported image');
  return {
    learner: {
      role: learner.role === 'teacher' ? 'teacher' : 'student',
      levels: (learner.levels ?? []).slice(0, 3).map(String),
      country: learner.country.slice(0, 2),
      city: String(learner.city ?? '').slice(0, 60),
      language: learner.language.slice(0, 10),
      interests: (learner.interests ?? []).slice(0, 12).map((item) => String(item).slice(0, 40)),
      subjects: (learner.subjects ?? []).slice(0, 12).map((item) => String(item).slice(0, 40)),
      deviceUsage: ['own', 'shared', 'classroom'].includes(learner.deviceUsage) ? learner.deviceUsage : 'own',
    },
    question: question?.trim(),
    image,
  };
};
