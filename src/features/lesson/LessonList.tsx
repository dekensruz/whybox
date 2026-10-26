import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@/components/icons';
import { useI18n } from '@/i18n';
import type { Lesson } from './types';

/** Lessons as a simple list, newest first, each opening the lesson. */
export function LessonList({ lessons }: { lessons: Lesson[] }) {
  const { t, language } = useI18n();
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {lessons.map((lesson) => {
        const state = lesson.status === 'failed' ? t('lessons.failed') : lesson.status !== 'ready' ? t('lessons.preparing') : null;
        return (
          <li key={lesson.id}>
            <Link to={`/lesson/${lesson.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">{lesson.plan?.title ?? lesson.question ?? t('lesson.newLesson')}</span>
                <span className="text-sm text-muted">
                  {new Date(lesson.createdAt).toLocaleDateString(language, { day: 'numeric', month: 'long' })}
                  {state && ` · ${state}`}
                </span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-subtle" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
