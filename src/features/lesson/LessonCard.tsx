import { Link } from 'react-router-dom';
import { StarIcon } from '@/components/icons';
import { SUBJECTS } from '@/features/profile/types';
import { lessonMastery } from '@/features/progress/progression';
import { useI18n, type MessageKey } from '@/i18n';
import { cx } from '@/lib/cx';
import type { Lesson } from './types';
import { useLessonImage } from './useLessonImage';

/** A calm color per subject, for lessons that have no picture yet. */
export const SUBJECT_TINTS: Record<string, string> = {
  physics: '#D7E7F4',
  math: '#FDF3D8',
  chemistry: '#E8E1F2',
  biology: '#DCEBDD',
  technology: '#F3E2DA',
};

export const useSubjectLabel = () => {
  const { t } = useI18n();
  return (subject: string) =>
    (SUBJECTS as readonly string[]).includes(subject) ? t(`options.subjects.${subject}` as MessageKey) : subject.charAt(0).toUpperCase() + subject.slice(1);
};

/** A lesson with its picture, subject, stars and how well it was understood. */
export function LessonCard({ lesson, compact = false }: { lesson: Lesson; compact?: boolean }) {
  const { t, language } = useI18n();
  const image = useLessonImage(lesson);
  const subjectLabel = useSubjectLabel();
  const subject = lesson.plan?.subject;
  const state = lesson.status === 'failed' ? t('lessons.failed') : lesson.status !== 'ready' ? t('lessons.preparing') : null;
  const stars = lesson.outcome?.stars ?? 0;
  const mastery = lesson.outcome ? lessonMastery(lesson) : null;

  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className={cx(
        'group flex overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md',
        compact ? 'items-center gap-4 p-3' : 'flex-col',
      )}
    >
      <div
        className={cx('shrink-0 overflow-hidden bg-paper', compact ? 'size-16 rounded-xl' : 'aspect-[3/2] w-full')}
        style={{ background: subject ? SUBJECT_TINTS[subject] : undefined }}
      >
        {image && <img src={image} alt="" className="h-full w-full animate-[fade-in_0.4s_ease-out] object-cover" />}
      </div>
      <div className={cx('flex min-w-0 flex-1 flex-col gap-1.5', !compact && 'p-4')}>
        <div className="flex items-center gap-2 text-xs text-muted">
          {subject && <span className="font-semibold uppercase tracking-[0.08em]">{subjectLabel(subject)}</span>}
          <span>{new Date(lesson.createdAt).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</span>
          {state && <span className="text-accent">· {state}</span>}
        </div>
        <p className={cx('font-medium leading-snug', compact ? 'truncate' : 'line-clamp-2')}>
          {lesson.plan?.title ?? lesson.question ?? t('lesson.newLesson')}
        </p>
        {lesson.outcome && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-medium tabular-nums">
              <StarIcon className="size-4 text-accent" />
              {stars}
            </span>
            {mastery !== null && (
              <span className="flex flex-1 items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-positive" style={{ width: `${Math.round(mastery * 100)}%` }} />
                </span>
                <span className="text-xs tabular-nums text-muted">{Math.round(mastery * 100)}%</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
