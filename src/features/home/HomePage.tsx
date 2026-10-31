import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { CameraIcon, ChevronRightIcon, QuestionIcon } from '@/components/icons';
import { Page } from '@/components/Page';
import { LessonList } from '@/features/lesson/LessonList';
import { listLessons } from '@/features/lesson/lessonStore';
import { progressStats } from '@/features/progress/progressStats';
import { useI18n } from '@/i18n';

const RECENT = 5;

/** The dashboard: start a lesson, pick up the last one, see progress at a glance. */
export function HomePage() {
  const { t } = useI18n();
  const { profile } = useSession();
  const lessons = useMemo(listLessons, []);
  const stats = useMemo(() => progressStats(lessons), [lessons]);
  const last = lessons.find((lesson) => lesson.plan);

  return (
    <Page wide>
      <div className="flex flex-col gap-2 pb-8 pt-8 lg:pt-0">
        <p className="text-muted">{t('home.greeting', { name: profile?.firstName ?? '' })}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">{t('home.prompt')}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard title={t('home.photo')} hint={t('home.photoHint')} icon={<CameraIcon />} to="/lesson/new/photo" />
            <ActionCard title={t('home.question')} hint={t('home.questionHint')} icon={<QuestionIcon />} to="/lesson/new/question" />
          </div>

          {last && (
            <Link
              to={`/lesson/${last.id}`}
              className="flex items-center gap-4 rounded-2xl bg-ink px-5 py-5 text-paper transition-colors hover:bg-ink/90"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-paper/70">{t('dashboard.continueHint')}</span>
                <span className="truncate font-medium">{last.plan!.title}</span>
              </span>
              <span className="text-sm font-medium">{t('dashboard.continue')}</span>
            </Link>
          )}

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-muted">{t('home.recent')}</h2>
              {lessons.length > RECENT && (
                <Link to="/lessons" className="text-sm font-medium text-ink">
                  {t('dashboard.seeAll')}
                </Link>
              )}
            </div>
            {lessons.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-subtle">{t('home.empty')}</p>
            ) : (
              <LessonList lessons={lessons.slice(0, RECENT)} />
            )}
          </section>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted">{t('dashboard.statsTitle')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t('dashboard.lessonsDone')} value={stats.lessonsDone} />
            <Stat label={t('dashboard.predictionsRight')} value={stats.predictions ? `${stats.predictionsRight}/${stats.predictions}` : '0'} />
            <Stat label={t('dashboard.ideasTested')} value={stats.ideasTested} />
            <Stat label={t('dashboard.realExperiments')} value={stats.realExperiments} />
          </div>
          <Link to="/progress" className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-medium">
            {t('progress.title')}
            <ChevronRightIcon className="size-5 text-subtle" />
          </Link>
        </section>
      </div>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-snug text-muted">{label}</p>
    </div>
  );
}

function ActionCard({ title, hint, icon, to }: { title: string; hint: string; icon: ReactNode; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-5 text-left transition-colors hover:border-ink/30"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
      <ChevronRightIcon className="size-5 text-subtle" />
    </Link>
  );
}
