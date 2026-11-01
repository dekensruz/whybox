import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { VerdictMark } from './Verdict';

export interface VictoryState {
  title: string;
  text?: string;
  /** 0 to 3: how directly the learner got there. */
  stars: number;
}

/** Stars for a level, from the number of settings tried before it was won. */
export const starsFor = (tries: number) => (tries <= 2 ? 3 : tries <= 5 ? 2 : 1);

function Star({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cx('size-10', filled ? 'verdict-pop text-accent' : 'text-line')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <path
        fill="currentColor"
        stroke="#14161A"
        strokeWidth="1.2"
        strokeLinejoin="round"
        d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
      />
    </svg>
  );
}

/** Shown over the experiment when a level is won: the mark, the stars one after the other, what was discovered. */
export function Victory({ victory, onClose }: { victory: VictoryState; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-paper/80 p-4 backdrop-blur-sm animate-[fade-in_0.25s_ease-out]">
      <div role="status" className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-line bg-surface px-6 py-7 text-center shadow-xl">
        <VerdictMark correct className="size-16" />
        <p className="text-[24px] font-semibold tracking-tight">{victory.title}</p>
        <div className="flex gap-2" aria-label={t('lesson.starsLabel', { count: victory.stars })}>
          {[0, 1, 2].map((index) => (
            <Star key={index} filled={index < victory.stars} delay={250 + index * 220} />
          ))}
        </div>
        {victory.text && <p className="leading-relaxed text-muted">{victory.text}</p>}
        <button type="button" onClick={onClose} className="mt-1 h-11 rounded-xl bg-ink px-6 font-medium text-paper hover:bg-ink/90">
          {t('lesson.continue')}
        </button>
      </div>
    </div>
  );
}
