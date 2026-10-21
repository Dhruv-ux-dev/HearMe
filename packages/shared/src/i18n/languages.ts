import type { LangCode } from '../types';

export interface LanguageInfo {
  code: LangCode;
  /** Name in the language itself, shown on language pickers. */
  nativeName: string;
  englishName: string;
  /** BCP-47 tag used for text-to-speech and `lang` attributes. */
  bcp47: string;
}

/**
 * ASSUMPTION: the PDF says the prototype covers 6 languages but does not list them.
 * We chose Hindi + Japanese (the persona and crew), English, and three Southeast
 * Asian languages matching the target routes (Tokyo–Delhi, Tokyo–Bangkok).
 */
export const LANGUAGES: LanguageInfo[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi-IN' },
  { code: 'en', nativeName: 'English', englishName: 'English', bcp47: 'en-US' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', bcp47: 'ja-JP' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', bcp47: 'th-TH' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', bcp47: 'id-ID' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', bcp47: 'vi-VN' },
];

/** The crew's working language on the demo route (Japanese carrier). */
export const CREW_LANG: LangCode = 'ja';

/** English name of any language code: the 6 built in, or any other (Bengali, Tamil…) through Intl. */
export function languageName(code: string): string {
  const known = LANGUAGES.find((l) => l.code === code);
  if (known) return known.englishName;
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function languageInfo(code: LangCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[1]!;
}

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && LANGUAGES.some((l) => l.code === value);
}
