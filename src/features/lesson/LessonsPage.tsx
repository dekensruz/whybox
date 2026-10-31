import { useMemo } from 'react';
import { Page } from '@/components/Page';
import { useI18n } from '@/i18n';
import { LessonList } from './LessonList';
import { listLessons } from './lessonStore';

export function LessonsPage() {
  const { t } = useI18n();
  const lessons = useMemo(listLessons, []);
  return (
    <Page title={t('lessons.title')} subtitle={t('lessons.subtitle')}>
      {lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm leading-relaxed text-subtle">{t('lessons.empty')}</p>
      ) : (
        <LessonList lessons={lessons} />
      )}
    </Page>
  );
}
