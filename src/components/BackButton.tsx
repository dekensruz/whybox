import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="-ml-2 flex size-10 items-center justify-center rounded-full text-muted hover:text-ink"
      aria-label={t('common.back')}
    >
      <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
