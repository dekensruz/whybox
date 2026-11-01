import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** A mark that pops in: a check for a right answer, a cross for a wrong one. */
export function VerdictMark({ correct, className }: { correct: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'verdict-pop flex shrink-0 items-center justify-center rounded-full text-paper',
        correct ? 'bg-positive' : 'bg-negative',
        className ?? 'size-12',
      )}
    >
      <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {correct ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7 7 17" />}
      </svg>
    </span>
  );
}

/** An answer shown with its verdict: the learner's choice, and the right one when it differs. */
export function AnswerLine({ correct, label, children }: { correct: boolean; label: string; children: ReactNode }) {
  return (
    <div className={cx('flex items-start gap-3 rounded-2xl border-2 px-4 py-3', correct ? 'border-positive bg-positive/5' : 'border-negative bg-negative/5')}>
      <VerdictMark correct={correct} className="mt-0.5 size-6" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <p className="font-medium leading-snug">{children}</p>
      </div>
    </div>
  );
}
