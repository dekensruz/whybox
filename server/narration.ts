// What the tutor says aloud on each card: the lesson rewritten for the ear, read by the device's speech synthesis.
import type { LearnerContext, LessonPlan, Narration } from '../shared/lesson.js';
import { describeLearner, WRITING_RULES } from './lessonPlan.js';
import type { InputPart } from './meta.js';

const NARRATION_SHAPE = `{
  "hook": "what the tutor says on the opening card",
  "prediction": "invites the learner to choose an answer, reading the question and the options",
  "steps": [{ "intro": "what the tutor says when the step appears", "found": "challenge steps only: said once the learner has found it" }],
  "concepts": ["one per concept, in the same order"],
  "exercise": "introduces the exercise, without giving the answer",
  "missions": "invites the learner to play the missions",
  "summary": "says what to remember"
}`;

export const buildNarrationParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You are the voice of Whybox: a warm, patient teacher who explains out loud, sitting next to the learner.

The learner:
${describeLearner(learner)}

Write what you say on each card of the lesson below. The learner also sees the card, so do not read it word for
word: say it the way a great teacher talks, more simply than the text.

Rules for speech:
- 1 to 3 short sentences per card, at most 40 words. Talk to the learner directly, warmly, like a person, not a book.
- Words for the ear: no symbols, no abbreviations, no parentheses, no lists. Write units in full words
  ("kilomètres à l'heure", not "km/h"; "pour cent", not "%"). Round numbers only.
- Point at the screen when it helps ("Regarde la flèche jaune").
- For a challenge step, "intro" asks the question and encourages the learner to search, without the answer;
  "found" congratulates briefly and explains what they found. Steps without a challenge have no "found".
- Never give away the answer to the prediction or the exercise before the learner has answered.

${WRITING_RULES}

Write in the language of the lesson. Exactly ${plan.steps.length} steps and ${plan.concepts.length} concepts.
Answer with JSON only, exactly this shape:
${NARRATION_SHAPE}

The lesson:
${JSON.stringify({
  hook: plan.hook,
  prediction: plan.prediction,
  steps: plan.steps.map(({ title, text, observe, challenge }) => ({ title, text, observe, challenge: challenge?.question })),
  concepts: plan.concepts,
  exercise: plan.exercise?.question,
  missions: plan.missions?.map((mission) => mission.goal),
  summary: plan.summary,
})}`,
  },
];

const line = (value: unknown, max = 400) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const parseNarration = (text: string, plan: LessonPlan): Narration => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = JSON.parse(fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
  const steps = Array.isArray(raw.steps) ? (raw.steps as Array<Record<string, unknown>>) : [];
  const concepts = Array.isArray(raw.concepts) ? raw.concepts : [];
  const narration: Narration = {
    hook: line(raw.hook),
    prediction: line(raw.prediction),
    // A missing line falls back to the card's own text, read as it is.
    steps: plan.steps.map((step, index) => ({
      intro: line(steps[index]?.intro) || step.challenge?.question || step.text,
      ...(step.challenge && { found: line(steps[index]?.found) || step.text }),
    })),
    concepts: plan.concepts.map((concept, index) => line(concepts[index]) || `${concept.term}. ${concept.definition}`),
    ...(plan.exercise && { exercise: line(raw.exercise) || plan.exercise.question }),
    ...(plan.missions?.length && { missions: line(raw.missions) }),
    summary: line(raw.summary) || plan.summary,
  };
  if (!narration.hook || !narration.prediction) throw new Error('Narration is incomplete');
  return narration;
};
