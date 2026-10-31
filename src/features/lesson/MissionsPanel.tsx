import type { Mission, SimulationMeasurement } from '@shared/lesson';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';

interface MissionsPanelProps {
  missions: Mission[];
  measurements: SimulationMeasurement[];
  /** Current measurements of the experiment, once the learner has moved a control. */
  measures: Record<string, number> | null;
  /** How many missions are complete; they are played in order. */
  reached: number;
  language: string;
}

/** The challenges of the experiment, one at a time: the current one, what it shows now, and what each success taught. */
export function MissionsPanel({ missions, measurements, measures, reached, language }: MissionsPanelProps) {
  const { t } = useI18n();
  const format = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: Math.abs(value) >= 10 ? 1 : 2 }).format(value);
  const done = reached >= missions.length;

  return (
    <div className="flex flex-col gap-3">
      <p className="leading-relaxed text-muted">{t('lesson.missionsIntro')}</p>
      <ol className="flex flex-col gap-3">
        {missions.map((mission, position) => {
          const state = position < reached ? 'done' : position === reached ? 'active' : 'next';
          const measurement = measurements.find((item) => item.name === mission.measurement);
          const value = measures?.[mission.measurement];
          return (
            <li
              key={position}
              className={cx(
                'rounded-2xl border px-4 py-3 transition-colors',
                state === 'active' && 'border-ink bg-surface',
                state === 'done' && 'border-line bg-surface',
                state === 'next' && 'border-line text-subtle',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    state === 'done' ? 'bg-ink text-paper' : 'border border-current',
                  )}
                  aria-hidden
                >
                  {state === 'done' ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    position + 1
                  )}
                </span>
                <p className={cx('leading-snug', state === 'active' && 'font-medium')}>{mission.goal}</p>
              </div>
              {state === 'active' && value !== undefined && measurement && (
                <p className="mt-2 pl-9 text-sm tabular-nums text-muted">
                  {t('lesson.missionNow', { value: `${format(value)}${measurement.unit ? ` ${measurement.unit}` : ''}` })}
                </p>
              )}
              {state === 'done' && (
                <div className="slide-from-right mt-2 pl-9">
                  <p className="text-sm font-medium">{t('lesson.missionReached')}</p>
                  <p className="text-sm leading-relaxed text-muted">{mission.success}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {done && (
        <p role="status" className="slide-from-right border-l-2 border-accent pl-3 font-medium">
          {t('lesson.missionsDone')}
        </p>
      )}
    </div>
  );
}
