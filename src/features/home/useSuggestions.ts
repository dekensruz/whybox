// Questions chosen for this learner by Whybox. Kept for the day on the device, and renewed when the learner finishes
// a lesson or asks for other ideas.
import { useCallback, useEffect, useState } from 'react';
import type { LearnerContext } from '@shared/lesson';
import { requestSuggestions, type Suggestion } from '@/features/lesson/api';
import { buildLearnerMemory } from '@/features/lesson/learnerMemory';
import type { Lesson } from '@/features/lesson/types';
import { lessonMastery } from '@/features/progress/progression';
import { readJson, writeJson } from '@/lib/storage';

const KEY = 'whybox.suggestions';

interface Stored {
  /** What the suggestions were made from: the day, the language and the lessons followed. */
  basis: string;
  suggestions: Suggestion[];
}

const basisOf = (learner: LearnerContext, lessons: Lesson[]) =>
  [new Date().toDateString(), learner.language, lessons.filter((lesson) => lesson.outcome).length].join('|');

export function useSuggestions(learner: LearnerContext | null, lessons: Lesson[]) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(() => readJson<Stored>(KEY)?.suggestions ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!learner) return;
      const basis = basisOf(learner, lessons);
      const stored = readJson<Stored>(KEY);
      if (!force && stored?.basis === basis) return setSuggestions(stored.suggestions);
      setLoading(true);
      setFailed(false);
      try {
        const done = lessons.filter((lesson) => lesson.plan && lesson.outcome);
        const next = await requestSuggestions(
          { ...learner, memory: buildLearnerMemory(lessons) },
          {
            lessons: done.slice(0, 20).map((lesson) => ({ title: lesson.plan!.title, subject: lesson.plan!.subject, mastery: lessonMastery(lesson) })),
            toReview: done.filter((lesson) => lessonMastery(lesson) < 0.55).map((lesson) => lesson.plan!.title),
          },
        );
        writeJson(KEY, { basis, suggestions: next } satisfies Stored);
        setSuggestions(next);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [learner, lessons],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { suggestions, loading, failed, refresh: () => load(true) };
}
