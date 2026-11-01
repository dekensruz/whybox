import { useMemo, type ReactNode } from 'react';
import { FlameIcon, StarIcon, TrophyIcon } from '@/components/icons';
import { Page } from '@/components/Page';
import { LessonCard, useSubjectLabel } from '@/features/lesson/LessonCard';
import { listLessons } from '@/features/lesson/lessonStore';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { progressStats } from './progressStats';
import { progression } from './progression';

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-relaxed text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * The learner's journey, shown openly: level and points, days in a row, mastery of each subject, badges,
 * lessons worth revisiting, ideas tested, and how Whybox adapts the next lessons to them.
 */
export function ProgressPage() {
  const { t, language } = useI18n();
  const subjectLabel = useSubjectLabel();
  const lessons = useMemo(listLessons, []);
  const progress = useMemo(() => progression(lessons), [lessons]);
  const stats = useMemo(() => progressStats(lessons), [lessons]);

  return (
    <Page title={t('progress.title')} subtitle={t('progress.subtitle')} wide>
      <div className="flex flex-col gap-12">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="flex flex-col justify-between gap-4 rounded-3xl bg-ink p-5 text-paper sm:col-span-2">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-paper/70">{t('dashboard.level')}</p>
              <p className="text-sm text-paper/70 tabular-nums">{t('progress.totalPoints', { points: progress.points })}</p>
            </div>
            <p className="text-[44px] font-semibold leading-none">{progress.level}</p>
            <div className="flex flex-col gap-1.5">
              <span className="h-2.5 overflow-hidden rounded-full bg-paper/20">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(progress.levelPoints / progress.levelSize) * 100}%` }} />
              </span>
              <p className="text-xs text-paper/70">{t('dashboard.points', { points: progress.levelPoints, size: progress.levelSize })}</p>
            </div>
          </div>
          <Tile icon={<FlameIcon className="size-7 text-[#E0663A]" />} value={progress.streak} label={t('dashboard.streak')}>
            <div className="flex gap-1">
              {progress.week.map(({ date, active }) => (
                <span key={date.toDateString()} className="flex flex-1 flex-col items-center gap-1">
                  <span className={cx('h-6 w-full rounded-md', active ? 'bg-[#E0663A]' : 'bg-line')} />
                  <span className="text-[10px] text-subtle">{date.toLocaleDateString(language, { weekday: 'narrow' })}</span>
                </span>
              ))}
            </div>
          </Tile>
          <Tile icon={<StarIcon className="size-7 text-accent" />} value={progress.stars} label={t('dashboard.stars')}>
            <p className="text-sm text-muted">{t('progress.lessonsFollowed', { count: progress.lessonsDone })}</p>
          </Tile>
        </div>

        <Block title={t('progress.adaptTitle')}>
          <p className="rounded-2xl border border-accent bg-accent-soft px-5 py-4 leading-relaxed">{t(`progress.adapt.${stats.adapt}`)}</p>
        </Block>

        <Block title={t('dashboard.subjectsTitle')} hint={t('progress.masteryHint')}>
          {progress.subjects.length === 0 ? (
            <p className="text-sm text-muted">{t('dashboard.subjectsEmpty')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {progress.subjects.map(({ subject, lessons: count, mastery }) => (
                <div key={subject} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                  <MasteryRing value={mastery} />
                  <div>
                    <p className="font-semibold">{subjectLabel(subject)}</p>
                    <p className="text-sm text-muted">{t('dashboard.subjectLessons', { count })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Block>

        <Block title={t('dashboard.badgesTitle')} hint={t('dashboard.badgesCount', { earned: progress.badges.filter((badge) => badge.earned).length, total: progress.badges.length })}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {progress.badges.map((badge) => (
              <div
                key={badge.id}
                className={cx(
                  'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center',
                  badge.earned ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-subtle',
                )}
              >
                <span className={cx('flex size-11 items-center justify-center rounded-full', badge.earned ? 'bg-accent text-ink' : 'bg-paper')}>
                  <TrophyIcon className="size-6" />
                </span>
                <span className="text-sm font-medium leading-snug">{t(`badges.${badge.id}`)}</span>
              </div>
            ))}
          </div>
        </Block>

        {progress.toReview.length > 0 && (
          <Block title={t('progress.reviewTitle')} hint={t('progress.reviewHint')}>
            <div className="grid gap-3 sm:grid-cols-3">
              {progress.toReview.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} compact />
              ))}
            </div>
          </Block>
        )}

        <Block title={t('progress.ideasTitle')} hint={t('progress.ideasHint')}>
          {stats.wrongIdeas.length === 0 ? (
            <p className="text-sm text-subtle">{t('progress.noIdeas')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
              {stats.wrongIdeas.map(({ idea, lesson }, index) => (
                <li key={index} className="flex flex-col gap-0.5 px-5 py-4">
                  <span className="italic leading-relaxed">{idea}</span>
                  <span className="text-sm text-muted">{lesson}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </Page>
  );
}

function Tile({ icon, value, label, children }: { icon: ReactNode; value: number; label: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-semibold leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted">{label}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Mastery from 0 to 1 as a ring with its percentage. */
function MasteryRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 22;
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r="22" fill="none" stroke="#E6E4DE" strokeWidth="5" />
        <circle cx="26" cy="26" r="22" fill="none" stroke="#2E7D5B" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${circumference * value} ${circumference}`} />
      </svg>
      <span className="text-xs font-semibold tabular-nums">{Math.round(value * 100)}%</span>
    </span>
  );
}
