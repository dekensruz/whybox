// Step 1 of a lesson: understand what the learner asks and plan a personalized lesson.
import { challengeStart } from '../shared/challenge.js';
import { evaluate } from '../shared/expression.js';
import type {
  AnswerCheck,
  CounterTour,
  Exercise,
  HomeExperiment,
  LearnerContext,
  LearnerMemory,
  LessonPlan,
  LessonRequest,
  Mission,
  StepChallenge,
  TourStep,
} from '../shared/lesson.js';
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
    "challenge": {
      "question": "challenge steps only: what the learner must find by moving the controls, without giving the answer away",
      "find": ["<the parameter names the learner must change; every other parameter starts at this step's value>"],
      "measurement": "<measurement name>",
      "min": 0,
      "max": 100
    },
    "text": "2 or 3 short sentences: what changed in the experiment and what it means (for a challenge: what the learner just found and why)",
    "observe": "one short sentence saying exactly where to look on the screen",
    "parameters": { "<parameter name>": "<value the experiment is set to for this step; for a challenge, one solution>" }
  }],
  "exercise": {
    "kind": "number | choice | explain",
    "question": "a short exercise the learner answers alone, about the lesson's key idea",
    "options": ["choice only: 3 short options"],
    "answerIndex": 0,
    "answer": 12,
    "unit": "number only: the unit, e.g. m",
    "tolerance": 0.05,
    "expected": "explain only: the key idea a correct answer must contain",
    "hints": ["a first gentle hint that does not give the answer", "a second hint, closer to the answer"],
    "solution": "the full correct answer, explained in short lines"
  },
  "summary": "one short sentence that is true on its own",
  "missions": [{ "goal": "a short challenge, e.g. Make the bulb shine without burning it", "measurement": "<measurement name>", "min": 2, "max": 3, "success": "one short sentence on what this shows" }],
  "illustrations": {
    "hook": "in English: one everyday scene that makes the opening question visible, as a painter would see it",
    "summary": "in English: one scene that shows the key idea in action, different from the hook scene",
    "concepts": ["in English: one scene per concept, in the same order, showing its everyday analogy"],
    "exercise": "in English: the situation of the exercise, without showing its answer"
  },
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
- The summary must be a correct statement of the key idea, not a slogan.

Word rules:
- A technical word (lift, density, current, friction...) never appears before the thing it names has been shown.
  The first time it appears, it is explained in the same sentence: "the push of the air under the wing, which we
  call lift". This holds everywhere: steps, challenges, labels of controls and measurements, missions.
- A comparison must work the same way as the real thing, not just look like it. A boat floating does not explain
  a wing flying. If no true everyday comparison exists, describe what the learner can feel or see instead.
- Quantities are ones a child can picture: seconds, metres, kilograms, francs, how many times bigger, a percent.
  No newtons, joules, pascals or watts unless the learner's level and question are about that unit; prefer a
  measurement that compares (the push of the air as a percent of the weight) to an unfamiliar unit.
- Labels of controls and measurements are 1 to 4 everyday words that name the thing ("Vitesse de l'avion",
  "Pente de l'aile", "Poussée de l'air"), with no explanation inside: the unit goes in "unit", and what the
  numbers mean is said in a step.
- Questions and challenges ask about the idea, never describe gestures on the screen ("touch the bar with your
  finger"): the learner already knows how to move a control.

The voice to imitate (examples in French; write in the language of the lesson). Each pair: what we write badly,
then how a great teacher says it:
- Mauvais : « L'air ne glisse pas sur l'aile. L'air ne pousse donc pas l'aile vers le haut. »
  Bon : « Sors ta main par la fenêtre d'un taxi qui roule. Tu sens l'air qui la pousse ? Penche-la un peu :
  ta main monte toute seule. Une aile d'avion, c'est cette main, en très grand. »
- Mauvais : « Regarde la portance, elle est à zéro. »
  Bon : « Regarde la flèche jaune : c'est l'air qui pousse l'aile vers le haut. Pour l'instant, il n'y en a pas. »
- Mauvais : « La portance augmente avec le carré de la vitesse. »
  Bon : « Plus l'avion va vite, plus l'air pousse fort. Deux fois plus vite, et l'air pousse quatre fois plus fort. »
- Mauvais : « La masse volumique de l'eau est supérieure à celle de l'huile. »
  Bon : « Prends une bouteille d'eau et une bouteille d'huile de la même taille. Celle d'eau est plus lourde.
  C'est pour ça que l'huile reste au-dessus. »`;

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
- The steps are a tour of the experiment where the learner discovers the idea by acting, not by reading.
  Each step has a state (its "parameters") that makes one idea visible. The first step sets the most familiar
  situation and has no challenge. From the second step on, at least two steps are challenges: instead of being shown
  the state, the learner must find it by moving the controls, e.g. "With 500 francs, how many breads can you buy at
  most? Move the controls to find out." The step's own parameters must be a solution (the challenge's measurement
  inside [min, max]). "find" names the controls the learner changes (usually one); the challenge starts with them at
  the previous step's values and every other control at this step's values, which are the givens stated in the
  question. That starting state must not already solve it. The challenge question never gives the answer away.
  Steps without a challenge leave out the "challenge" field.
- The experiment has 2 to 4 parameters and 1 to 3 measurements.
- "exercise": choose the kind that best makes the learner practise the lesson's idea, like a good teacher would:
  "number" ONLY when the lesson is about quantities (speed, money, current, area); "choice" to spot a mistake,
  predict a situation or decide true or false; "explain" for why-questions ("Why does wet laundry dry faster in the sun?").
  Never invent numbers for a lesson that is not about quantities. Keep only the fields of the chosen kind.
  The exercise is a NEW situation where the same idea applies (wet laundry in the lesson, a puddle on the road in the
  exercise): it checks that the learner can use the idea, so it never repeats the hook or the prediction.
- "missions": 2 or 3 challenges played in the experiment after the guided tour, from easy to harder, each asking to
  bring one measurement into a range by changing the controls. A mission makes the learner use the idea (not luck),
  and its range must not include the measurement's value with the default settings.
- "illustrations": concrete scenes from the learner's daily life where they live (people, objects, place, light),
  described in one or two English sentences each: the hook, the summary, one per concept showing its analogy, and the
  exercise's situation. Every scene is different. No text, letters, numbers or diagrams in the scenes.
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
/** Everything the learner reads in a lesson, in the order they read it, each with where it comes from. */
const readableText = (plan: LessonPlan): string =>
  [
    `hook: ${plan.hook}`,
    `prediction.question: ${plan.prediction.question}`,
    ...plan.prediction.options.map((option, index) => `prediction.options[${index}]: ${option}`),
    `prediction.explanation: ${plan.prediction.explanation}`,
    ...plan.simulation.parameters.map((parameter, index) => `simulation.parameters[${index}].label: ${parameter.label} (${parameter.unit})`),
    ...plan.simulation.measurements.map((measurement, index) => `simulation.measurements[${index}].label: ${measurement.label} (${measurement.unit})`),
    ...plan.steps.flatMap((step, index) => [
      `steps[${index}].title: ${step.title}`,
      ...(step.challenge ? [`steps[${index}].challenge.question: ${step.challenge.question}`] : []),
      `steps[${index}].text: ${step.text}`,
      `steps[${index}].observe: ${step.observe}`,
    ]),
    ...plan.concepts.flatMap((concept, index) => [
      `concepts[${index}]: ${concept.term}. ${concept.definition} ${concept.analogy}`,
    ]),
    ...(plan.exercise ? [`exercise.question: ${plan.exercise.question}`, `exercise.solution: ${plan.exercise.solution}`] : []),
    ...(plan.missions ?? []).map((mission, index) => `missions[${index}].goal: ${mission.goal}`),
    `summary: ${plan.summary}`,
  ].join('\n');

/**
 * A young reader agent: reads the lesson as a 10-year-old who finds school hard, and says exactly where they get lost.
 * Its notes go to the editor, who rewrites until a child would understand everything.
 */
export const buildChildReadParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You are a 10-year-old child who lives in ${countryName(learner.country)} and finds school hard. You read well
enough, but you only know everyday words. You have never studied this subject.

Read this lesson line by line, honestly, as that child. Note every place where you get lost:
- a word you do not know, or that is used before anyone told you what it means;
- a sentence you have to read twice, or that is abstract (you cannot picture anything);
- a comparison that does not help you, or that seems to say something else;
- a number or unit you cannot picture (what is a newton?);
- a question or challenge where you do not know what you are asked to do.

The lesson (field: text):
${readableText(plan)}

Answer with JSON only: { "notes": [{ "field": "steps[0].observe", "quote": "the words that lose you", "why": "what you did not understand, in a child's words" }] }
At most 12 notes, the most blocking first. If you understand everything, notes is empty.`,
  },
];

export const parseChildRead = (text: string): string[] => {
  const read = extractJson(text) as { notes?: Array<{ field?: unknown; quote?: unknown; why?: unknown }> };
  return (Array.isArray(read.notes) ? read.notes : [])
    .slice(0, 12)
    .map((note) => `${String(note.field ?? '')}: "${String(note.quote ?? '')}" (${String(note.why ?? '')})`);
};

export const buildReviewParts = (plan: LessonPlan, learner: LearnerContext, childNotes: string[] = []): InputPart[] => [
  {
    type: 'input_text',
    text: `You are the demanding editor and science checker of Whybox lessons.

The learner:
${describeLearner(learner)}

Rewrite the lesson below so it follows every rule, then return it.
${
  childNotes.length
    ? `
A 10-year-old read this lesson and got lost at these places. Fix every one of them, and anything similar elsewhere:
${childNotes.map((note) => `- ${note}`).join('\n')}
`
    : ''
}

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
6. Check the exercise: its kind fits the lesson (no invented numbers), the answer is right, the arithmetic is right,
   and no hint gives the answer away.
7. Check the challenges of the steps: each question is clear, never gives the answer away, and the step's parameters
   really bring its measurement inside [min, max]. Keep at least two challenges from the second step on.
8. Keep the language: ${languageName(learner.language)}. No emojis, no exclamation marks.

Keep "answerIndex" pointing to the correct option. Keep the formula syntax rules: only parameter names, numbers,
+ - * / ^, parentheses and sqrt, abs, sin, cos, tan, exp, log, pow, min, max, pi.
Answer with the complete lesson as JSON only, same shape:
${PLAN_SHAPE}

Lesson to edit:
${JSON.stringify(plan)}`,
  },
];

/** Checks a learner's written explanation like a kind teacher: what is right, and one hint about what is missing. */
export const buildAnswerCheckParts = (plan: LessonPlan, exercise: Exercise, answer: string, attempt: number, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You are Whybox, a kind and precise teacher. A learner answered an exercise in their own words.

The learner:
${describeLearner(learner)}

The lesson: ${plan.title}. ${plan.summary}
The exercise: ${exercise.question}
${exercise.kind === 'explain' ? `A correct answer must contain this idea: ${exercise.expected}` : ''}
The full solution (never reveal it): ${exercise.solution}
This is the learner's attempt number ${attempt}.

The learner's answer: "${answer}"

Decide if the answer is correct: the key idea is there, even with simple words or spelling mistakes.
If it is correct: one or two short sentences that say what was right, using their words.
If it is not: one or two short sentences that start from what they wrote, name what is missing or wrong without
giving the answer, and ask a small question that helps them find it. Never mock, never say "wrong" bluntly.

${WRITING_RULES}

Write in ${languageName(learner.language)}. Answer with JSON only: { "correct": true or false, "feedback": "..." }`,
  },
];

export const parseAnswerCheck = (text: string): AnswerCheck => {
  const check = extractJson(text) as Partial<AnswerCheck>;
  if (typeof check.correct !== 'boolean' || typeof check.feedback !== 'string') throw new Error('Unreadable answer check');
  return { correct: check.correct, feedback: check.feedback.slice(0, 500) };
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

const GRID_STEPS = 12;

/**
 * Keeps only missions that can really be won: the controls are swept on a grid and a mission is kept if some
 * setting brings its measurement into range (and the default setting does not already win it).
 */
const reachableMissions = (raw: unknown, plan: LessonPlan): Mission[] => {
  const { parameters, measurements } = plan.simulation;
  const formulas = new Map(measurements.map((m) => [m.name, m.formula]));
  const candidates = (Array.isArray(raw) ? raw : []).slice(0, 4) as Array<Partial<Mission>>;
  const axes = parameters.map((p) =>
    p.min === 0 && p.max === 1 && p.step === 1 ? [0, 1] : Array.from({ length: GRID_STEPS + 1 }, (_, i) => p.min + ((p.max - p.min) * i) / GRID_STEPS),
  );
  // Every combination of the grid (small: at most 4 controls).
  const settings = axes.reduce<Array<Record<string, number>>>(
    (combinations, values, index) => combinations.flatMap((combination) => values.map((value) => ({ ...combination, [parameters[index].name]: value }))),
    [{}],
  );
  const defaults = Object.fromEntries(parameters.map((p) => [p.name, p.default]));

  return candidates
    .filter((mission) => typeof mission.goal === 'string' && typeof mission.measurement === 'string' && formulas.has(mission.measurement))
    .map((mission) => ({
      goal: mission.goal!.slice(0, 160),
      measurement: mission.measurement!,
      min: Math.min(Number(mission.min), Number(mission.max)),
      max: Math.max(Number(mission.min), Number(mission.max)),
      success: String(mission.success ?? '').slice(0, 200),
    }))
    .filter((mission) => {
      if (!Number.isFinite(mission.min) || !Number.isFinite(mission.max)) return false;
      const formula = formulas.get(mission.measurement)!;
      const inRange = (setting: Record<string, number>) => {
        const value = evaluate(formula, setting);
        return Number.isFinite(value) && value >= mission.min && value <= mission.max;
      };
      return !inRange(defaults) && settings.some(inRange);
    })
    .slice(0, 3);
};

/** Keeps a well-formed exercise of one kind, or nothing: a broken exercise is worse than none. */
const normalizeExercise = (raw: unknown): Exercise | undefined => {
  const exercise = raw as Record<string, unknown> | undefined;
  if (!exercise || typeof exercise.question !== 'string' || typeof exercise.solution !== 'string') return undefined;
  const base = {
    question: exercise.question.slice(0, 400),
    hints: (Array.isArray(exercise.hints) ? exercise.hints : []).filter((hint): hint is string => typeof hint === 'string').slice(0, 2),
    solution: exercise.solution.slice(0, 800),
  };
  if (exercise.kind === 'number' && Number.isFinite(Number(exercise.answer))) {
    const tolerance = Number(exercise.tolerance);
    return {
      ...base,
      kind: 'number',
      answer: Number(exercise.answer),
      unit: String(exercise.unit ?? '').slice(0, 12),
      tolerance: tolerance > 0 && tolerance < 0.5 ? tolerance : 0.05,
    };
  }
  if (exercise.kind === 'choice' && Array.isArray(exercise.options) && exercise.options.length >= 2) {
    const options = exercise.options.filter((option): option is string => typeof option === 'string').slice(0, 4);
    const answer = options[Math.min(Math.max(Number(exercise.answerIndex) || 0, 0), options.length - 1)];
    const shuffled = shuffle(options);
    return { ...base, kind: 'choice', options: shuffled, answerIndex: shuffled.indexOf(answer) };
  }
  if (exercise.kind === 'explain' && typeof exercise.expected === 'string') {
    return { ...base, kind: 'explain', expected: exercise.expected.slice(0, 400) };
  }
  return undefined;
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
  const formulas = new Map(plan.simulation.measurements.map((m) => [m.name, m.formula]));
  const defaults = Object.fromEntries(plan.simulation.parameters.map((p) => [p.name, p.default]));
  const tour = steps
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
      challenge: step.challenge as Partial<StepChallenge> | undefined,
    }));

  // A challenge is kept only if the step's own state solves it and the state the learner starts from does not:
  // the learner always has something to find, and it can be found.
  return tour.map(({ challenge, ...step }, index): TourStep => {
    const formula = formulas.get(String(challenge?.measurement));
    if (index === 0 || !challenge || typeof challenge.question !== 'string' || !formula) return step;
    const min = Math.min(Number(challenge.min), Number(challenge.max));
    const max = Math.max(Number(challenge.min), Number(challenge.max));
    const solves = (state: Record<string, number>) => {
      const value = evaluate(formula, state);
      return Number.isFinite(value) && value >= min && value <= max;
    };
    const find = (Array.isArray(challenge.find) ? challenge.find : []).filter((name) => ranges.has(name));
    const start = challengeStart(defaults, tour[index - 1].parameters, step.parameters, find);
    if (!Number.isFinite(min) || !Number.isFinite(max) || solves(start) || !solves({ ...defaults, ...step.parameters })) return step;
    return { ...step, challenge: { question: challenge.question.slice(0, 300), find, measurement: challenge.measurement!, min, max } };
  });
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
  plan.exercise = normalizeExercise(plan.exercise);
  plan.missions = reachableMissions(plan.missions, plan);
  const scenes = plan.illustrations;
  const scene = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 400) : undefined);
  plan.illustrations =
    scenes && scene(scenes.hook) && scene(scenes.summary)
      ? {
          hook: scene(scenes.hook)!,
          summary: scene(scenes.summary)!,
          concepts: (Array.isArray(scenes.concepts) ? scenes.concepts : []).slice(0, (plan.concepts ?? []).length).map((item) => scene(item) ?? ''),
          ...(scene(scenes.exercise) && plan.exercise && { exercise: scene(scenes.exercise) }),
        }
      : undefined;
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
