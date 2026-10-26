import { cx } from '@/lib/cx';

interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function Chip({ label, selected, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cx(
        'h-11 rounded-full border px-4 text-[15px] transition-colors',
        selected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-ink/30',
      )}
    >
      {label}
    </button>
  );
}
