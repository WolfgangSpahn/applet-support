export type Language = "de" | "en" | "fr";

export type TranslationEntry =
  Partial<Record<Language, string>>;

export type TranslationTable =
  Record<string, TranslationEntry>;

let currentLanguage: Language = "en";
let translations: TranslationTable = {};

/**
 * Set active language and translation table.
 *
 * Example:
 *
 *   import translations from "./multilang.js";
 *
 *   setLanguage("de", translations);
 */
export function setLanguage(
  lang: Language,
  table: TranslationTable
): void {
  currentLanguage = lang;
  translations = table;
}

/**
 * Return currently active language.
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Translate a text using the current language.
 *
 * Fallback:
 * selected language -> English -> original text
 *
 * Example:
 *
 *   _("Chemistry")
 */
export function _(text: string): string {
  const entry = translations[text];

  return entry?.[currentLanguage]
    ?? entry?.en
    ?? text;
}