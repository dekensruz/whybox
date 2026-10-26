// Lessons are kept on the device for now, newest first.
import { readJson, writeJson } from '@/lib/storage';
import type { Lesson } from './types';

const KEY = 'whybox.lessons';
const MAX_LESSONS = 30;

export const listLessons = (): Lesson[] => readJson<Lesson[]>(KEY) ?? [];

export const getLesson = (id: string) => listLessons().find((lesson) => lesson.id === id) ?? null;

export const saveLesson = (lesson: Lesson) => {
  const others = listLessons().filter((item) => item.id !== lesson.id);
  // The photo is only needed until the lesson is planned.
  const stored = lesson.plan ? { ...lesson, image: undefined } : lesson;
  writeJson(KEY, [stored, ...others].slice(0, MAX_LESSONS));
};

export const createLesson = (input: { question?: string; image?: string }): Lesson => {
  const lesson: Lesson = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'planning', ...input };
  saveLesson(lesson);
  return lesson;
};
