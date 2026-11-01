import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';

interface TutorProps {
  speaking: boolean;
  /** Says the card again, or stops while speaking. */
  onToggle: () => void;
}

/** The tutor's portrait: it glows while speaking, and a tap replays the card or stops the voice. */
export function Tutor({ speaking, onToggle }: TutorProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={speaking ? t('lesson.tutorStop') : t('lesson.tutorListen')}
      aria-pressed={speaking}
      className="relative size-12 shrink-0 rounded-full"
    >
      <span
        aria-hidden
        className={cx('absolute -inset-1 rounded-full border-2 border-accent transition-opacity', speaking ? 'tutor-talking opacity-100' : 'opacity-0')}
      />
      <img src="/tutor.jpg" alt="" className="size-12 rounded-full border border-line object-cover" />
      {!speaking && (
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-ink text-paper">
          <svg viewBox="0 0 12 12" className="size-2.5" fill="currentColor">
            <path d="M3.5 2.2v7.6L9.6 6z" />
          </svg>
        </span>
      )}
    </button>
  );
}
