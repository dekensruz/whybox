// Country names as people say them. The browser's names are sometimes awkward ("Congo - Kinshasa"),
// so the most common cases are given explicitly.
const OVERRIDES: Record<string, Record<string, string>> = {
  fr: { CD: 'RD Congo', CG: 'Congo-Brazzaville' },
  en: { CD: 'DR Congo', CG: 'Republic of the Congo' },
};

export const countryName = (code: string, language: string) => {
  const override = OVERRIDES[language]?.[code];
  if (override) return override;
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};
