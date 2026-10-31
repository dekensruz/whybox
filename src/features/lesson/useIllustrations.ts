// Illustrations of a lesson: generated once with Muse Image, in the background, then kept on the device.
import { useEffect, useRef, useState } from 'react';
import { downscale, loadImage, saveImage } from '@/lib/imageStore';
import { requestIllustration } from './api';
import { getLesson } from './lessonStore';
import type { IllustrationKind, Lesson } from './types';

const KINDS: IllustrationKind[] = ['hook', 'summary'];
const imageKey = (lessonId: string, kind: IllustrationKind) => `${lessonId}:${kind}`;

/** Object URLs of the lesson's illustrations, generating the missing ones without blocking the lesson. */
export function useIllustrations(lesson: Lesson | null, update: (patch: Partial<Lesson>) => unknown) {
  const [urls, setUrls] = useState<Partial<Record<IllustrationKind, string>>>({});
  const requested = useRef(new Set<string>());
  const scenes = lesson?.plan?.illustrations;

  // Generate what is missing, once per lesson and kind.
  useEffect(() => {
    if (!lesson || !scenes) return;
    KINDS.forEach((kind) => {
      const key = imageKey(lesson.id, kind);
      if (lesson.illustrated?.[kind] || requested.current.has(key)) return;
      requested.current.add(key);
      requestIllustration(scenes[kind], kind)
        .then((image) => downscale(image))
        .then((blob) => saveImage(key, blob))
        // Read the latest record: both illustrations may finish at the same time.
        .then(() => update({ illustrated: { ...getLesson(lesson.id)?.illustrated, [kind]: true } }))
        .catch(() => {
          /* the lesson works without its illustrations */
        });
    });
  }, [lesson, scenes, update]);

  // Load what is stored.
  const illustrated = lesson?.illustrated;
  const lessonId = lesson?.id;
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    const created: string[] = [];
    Promise.all(
      KINDS.map(async (kind) => {
        if (!illustrated?.[kind]) return [kind, undefined] as const;
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
  }, [lessonId, illustrated?.hook, illustrated?.summary]);

  return urls;
}
