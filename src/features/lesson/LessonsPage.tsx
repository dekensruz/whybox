import { useMemo, useState } from 'react';
import { Page } from '@/components/Page';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { LessonCard, useSubjectLabel } from './LessonCard';
import { listLessons } from './lessonStore';

/** Every lesson as a card with its picture, stars and mastery, filtered by subject. */
export function LessonsPage() {
  const { t } = useI18n();
  const subjectLabel = useSubjectLabel();
  const lessons = useMemo(listLessons, []);
  const subjects = useMemo(() => [...new Set(lessons.map((lesson) => lesson.plan?.subject).filter((subject): subject is string => Boolean(subject)))], [lessons]);
  const [subject, setSubject] = useState<string | null>(null);
  const shown = subject ? lessons.filter((lesson) => lesson.plan?.subject === subject) : lessons;

  return (
    <Page title={t('lessons.title')} subtitle={t('lessons.subtitle')} wide>
      {lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm leading-relaxed text-subtle">{t('lessons.empty')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {subjects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {[null, ...subjects].map((item) => (
                <button
                  key={item ?? 'all'}
                  type="button"
                  onClick={() => setSubject(item)}
                  className={cx(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    subject === item ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/30',
                  )}
                >
                  {item ? subjectLabel(item) : t('lessons.all')}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
