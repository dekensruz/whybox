import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '@/app/SessionProvider';
import { CameraIcon, ChevronRightIcon, FlameIcon, QuestionIcon, RefreshIcon, StarIcon, TrophyIcon } from '@/components/icons';
import { Page } from '@/components/Page';
import { learnerFromProfile, type Suggestion } from '@/features/lesson/api';
import { LessonCard, SUBJECT_TINTS, useSubjectLabel } from '@/features/lesson/LessonCard';
import { createLesson, listLessons } from '@/features/lesson/lessonStore';
import { useLessonImage } from '@/features/lesson/useLessonImage';
import type { Lesson } from '@/features/lesson/types';
import { progression, type Progression } from '@/features/progress/progression';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { useSuggestions } from './useSuggestions';

const RECENT = 3;

/** The dashboard: where the learner stands, what to pick up, and what Whybox chose for them to discover next. */
export function HomePage() {
  const { t } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const lessons = useMemo(listLessons, []);
  const progress = useMemo(() => progression(lessons), [lessons]);
  const learner = useMemo(() => (profile ? learnerFromProfile(profile) : null), [profile]);
  const { suggestions, loading, failed, refresh } = useSuggestions(learner, lessons);
  const last = lessons.find((lesson) => lesson.plan);

  const start = (question: string) => {
    const lesson = createLesson({ question });
    navigate(`/lesson/${lesson.id}`);
  };

  return (
    <Page wide>
      <div className="flex flex-col gap-2 pb-6 pt-8 lg:pt-0">
        <p className="text-muted">{t('home.greeting', { name: profile?.firstName ?? '' })}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance lg:text-[32px]">{t('home.prompt')}</h1>
      </div>

      <ProgressStrip progress={progress} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard title={t('home.question')} hint={t('home.questionHint')} icon={<QuestionIcon />} to="/lesson/new/question" primary />
            <ActionCard title={t('home.photo')} hint={t('home.photoHint')} icon={<CameraIcon />} to="/lesson/new/photo" />
          </div>

          {last && <ContinueCard lesson={last} />}

          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight">{t('dashboard.forYou')}</h2>
                <p className="text-sm text-muted">{t('dashboard.forYouHint')}</p>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink/30 disabled:opacity-50"
              >
                <RefreshIcon className={cx('size-4', loading && 'animate-spin')} />
                {t('dashboard.moreIdeas')}
              </button>
            </div>
            {loading && !suggestions ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl bg-line/60" />
                ))}
              </div>
            ) : suggestions ? (
              <div className={cx('grid gap-3 sm:grid-cols-2', loading && 'opacity-60')}>
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard key={`${suggestion.question}-${index}`} suggestion={suggestion} onStart={() => start(suggestion.question)} />
                ))}
              </div>
            ) : (
              failed && <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-subtle">{t('dashboard.suggestionsFailed')}</p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[20px] font-semibold tracking-tight">{t('home.recent')}</h2>
              {lessons.length > RECENT && (
                <Link to="/lessons" className="text-sm font-medium text-ink">
                  {t('dashboard.seeAll')}
                </Link>
              )}
            </div>
            {lessons.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-subtle">{t('home.empty')}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {lessons.slice(0, RECENT).map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <SubjectsPanel progress={progress} />
          <BadgesPanel progress={progress} />
        </aside>
      </div>
    </Page>
  );
}

/** Level, points, days in a row, stars and the week, at a glance. */
function ProgressStrip({ progress }: { progress: Progression }) {
  const { t, language } = useI18n();
  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-paper">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-paper/70">{t('dashboard.level')}</span>
          <span className="text-xl font-semibold leading-none">{progress.level}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-sm text-muted">{t('dashboard.points', { points: progress.levelPoints, size: progress.levelSize })}</p>
          <span className="h-2.5 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${(progress.levelPoints / progress.levelSize) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:border-l sm:border-line sm:pl-4">
        <FlameIcon className={cx('size-8', progress.streak > 0 ? 'text-[#E0663A]' : 'text-subtle')} />
        <div>
          <p className="text-xl font-semibold tabular-nums">{progress.streak}</p>
          <p className="text-xs text-muted">{t('dashboard.streak')}</p>
        </div>
        <div className="ml-auto flex gap-1">
          {progress.week.map(({ date, active }) => (
            <span key={date.toDateString()} className="flex flex-col items-center gap-1">
              <span className={cx('size-2.5 rounded-full', active ? 'bg-[#E0663A]' : 'bg-line')} />
              <span className="text-[10px] text-subtle">{date.toLocaleDateString(language, { weekday: 'narrow' })}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:border-l sm:border-line sm:pl-4">
        <StarIcon className="size-8 text-accent" />
        <div>
          <p className="text-xl font-semibold tabular-nums">{progress.stars}</p>
          <p className="text-xs text-muted">{t('dashboard.stars')}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-semibold tabular-nums">{progress.lessonsDone}</p>
          <p className="text-xs text-muted">{t('dashboard.lessonsDone')}</p>
        </div>
      </div>
    </div>
  );
}

function ContinueCard({ lesson }: { lesson: Lesson }) {
  const { t } = useI18n();
  const image = useLessonImage(lesson);
  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="group relative flex min-h-44 overflow-hidden rounded-3xl bg-ink text-paper"
      style={{ background: image ? undefined : SUBJECT_TINTS[lesson.plan?.subject ?? ''] ?? undefined }}
    >
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />}
      <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
      <span className="relative mt-auto flex w-full items-end justify-between gap-4 p-5">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-paper/75">{t('dashboard.continueHint')}</span>
          <span className="text-[22px] font-semibold leading-tight tracking-tight">{lesson.plan!.title}</span>
        </span>
        <span className="shrink-0 rounded-xl bg-paper px-4 py-2.5 text-sm font-semibold text-ink">{t('dashboard.continue')}</span>
      </span>
    </Link>
  );
}

const KIND_STYLES: Record<Suggestion['kind'], string> = {
  review: 'bg-accent-soft text-ink',
  next: 'bg-[#DCEBDD] text-ink',
  discover: 'bg-[#D7E7F4] text-ink',
};

function SuggestionCard({ suggestion, onStart }: { suggestion: Suggestion; onStart: () => void }) {
  const { t } = useI18n();
  const subjectLabel = useSubjectLabel();
  return (
    <button
      type="button"
      onClick={onStart}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md"
    >
      <span className="flex items-center gap-2">
        <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', KIND_STYLES[suggestion.kind])}>{t(`dashboard.kinds.${suggestion.kind}`)}</span>
        <span className="text-xs text-muted">{subjectLabel(suggestion.subject)}</span>
      </span>
      <span className="text-[17px] font-medium leading-snug">{suggestion.question}</span>
      {suggestion.reason && <span className="text-sm leading-relaxed text-muted">{suggestion.reason}</span>}
      <span className="mt-auto flex items-center gap-1 text-sm font-semibold">
        {t('dashboard.explore')}
        <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function SubjectsPanel({ progress }: { progress: Progression }) {
  const { t } = useI18n();
  const subjectLabel = useSubjectLabel();
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{t('dashboard.subjectsTitle')}</h2>
      {progress.subjects.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">{t('dashboard.subjectsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {progress.subjects.slice(0, 5).map(({ subject, lessons, mastery }) => (
            <li key={subject} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{subjectLabel(subject)}</span>
                <span className="text-xs text-muted">{t('dashboard.subjectLessons', { count: lessons })}</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-positive" style={{ width: `${Math.round(mastery * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/progress" className="flex items-center justify-between text-sm font-medium">
        {t('progress.title')}
        <ChevronRightIcon className="size-4 text-subtle" />
      </Link>
    </section>
  );
}

function BadgesPanel({ progress }: { progress: Progression }) {
  const { t } = useI18n();
  const earned = progress.badges.filter((badge) => badge.earned);
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{t('dashboard.badgesTitle')}</h2>
        <span className="text-xs text-muted">{t('dashboard.badgesCount', { earned: earned.length, total: progress.badges.length })}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {progress.badges.map((badge) => (
          <span
            key={badge.id}
            title={t(`badges.${badge.id}`)}
            className={cx(
              'flex aspect-square items-center justify-center rounded-xl',
              badge.earned ? 'bg-accent-soft text-ink' : 'bg-paper text-line',
            )}
          >
            <TrophyIcon className="size-5" />
          </span>
        ))}
      </div>
    </section>
  );
}

function ActionCard({ title, hint, icon, to, primary = false }: { title: string; hint: string; icon: ReactNode; to: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cx(
        'flex items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
        primary ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
      )}
    >
      <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-xl', primary ? 'bg-accent text-ink' : 'bg-paper text-ink')}>{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
      <ChevronRightIcon className="size-5 text-subtle" />
    </Link>
  );
}
