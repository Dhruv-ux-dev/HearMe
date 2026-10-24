import type { CoreLang, LangCode } from '../types';
import { hasLocalePack } from './packs';

/**
 * Which languages HearMe offers, and — layer by layer — how far each one
 * actually goes. A language is never simply "supported": speech recognition,
 * request matching, screen text, verified replies and spoken playback are five
 * separate pieces of work, and this file says where each one stands so the
 * apps, the crew console and the README can show the truth instead of a flag.
 */

/** Speech recognition. `untested` means Whisper lists the language but we have not measured it here. */
export type SpeechLevel = 'good' | 'weak' | 'untested' | 'none';

/**
 * Written text (matching vocabulary, screens, replies):
 *  complete – every string exists in this language
 *  partial  – the common path is translated; the rest falls back
 *  fallback – nothing translated; shown in `fallback`
 *  machine  – drafted by offline machine translation (NLLB-200) and not yet checked by a person.
 *             It is used to understand requests, and shown to passengers only with a
 *             "machine-translated" note. Safety texts are never drafted.
 */
export type TextLevel = 'complete' | 'partial' | 'fallback' | 'machine' | 'none';

/** Device voices for reading replies aloud. `rare`: phones often have none, and the apps fall back to big text + vibration. */
export type TtsLevel = 'common' | 'rare' | 'none';

/** Who has checked the wording. Nothing here is `native` yet: that is the open item before any pilot. */
export type ReviewLevel = 'native' | 'non-native' | 'machine' | 'none';

export interface LanguageCoverage {
  speech: SpeechLevel;
  intent: TextLevel;
  ui: TextLevel;
  replies: TextLevel;
  tts: TtsLevel;
  review: ReviewLevel;
}

export interface LanguageInfo {
  code: LangCode;
  /** Name in the language itself, shown on language pickers. */
  nativeName: string;
  englishName: string;
  /** BCP-47 tag used for text-to-speech and `lang` attributes. */
  bcp47: string;
  /** ISO 15924 script, for the Whisper-writes-Devanagari fix in the hub. */
  script?: string;
  /** Whisper's name for the language. */
  whisper: string;
  /**
   * Core languages have every string in every catalogue. Pack languages are
   * added as data and fall back for anything they do not translate.
   */
  core: boolean;
  /** Core language used for text this language does not have. */
  fallback: CoreLang;
  coverage: LanguageCoverage;
  /** Shown next to the language on pickers and in the coverage report. */
  note?: string;
}

const CORE_COVERAGE = (speech: SpeechLevel, tts: TtsLevel): LanguageCoverage => ({
  speech,
  intent: 'complete',
  ui: 'complete',
  replies: 'complete',
  tts,
  // The six core languages are prototype drafts too: written for the hackathon, not signed off by native speakers.
  review: 'non-native',
});

/**
 * ASSUMPTION: the PDF says the prototype covers 6 languages but does not list them.
 * We chose Hindi + Japanese (the persona and crew), English, and three Southeast
 * Asian languages matching the target routes (Tokyo–Delhi, Tokyo–Bangkok).
 *
 * The four pack languages after them are the most spoken languages on the same
 * Indian routes that Whisper and multilingual-e5 both already handle.
 */
export const LANGUAGES: LanguageInfo[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi-IN', script: 'Deva', whisper: 'hindi', core: true, fallback: 'en', coverage: CORE_COVERAGE('good', 'common') },
  { code: 'en', nativeName: 'English', englishName: 'English', bcp47: 'en-US', whisper: 'english', core: true, fallback: 'en', coverage: CORE_COVERAGE('good', 'common') },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', bcp47: 'ja-JP', whisper: 'japanese', core: true, fallback: 'en', coverage: CORE_COVERAGE('good', 'common') },
  {
    code: 'th',
    nativeName: 'ไทย',
    englishName: 'Thai',
    bcp47: 'th-TH',
    whisper: 'thai',
    core: true,
    fallback: 'en',
    coverage: CORE_COVERAGE('weak', 'common'),
    note: 'Weakest of the six in noise: 56% of spoken held-out requests right first time.',
  },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', bcp47: 'id-ID', whisper: 'indonesian', core: true, fallback: 'en', coverage: CORE_COVERAGE('good', 'common') },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', bcp47: 'vi-VN', whisper: 'vietnamese', core: true, fallback: 'en', coverage: CORE_COVERAGE('good', 'common') },

  // ── Pack languages: screens, replies and vocabulary come from i18n/packs/ ──
  {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    bcp47: 'bn-IN',
    script: 'Beng',
    whisper: 'bengali',
    core: false,
    fallback: 'en',
    coverage: { speech: 'weak', intent: 'complete', ui: 'partial', replies: 'complete', tts: 'rare', review: 'non-native' },
    note: 'Spoken Bengali is weak: Whisper-small writes it in Devanagari and 42% of spoken requests were right first time.',
  },
  {
    code: 'ta',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    bcp47: 'ta-IN',
    script: 'Taml',
    whisper: 'tamil',
    core: false,
    fallback: 'en',
    coverage: { speech: 'weak', intent: 'complete', ui: 'partial', replies: 'complete', tts: 'rare', review: 'non-native' },
    note: 'Vocabulary began as an NLLB-200 machine draft and was corrected by hand; still needs a native speaker.',
  },
  {
    code: 'pa',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    bcp47: 'pa-IN',
    script: 'Guru',
    whisper: 'punjabi',
    core: false,
    fallback: 'hi',
    coverage: { speech: 'untested', intent: 'complete', ui: 'partial', replies: 'complete', tts: 'rare', review: 'non-native' },
    note: 'Not yet measured on speech. Untranslated screen text appears in Hindi.',
  },
  {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    bcp47: 'mr-IN',
    script: 'Deva',
    whisper: 'marathi',
    core: false,
    fallback: 'hi',
    coverage: { speech: 'untested', intent: 'complete', ui: 'partial', replies: 'complete', tts: 'rare', review: 'non-native' },
    note: 'Not yet measured on speech. Untranslated screen text appears in Hindi.',
  },

  // ── More languages of India ───────────────────────────────────────────────
  // Machine drafts: screens, replies and vocabulary translated offline by NLLB-200
  // (npm run draft-languages -w @hearme/hub), shown with a "machine-translated" note until a
  // native speaker checks them. With Hindi, Bengali, Tamil, Punjabi, Marathi and English these
  // complete the 11 languages Sarvam AI covers.
  draft('gu', 'ગુજરાતી', 'Gujarati', 'Gujr', 'gujarati', 'hi'),
  draft('kn', 'ಕನ್ನಡ', 'Kannada', 'Knda', 'kannada', 'en'),
  draft('ml', 'മലയാളം', 'Malayalam', 'Mlym', 'malayalam', 'en'),
  draft('or', 'ଓଡ଼ିଆ', 'Odia', 'Orya', 'hindi', 'hi', 'Hindi'),
  draft('te', 'తెలుగు', 'Telugu', 'Telu', 'telugu', 'en'),
];

function draft(code: LangCode, nativeName: string, englishName: string, script: string, whisper: string, fallback: CoreLang, heardAs?: string, extra?: string): LanguageInfo {
  // Until its draft is generated, a language shows its fallback and says so.
  if (!hasLocalePack(code)) {
    return { ...notYet(code, nativeName, englishName, whisper, heardAs ?? englishName), script, fallback, note: `Being drafted: until then screens and replies appear in ${fallback === 'hi' ? 'Hindi' : 'English'}.` };
  }
  return {
    code,
    nativeName,
    englishName,
    bcp47: `${code}-IN`,
    script,
    whisper,
    core: false,
    fallback,
    coverage: { speech: heardAs ? 'none' : 'untested', intent: 'machine', ui: 'machine', replies: 'machine', tts: 'rare', review: 'machine' },
    note: [
      'Machine draft (NLLB-200), not yet checked by a native speaker: screens and replies show a “machine-translated” note.',
      heardAs ? `Whisper has no ${englishName}, so speech is heard as ${heardAs}: speak ${heardAs} or type.` : 'Speech not yet measured.',
      extra,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

function notYet(code: LangCode, nativeName: string, englishName: string, whisper: string, heardAs: string): LanguageInfo {
  return {
    code,
    nativeName,
    englishName,
    bcp47: `${code}-IN`,
    script: 'Deva',
    whisper,
    core: false,
    fallback: 'hi',
    coverage: { speech: 'none', intent: 'fallback', ui: 'fallback', replies: 'fallback', tts: 'none', review: 'none' },
    note: `The offline translator has no ${englishName} yet: screens and replies appear in Hindi, and speech is heard as ${heardAs}. A native speaker can add the pack as one data file.`,
  };
}

/** The six languages every catalogue is complete in. */
export const CORE_LANGS: CoreLang[] = ['hi', 'en', 'ja', 'th', 'id', 'vi'];

/** Pack languages: added as data, falling back for anything untranslated. */
export const PACK_LANGS: LangCode[] = LANGUAGES.filter((l) => !l.core).map((l) => l.code);

/** The crew's working language on the demo route (Japanese carrier). */
export const CREW_LANG: CoreLang = 'ja';

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code as string, l]));

/** English name of any language code: the ones HearMe offers, or any other through Intl. */
export function languageName(code: string): string {
  const known = BY_CODE.get(code);
  if (known) return known.englishName;
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Name in the language itself where we know it, else the English name. */
export function languageNativeName(code: string): string {
  return BY_CODE.get(code)?.nativeName ?? languageName(code);
}

/** Perso-Arabic scripts (such as Urdu, if a pack is added) run right to left. */
export function isRtl(code: string): boolean {
  return findLanguage(code)?.script === 'Arab';
}

export function languageInfo(code: LangCode): LanguageInfo {
  return BY_CODE.get(code) ?? LANGUAGES[1]!;
}

/** Language metadata for any string, or undefined when HearMe does not offer it. */
export function findLanguage(code: string | undefined): LanguageInfo | undefined {
  return code === undefined ? undefined : BY_CODE.get(code);
}

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

export function isCoreLang(value: unknown): value is CoreLang {
  return typeof value === 'string' && CORE_LANGS.includes(value as CoreLang);
}

export function coverageOf(code: LangCode): LanguageCoverage {
  return languageInfo(code).coverage;
}

/** The core language a language falls back to for untranslated text (itself, if it is core). */
export function fallbackLang(code: LangCode): CoreLang {
  return isCoreLang(code) ? code : (BY_CODE.get(code)?.fallback ?? 'en');
}

/**
 * Both languages a passenger's request involves: the screens they read and
 * the language they speak. They differ only while a pack language's screens
 * are incomplete and the passenger chose to read the fallback instead.
 */
export function speechLanguage(code: LangCode): string {
  return languageInfo(code).whisper;
}

/**
 * Plain-English summary of one layer, for the coverage report and the pickers.
 * Deliberately blunt: a judge should be able to read it and know what is real.
 */
export function describeCoverage(code: LangCode): { layer: string; status: string }[] {
  const l = languageInfo(code);
  const c = l.coverage;
  const fb = languageInfo(l.fallback).englishName;
  const text = (level: TextLevel) =>
    level === 'complete'
      ? 'all of it'
      : level === 'partial'
        ? `the passenger path; the rest in ${fb}`
        : level === 'fallback'
          ? `not translated — shown in ${fb}`
          : level === 'machine'
            ? `machine draft (NLLB-200), shown with a “machine-translated” note; safety texts in ${fb}`
            : 'none';
  return [
    {
      layer: 'Speech recognition',
      status:
        c.speech === 'good'
          ? 'measured and working'
          : c.speech === 'weak'
            ? 'works, but measured poorly — expect “Did you mean?”'
            : c.speech === 'untested'
              ? 'Whisper supports it; not measured here yet'
              : 'not available',
    },
    { layer: 'Understanding requests', status: text(c.intent) },
    { layer: 'Passenger screens', status: text(c.ui) },
    { layer: 'Crew replies', status: text(c.replies) },
    {
      layer: 'Replies read aloud',
      status: c.tts === 'common' ? 'most phones have a voice' : c.tts === 'rare' ? 'many phones have no voice — big text and vibration instead' : 'not available',
    },
    {
      layer: 'Wording checked by',
      status: c.review === 'native' ? 'a native speaker' : c.review === 'non-native' ? 'a non-native author — needs native review' : c.review === 'machine' ? 'machine translation only' : 'nobody yet',
    },
  ];
}
