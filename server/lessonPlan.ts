// Step 1 of a lesson: understand what the learner asks and plan a personalized lesson.
import { evaluate } from '../shared/expression.js';
import type { CounterTour, HomeExperiment, LearnerContext, LearnerMemory, LessonPlan, LessonRequest, TourStep } from '../shared/lesson.js';
import { BadRequest } from './http.js';
import type { InputPart } from './meta.js';

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

const ADAPT_INSTRUCTIONS: Record<LearnerMemory['adapt'], string> = {
  simpler: 'Recent lessons were hard for this learner: use even simpler words, more comparisons, and smaller steps.',
  same: 'Keep the usual depth.',
  deeper: 'This learner understands quickly: you may add one more precise idea or a slightly harder example.',
};

const describeMemory = (memory: LearnerMemory | undefined) => {
  if (!memory || (memory.recentLessons.length === 0 && memory.wrongIdeas.length === 0)) return '';
  const lessons = memory.recentLessons
    .map((lesson) => {
      const prediction = lesson.predictionCorrect === null ? '' : lesson.predictionCorrect ? ', predicted right' : ', predicted wrong';
      const understanding = lesson.understanding ? `, said they understood: ${lesson.understanding}` : '';
      return `  - ${lesson.title} (${lesson.subject}${prediction}${understanding})`;
    })
    .join('\n');
  return [
    '',
    'What Whybox knows from this learner\'s previous lessons:',
    lessons && `- Recent lessons:\n${lessons}`,
    memory.wrongIdeas.length > 0 && `- Wrong ideas they recently had: ${memory.wrongIdeas.map((idea) => `"${idea}"`).join('; ')}`,
    `- ${ADAPT_INSTRUCTIONS[memory.adapt]}`,
    '- When it truly helps, connect to a previous lesson in one short sentence. If a past wrong idea is related, address it.',
  ]
    .filter(Boolean)
    .join('\n');
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
    describeMemory(learner.memory),
  ].join('\n');

export const PLAN_SHAPE = `{
  "title": "short lesson title, 2 to 6 words",
  "subject": "physics | chemistry | biology | math | technology | ...",
  "hook": "one short question about something the learner has surely seen or done, that this lesson answers",
  "prediction": {
    "question": "a short question the learner answers BEFORE seeing the experiment",
    "options": ["3 short options, one correct, the others the most common wrong ideas"],
    "answerIndex": 0,
    "explanation": "2 or 3 short sentences: why the right answer is right, and why the wrong ideas feel natural"
  },
  "concepts": [{ "term": "...", "definition": "one short sentence with everyday words", "analogy": "one short comparison with something the learner does or sees every day" }],
  "steps": [{
    "title": "short title",
    "text": "2 or 3 short sentences: what changed in the experiment and what it means",
    "observe": "one short sentence saying exactly where to look on the screen",
    "parameters": { "<parameter name>": "<value the experiment is set to for this step>" }
  }],
  "example": { "statement": "a small problem with simple round numbers and local currency or objects", "solution": "solved in short numbered lines" },
  "summary": "one short sentence that is true on its own",
  "homeExperiment": {
    "title": "short title",
    "materials": ["common household objects only"],
    "steps": ["short numbered actions, including how to hold the phone still and film for 3 to 8 seconds"],
    "target": "short English noun phrase naming the ONE object to track, e.g. \\"orange ball\\", \\"bottle cap\\"",
    "targetSizeCm": 6,
    "motion": "fall | swing | roll | float | other",
    "prediction": "what the learner should see, and what the lesson's law predicts, with a number when possible"
  },
  "simulation": {
    "dimension": "2d or 3d",
    "description": "what the interactive experiment shows, including what is normally invisible",
    "parameters": [{ "name": "camelCaseId", "label": "...", "unit": "...", "min": 0, "max": 10, "default": 5, "step": 0.5 }],
    "measurements": [{ "name": "camelCaseId", "label": "...", "unit": "...", "formula": "arithmetic of parameter names" }]
  }
}`;

/** Shared by the author and the editor of a lesson. */
export const WRITING_RULES = `Writing rules (the most important part of the job):
- Write so a 10-year-old who finds school hard understands everything on first reading, whatever the learner's real level.
  Only the numbers and formulas may follow the learner's level.
- Sentences of 15 words at most. One idea per sentence. Common, concrete words. Active voice.
- Never use a technical word without explaining it right away with simple words. Never explain a word with another hard word.
- Use few numbers, and round ones.
- Teach like the best explainers: start from what the learner already believes, show the surprise, then explain why.

Clarity rules (a child reads each sentence alone, with no help):
- The hook restates the learner's own question in plain words, as a real question a child would ask.
  It must make sense on its own. Bad: "When you talk on the phone, how do you know what is left?" Good: "How do you
  know how much money you have left after shopping?"
- Every example is literal and complete: who, what, which numbers. No riddles, no metaphors that need explaining,
  no mixing two situations in one sentence.
- Never bend the lesson to fit the learner's interests. Use an interest only if it is the most natural example anyway.

Context rules:
- Examples come from daily life the learner has surely experienced where they live: home, school, the market, cooking,
  carrying things, rain and sun, games, a phone, the road.
- Do not name famous places, lakes, mountains or monuments unless the learner's question names them:
  many children have never been there. Mention the learner's city at most once, only if it truly helps.
- Use a different example in each section. Never repeat the same image twice.

Truth rules:
- Simple never means vague: every definition says exactly what the thing is, in words a child knows.
- Every sentence must be scientifically true on its own. Never reverse cause and effect.
- Every measurement formula is the real law of physics, chemistry or math, not an invented approximation
  and no made-up correction terms. Unit conversions are explicit and correct.
- The summary must be a correct statement of the key idea, not a slogan.`;

export const buildPlanParts = ({ learner, question, image }: LessonRequest): InputPart[] => {
  const parts: InputPart[] = [
    {
      type: 'input_text',
      text: `You are Whybox, an exceptional teacher who makes hard ideas obvious.

The learner:
${describeLearner(learner)}

Task: from the learner's ${image ? 'photo of a lesson (notebook, blackboard or textbook)' : 'question'}, plan ONE lesson built around
an interactive experiment that shows how the thing really works.

${WRITING_RULES}

Lesson rules:
- Write everything in ${languageName(learner.language)}. Calm, warm, respectful tone. No emojis, no exclamation marks.
- If the learner uses the app in front of a class, phrase things so a teacher can read them aloud to a group.
- 2 or 3 concepts. 3 to 5 steps.
- The steps are a guided tour of the experiment: each step sets the experiment to a state (its "parameters")
  that makes one idea visible, then says where to look. The first step starts from the most familiar situation.
- The experiment has 2 to 4 parameters and 1 to 3 measurements.
- "homeExperiment": a real experiment the learner can do at home in 2 minutes and film, where ONE clearly visible
  object moves in a way that shows the lesson's law (a ball that falls or rolls, a pendulum made of string, an object
  that floats). Only safe, cheap, common objects: no fire, no mains electricity, no sharp tools, no chemicals.
  The phone stays still, the object stands out from the background. Use null if no such experiment fits the lesson.
- "dimension": choose "3d" only when depth, rotation or a spatial view is essential to understand the idea
  (the Earth, the Moon and the Sun, seasons, day and night, molecules and crystals, fields around a magnet,
  volumes and solids, light in space). Choose "2d" for everything else: circuits, graphs, forces on a plane, most math.
- Each measurement formula is a plain arithmetic expression using only parameter names, numbers, + - * / ^, parentheses
  and sqrt, abs, sin, cos, tan, exp, log, pow, min, max, pi. Angles in formulas are in radians.
  A switch is a parameter with min 0, max 1, step 1, and appears as a factor in the formulas.
  Its label names the object ("Interrupteur"), never one of its states ("Interrupteur fermé").
- Parameter ranges must be realistic and keep every measurement finite. Step values stay inside the ranges.

Answer with JSON only, exactly this shape:
${PLAN_SHAPE}`,
    },
  ];
  if (question) parts.push({ type: 'input_text', text: `Learner's question: ${question}` });
  if (image) parts.push({ type: 'input_image', image_url: image });
  return parts;
};

/**
 * Second pass by an editor agent: simplify the language, remove forced local references,
 * and catch statements that are not scientifically true.
 */
export const buildReviewParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You are the demanding editor and science checker of Whybox lessons.

The learner:
${describeLearner(learner)}

Rewrite the lesson below so it follows every rule, then return it.

${WRITING_RULES}

Checklist, apply each item to every field:
0. Read the hook, the prediction question and every example as a 10-year-old who knows nothing about the lesson.
   If any of them is confusing, ambiguous, or mixes two situations, rewrite it until it is obvious.
   The hook must be the learner's own question, said simply.
1. Split every sentence longer than 15 words. Replace every hard word with a simple one, or explain it right away.
2. Remove every reference to a famous place or landmark the learner may never have seen. Replace it with daily life.
3. Make sure no two sections use the same example.
4. Check every statement and every number. Fix anything false, vague, misleading, or with cause and effect reversed.
5. Check each simulation formula against the real law, term by term, with the units. Replace any invented formula
   with the correct one. Remove parameters that do not correspond to anything real, and update the steps accordingly.
6. Check the worked example step by step: it must use the same law as the experiment, and the arithmetic must be right.
7. Keep the language: ${languageName(learner.language)}. No emojis, no exclamation marks.

Keep "answerIndex" pointing to the correct option. Keep the formula syntax rules: only parameter names, numbers,
+ - * / ^, parentheses and sqrt, abs, sin, cos, tan, exp, log, pow, min, max, pi.
Answer with the complete lesson as JSON only, same shape:
${PLAN_SHAPE}

Lesson to edit:
${JSON.stringify(plan)}`,
  },
];

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

const MOTIONS: HomeExperiment['motion'][] = ['fall', 'swing', 'roll', 'float', 'other'];

/** Keeps a home experiment only if it is complete enough to be done and tracked. */
const normalizeHomeExperiment = (experiment: HomeExperiment | null | undefined): HomeExperiment | null => {
  if (!experiment || typeof experiment.target !== 'string' || !experiment.target.trim()) return null;
  const strings = (list: unknown, max: number) =>
    (Array.isArray(list) ? list : []).filter((item): item is string => typeof item === 'string').slice(0, max);
  const size = Number(experiment.targetSizeCm);
  const steps = strings(experiment.steps, 8);
  if (steps.length === 0) return null;
  return {
    title: String(experiment.title ?? '').slice(0, 80),
    materials: strings(experiment.materials, 8),
    steps,
    target: experiment.target.trim().slice(0, 60),
    targetSizeCm: Number.isFinite(size) && size > 0 && size < 200 ? size : 5,
    motion: MOTIONS.includes(experiment.motion) ? experiment.motion : 'other',
    prediction: String(experiment.prediction ?? '').slice(0, 400),
  };
};

/** Each step drives the experiment: keep only known parameters, clamped to their range. */
const normalizeSteps = (steps: TourStep[], plan: LessonPlan): TourStep[] => {
  const ranges = new Map(plan.simulation.parameters.map((parameter) => [parameter.name, parameter]));
  return steps
    .filter((step) => step && typeof step.title === 'string' && typeof step.text === 'string')
    .map((step) => ({
      title: step.title,
      text: step.text,
      observe: typeof step.observe === 'string' ? step.observe : '',
      parameters: Object.fromEntries(
        Object.entries(step.parameters ?? {})
          .filter(([name, value]) => ranges.has(name) && Number.isFinite(Number(value)))
          .map(([name, value]) => {
            const { min, max } = ranges.get(name)!;
            return [name, Math.min(max, Math.max(min, Number(value)))];
          }),
      ),
    }));
};

/** A short guided tour, on the same experiment, designed to let the learner test their own wrong idea. */
export const buildCounterParts = (plan: LessonPlan, idea: string, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You are Whybox. Before the lesson, the learner predicted something wrong.

The learner:
${describeLearner(learner)}

The lesson: ${plan.title}. ${plan.hook}
The learner's wrong idea: "${idea}"
The right answer: "${plan.prediction.options[plan.prediction.answerIndex]}"

The interactive experiment they will use:
${plan.simulation.description}
Parameters: ${plan.simulation.parameters.map((p) => `${p.name} (${p.label}, ${p.min} to ${p.max} ${p.unit})`).join('; ')}

Design a short guided tour, 2 or 3 steps, that takes the learner's idea seriously and tests it on the experiment:
first a situation where their idea seems to work or would predict something precise, then the situation that shows it fails,
then what really decides. The learner must SEE the contradiction, not be told they are wrong.

${WRITING_RULES}

Write in ${languageName(learner.language)}. Warm and respectful: their idea is natural, many people have it.
Answer with JSON only:
{
  "intro": "one or two short sentences that restate their idea kindly and invite them to test it",
  "steps": [{ "title": "...", "text": "...", "observe": "where to look", "parameters": { "<parameter name>": <value> } }]
}`,
  },
];

export const parseCounter = (text: string, plan: LessonPlan, idea: string): CounterTour => {
  const tour = extractJson(text) as Partial<CounterTour>;
  const steps = normalizeSteps(Array.isArray(tour.steps) ? tour.steps : [], plan).slice(0, 4);
  if (typeof tour.intro !== 'string' || steps.length === 0) throw new Error('Incomplete counter tour');
  return { idea, intro: tour.intro, steps };
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
  simulation.dimension = simulation.dimension === '3d' ? '3d' : '2d';
  plan.homeExperiment = normalizeHomeExperiment(plan.homeExperiment);
  plan.steps = normalizeSteps(plan.steps, plan);

  // Models tend to put the right answer first: shuffle so its position teaches nothing.
  const answerIndex = Math.min(Math.max(Number(plan.prediction.answerIndex) || 0, 0), plan.prediction.options.length - 1);
  const answer = plan.prediction.options[answerIndex];
  plan.prediction.options = shuffle(plan.prediction.options);
  plan.prediction.answerIndex = plan.prediction.options.indexOf(answer);
  plan.concepts ??= [];
  return plan;
};

const text = (value: unknown, max: number) => String(value ?? '').slice(0, max);

const sanitizeMemory = (memory: LearnerMemory | undefined): LearnerMemory | undefined => {
  if (!memory || typeof memory !== 'object') return undefined;
  const understandings = ['clear', 'partly', 'lost'];
  return {
    recentLessons: (Array.isArray(memory.recentLessons) ? memory.recentLessons : []).slice(0, 8).map((lesson) => ({
      title: text(lesson?.title, 80),
      subject: text(lesson?.subject, 40),
      predictionCorrect: typeof lesson?.predictionCorrect === 'boolean' ? lesson.predictionCorrect : null,
      understanding: understandings.includes(lesson?.understanding as string) ? lesson.understanding : null,
    })),
    wrongIdeas: (Array.isArray(memory.wrongIdeas) ? memory.wrongIdeas : []).slice(0, 5).map((idea) => text(idea, 160)),
    adapt: memory.adapt === 'simpler' || memory.adapt === 'deeper' ? memory.adapt : 'same',
  };
};

/** Keeps only well-formed, bounded learner data: it is written into prompts. */
export const sanitizeLearner = (learner: LearnerContext | undefined): LearnerContext => {
  if (!learner || typeof learner.language !== 'string' || typeof learner.country !== 'string') throw new BadRequest('Missing learner');
  return {
    role: learner.role === 'teacher' ? 'teacher' : 'student',
    levels: (learner.levels ?? []).slice(0, 3).map(String),
    country: learner.country.slice(0, 2),
    city: text(learner.city, 60),
    language: learner.language.slice(0, 10),
    interests: (learner.interests ?? []).slice(0, 12).map((item) => text(item, 40)),
    subjects: (learner.subjects ?? []).slice(0, 12).map((item) => text(item, 40)),
    deviceUsage: ['own', 'shared', 'classroom'].includes(learner.deviceUsage) ? learner.deviceUsage : 'own',
    memory: sanitizeMemory(learner.memory),
  };
};

export const validateLessonRequest = (body: LessonRequest): LessonRequest => {
  const { learner, question, image } = body ?? {};
  if (!question?.trim() && !image) throw new BadRequest('Provide a question or an image');
  if (question && question.length > 1000) throw new BadRequest('Question is too long');
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image)) throw new BadRequest('Unsupported image');
  return { learner: sanitizeLearner(learner), question: question?.trim(), image };
};
