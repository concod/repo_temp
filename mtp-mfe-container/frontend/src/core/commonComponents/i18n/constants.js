export const LANGUAGE_TO_LOCALE_MAP = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES"
};

export const LOCALE_TO_LANGUAGE_MAP = Object.fromEntries(
  Object.entries(LANGUAGE_TO_LOCALE_MAP).map(([lang, locale]) => [locale, lang])
);
