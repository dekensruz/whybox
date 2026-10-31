import { useMemo, type ReactNode } from 'react';
import { Page } from '@/components/Page';
import { listLessons } from '@/features/lesson/lessonStore';
import { SUBJECTS } from '@/features/profile/types';
import { useI18n } from '@/i18n';
import { progressStats } from './progressStats';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{title}</h2>
      {children}
    </section>
  );
}

/** What Whybox learned about the learner, shown openly: subjects, understanding, ideas to revisit, how lessons adapt. */
export function ProgressPage() {
  const { t } = useI18n();
  const stats = useMemo(() => progressStats(listLessons()), []);
  const answered = stats.understanding.clear + stats.understanding.partly + stats.understanding.lost;

  return (
    <Page title={t('progress.title')} subtitle={t('progress.subtitle')}>
      <div className="flex flex-col gap-10">
        <Block title={t('progress.adaptTitle')}>
          <p className="border-l-2 border-accent pl-4 leading-relaxed">{t(`progress.adapt.${stats.adapt}`)}</p>
        </Block>

        <Block title={t('progress.understandingTitle')}>
          {answered === 0 ? (
            <p className="leading-relaxed text-muted">{t('progress.understandingEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(['clear', 'partly', 'lost'] as const).map((level) => (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-muted">
                    {t(level === 'clear' ? 'lesson.understandingClear' : level === 'partly' ? 'lesson.understandingPartly' : 'lesson.understandingLost')}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-ink"
                      style={{ width: `${(stats.understanding[level] / answered) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-sm tabular-nums">{stats.understanding[level]}</span>
                </div>
              ))}
            </div>
          )}
        </Block>

        {stats.subjects.length > 0 && (
          <Block title={t('progress.subjects')}>
            <div className="flex flex-wrap gap-2">
              {stats.subjects.map(({ subject, count }) => (
                <span key={subject} className="rounded-full border border-line bg-surface px-4 py-2 text-sm">
                  {(SUBJECTS as readonly string[]).includes(subject) ? t(`options.subjects.${subject as (typeof SUBJECTS)[number]}`) : subject} · {count}
                </span>
              ))}
            </div>
          </Block>
        )}

        <Block title={t('progress.ideasTitle')}>
          <p className="leading-relaxed text-muted">{t('progress.ideasHint')}</p>
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
