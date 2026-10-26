import { cx } from '@/lib/cx';

interface ChoiceCardProps {
  title: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
  multiple?: boolean;
}

/** Large selectable card used for single or multiple choice questions. */
export function ChoiceCard({ title, hint, selected, onSelect, multiple = false }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'flex w-full items-center gap-4 rounded-2xl border bg-surface px-5 py-4 text-left transition-colors',
        selected ? 'border-ink' : 'border-line hover:border-ink/30',
      )}
    >
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          'flex size-5 shrink-0 items-center justify-center border transition-colors',
          multiple ? 'rounded-md' : 'rounded-full',
          selected ? 'border-ink bg-ink' : 'border-line',
        )}
      >
        {selected && <span className={cx('bg-paper', multiple ? 'size-2 rounded-[2px]' : 'size-2 rounded-full')} />}
      </span>
    </button>
  );
}
