// What to learn next: questions chosen for one learner, from their profile and from what their lessons showed.
import type { LearnerContext } from '../shared/lesson.js';
import { describeLearner } from './lessonPlan.js';
import type { InputPart } from './meta.js';

export type SuggestionKind = 'review' | 'next' | 'discover';

export interface Suggestion {
  question: string;
  subject: string;
  kind: SuggestionKind;
  /** Why this question, for this learner, in one short sentence addressed to them. */
  reason: string;
}

/** What the learner's lessons showed, sent with the request: what they did, how well, and what to revisit. */
export interface LearningRecord {
  lessons: Array<{ title: string; subject: string; mastery: number }>;
  toReview: string[];
}

export const buildSuggestionParts = (learner: LearnerContext, record: LearningRecord): InputPart[] => [
  {
    type: 'input_text',
    text: `You are Whybox, a teacher who knows this learner well and chooses what they should discover next.

The learner:
${describeLearner(learner)}

Their lessons so far (mastery from 0 to 1, measured from their predictions, challenges, exercise and own answer):
${record.lessons.length ? record.lessons.map((lesson) => `- ${lesson.title} (${lesson.subject}): ${lesson.mastery.toFixed(2)}`).join('\n') : '- none yet'}
To revisit: ${record.toReview.join('; ') || 'nothing'}

Suggest exactly 6 questions this learner would love to explore next, as they would ask them:
- 2 "review": the same idea as a lesson they struggled with, seen from a new everyday situation
  (if nothing needs review, make them "next" instead).
- 2 "next": the natural next step after what they understood well, a little further.
- 2 "discover": something new about how the world works, linked to their interests or the subjects they find hard,
  at their level.
Rules:
- Each question is short (at most 12 words), concrete, from daily life where they live, and is a real "why" or "how"
  a child asks. Never repeat a lesson they already did.
- Every question can be explored with an experiment: science, math, technology, or a situation with people.
- "reason" talks to the learner in one short sentence (at most 14 words), says why this question is for them,
  and never mentions scores.
- Write in the language of the lesson. No emojis, no exclamation marks.

Answer with JSON only: { "suggestions": [{ "question": "...", "subject": "physics | chemistry | biology | math | technology | life", "kind": "review | next | discover", "reason": "..." }] }`,
  },
];

const KINDS: SuggestionKind[] = ['review', 'next', 'discover'];

export const parseSuggestions = (text: string): Suggestion[] => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = JSON.parse(fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { suggestions?: unknown };
  const list = (Array.isArray(raw.suggestions) ? raw.suggestions : []) as Array<Record<string, unknown>>;
  const suggestions = list
    .filter((item) => typeof item.question === 'string' && item.question.trim())
    .map((item) => ({
      question: String(item.question).trim().slice(0, 140),
      subject: String(item.subject ?? 'life').slice(0, 30),
      kind: KINDS.includes(item.kind as SuggestionKind) ? (item.kind as SuggestionKind) : 'discover',
      reason: String(item.reason ?? '').trim().slice(0, 160),
    }))
    .slice(0, 6);
  if (!suggestions.length) throw new Error('No suggestion');
  return suggestions;
};
