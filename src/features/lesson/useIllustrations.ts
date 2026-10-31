// Illustrations of a lesson: generated once with Muse Image, in the background, then kept on the device.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LessonPlan } from '@shared/lesson';
import { downscale, loadImage, saveImage } from '@/lib/imageStore';
import { requestIllustration } from './api';
import { getLesson } from './lessonStore';
import type { IllustrationKind, Lesson } from './types';

/** Images generated at the same time: enough to be quick, few enough to stay under the API's rate limits. */
const PARALLEL = 2;
const imageKey = (lessonId: string, kind: IllustrationKind) => `${lessonId}:${kind}`;

/** The cards to illustrate, in the order the learner meets them, with their scene. */
const scenesOf = (plan: LessonPlan | undefined): Array<[IllustrationKind, string]> => {
  const scenes = plan?.illustrations;
  if (!scenes) return [];
  return [
    ['hook', scenes.hook] as [IllustrationKind, string],
    ...(scenes.concepts ?? []).map((scene, index): [IllustrationKind, string] => [`concept${index}`, scene]),
    ...(scenes.exercise ? [['exercise', scenes.exercise] as [IllustrationKind, string]] : []),
    ['summary', scenes.summary] as [IllustrationKind, string],
  ].filter(([, scene]) => scene);
};

/** Object URLs of the lesson's illustrations, generating the missing ones without blocking the lesson. */
export function useIllustrations(lesson: Lesson | null, update: (patch: Partial<Lesson>) => unknown) {
  const [urls, setUrls] = useState<Partial<Record<IllustrationKind, string>>>({});
  const requested = useRef(new Set<string>());
  const scenes = useMemo(() => scenesOf(lesson?.plan), [lesson?.plan]);

  // Generate what is missing, once per lesson and kind, a few at a time.
  useEffect(() => {
    if (!lesson || !scenes.length) return;
    const missing = scenes.filter(([kind]) => !lesson.illustrated?.[kind] && !requested.current.has(imageKey(lesson.id, kind)));
    missing.forEach(([kind]) => requested.current.add(imageKey(lesson.id, kind)));
    const queue = [...missing];
    const next = async (): Promise<void> => {
      const item = queue.shift();
      if (!item) return;
      const [kind, scene] = item;
      try {
        const blob = await downscale(await requestIllustration(scene, kind));
        await saveImage(imageKey(lesson.id, kind), blob);
        // Read the latest record: several illustrations may finish at the same time.
        update({ illustrated: { ...getLesson(lesson.id)?.illustrated, [kind]: true } });
      } catch {
        /* the lesson works without its illustrations */
      }
      return next();
    };
    for (let i = 0; i < PARALLEL; i++) void next();
  }, [lesson, scenes, update]);

  // Load what is stored.
  const lessonId = lesson?.id;
  const ready = scenes
    .map(([kind]) => kind)
    .filter((kind) => lesson?.illustrated?.[kind])
    .join(',');
  useEffect(() => {
    if (!lessonId || !ready) return;
    let cancelled = false;
    const created: string[] = [];
    Promise.all(
      (ready.split(',') as IllustrationKind[]).map(async (kind) => {
        const blob = await loadImage(imageKey(lessonId, kind));
        const url = blob ? URL.createObjectURL(blob) : undefined;
        if (url) created.push(url);
        return [kind, url] as const;
      }),
    ).then((entries) => !cancelled && setUrls(Object.fromEntries(entries.filter(([, url]) => url))));
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [lessonId, ready]);

  return urls;
}
