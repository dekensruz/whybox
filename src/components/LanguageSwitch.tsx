import { useI18n, type UiLanguage } from '@/i18n';
import { cx } from '@/lib/cx';

const LANGUAGES: UiLanguage[] = ['fr', 'en'];

export function LanguageSwitch() {
  const { language, setLanguage } = useI18n();
  return (
    <div role="group" aria-label="Language" className="flex rounded-full border border-line p-0.5 text-xs font-medium">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={cx('h-7 rounded-full px-3 uppercase transition-colors', language === code ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
