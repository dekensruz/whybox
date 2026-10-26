import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '@/lib/storage';
import { en } from './en';
import { fr, type Messages } from './fr';

export type UiLanguage = 'fr' | 'en';

const MESSAGES: Record<UiLanguage, Messages> = { fr, en };
const STORAGE_KEY = 'whybox.ui-language';

/** Dotted paths to every string, e.g. "home.greeting". */
type Path<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Path<T[K]>}`;
}[keyof T & string];
export type MessageKey = Path<Messages>;

const detectLanguage = (): UiLanguage => {
  const saved = readStorage(STORAGE_KEY);
  if (saved === 'fr' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
};

const lookup = (messages: Messages, key: string): string => {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
  return typeof value === 'string' ? value : key;
};

interface I18nValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    writeStorage(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) =>
        Object.entries(params ?? {}).reduce(
          (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
          lookup(MESSAGES[language], key),
        ),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
};
