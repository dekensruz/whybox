// The opening picture of a lesson, from the device, to show the lesson in lists.
import { useEffect, useState } from 'react';
import { loadImage } from '@/lib/imageStore';
import type { Lesson } from './types';

export function useLessonImage(lesson: Lesson) {
  const [url, setUrl] = useState<string | undefined>();
  const ready = Boolean(lesson.illustrated?.hook);
  useEffect(() => {
    if (!ready) return;
    let created: string | undefined;
    let cancelled = false;
    loadImage(`${lesson.id}:hook`).then((blob) => {
      if (!blob || cancelled) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [lesson.id, ready]);
  return url;
}
