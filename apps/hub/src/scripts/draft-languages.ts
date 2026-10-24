/**
 * Machine-draft language packs for the scheduled languages of India that
 * NLLB-200 covers, offline on this laptop (`npm run models -- translate`):
 *
 *   npm run draft-languages -w @hearme/hub -- draft gu kn ml     translate → apps/hub/.eval/drafts/<code>.json
 *   npm run draft-languages -w @hearme/hub -- assemble           drafts → packages/shared/src/i18n/packs/<code>.ts
 *
 * What gets drafted: the passenger path's screen text, the 40 need labels, the
 * purposes, the verified replies, and matching words + one example per need.
 * What never does: reserved safety texts (they stay human-written, shown in
 * the fallback language). Placeholders such as {n} are protected, and a
 * keyword that would match another need with confidence is dropped. Every
 * pack says it is a machine draft; screens and replies in these languages
 * carry a "machine-translated" note until a native speaker checks them.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_NEEDS,
  NEEDS,
  PASSENGER_PATH_KEYS,
  PURPOSES,
  REPLIES,
  STRINGS,
  createKeywordMatcher,
  decide,
  isReservedKey,
  type Need,
} from '@hearme/shared';
import { inferenceThreads } from '../models';
import { createNllb, keepTarget } from '../translate';

const HUB_DIR = fileURLToPath(new URL('../../', import.meta.url));
const DRAFT_DIR = join(HUB_DIR, '.eval', 'drafts');
const PACK_DIR = fileURLToPath(new URL('../../../../packages/shared/src/i18n/packs/', import.meta.url));

/** HearMe code → NLLB-200 code. Bodo, Dogri and Konkani are not in NLLB-200. */
export const DRAFTABLE: Record<string, { nllb: string; name: string; native: string }> = {
  as: { nllb: 'asm_Beng', name: 'Assamese', native: 'অসমীয়া' },
  gu: { nllb: 'guj_Gujr', name: 'Gujarati', native: 'ગુજરાતી' },
  kn: { nllb: 'kan_Knda', name: 'Kannada', native: 'ಕನ್ನಡ' },
  ks: { nllb: 'kas_Arab', name: 'Kashmiri', native: 'کٲشُر' },
  mai: { nllb: 'mai_Deva', name: 'Maithili', native: 'मैथिली' },
  ml: { nllb: 'mal_Mlym', name: 'Malayalam', native: 'മലയാളം' },
  mni: { nllb: 'mni_Beng', name: 'Manipuri (Meitei)', native: 'মৈতৈলোন্' },
  ne: { nllb: 'npi_Deva', name: 'Nepali', native: 'नेपाली' },
  or: { nllb: 'ory_Orya', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  sa: { nllb: 'san_Deva', name: 'Sanskrit', native: 'संस्कृतम्' },
  sat: { nllb: 'sat_Beng', name: 'Santali', native: 'সাঁওতালি' },
  sd: { nllb: 'snd_Arab', name: 'Sindhi', native: 'سنڌي' },
  te: { nllb: 'tel_Telu', name: 'Telugu', native: 'తెలుగు' },
  ur: { nllb: 'urd_Arab', name: 'Urdu', native: 'اردو' },
};

interface Draft {
  code: string;
  ui: Record<string, string>;
  needs: Record<string, string>;
  purposes: Record<string, string>;
  replies: Record<string, string>;
  phrases: Record<string, string[]>;
  examples: Record<string, string[]>;
  dropped: string[];
}

/** Digits in any Indic or Arabic script → ASCII, so protected numbers survive. */
const DIGIT_ZEROS = [0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0x1c50, 0xabf0];
function asciiDigits(s: string): string {
  return s.replace(/\p{Nd}/gu, (d) => {
    const cp = d.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
    return zero === undefined ? d : String(cp - zero);
  });
}

async function draft(code: string, translate: (text: string) => Promise<string>): Promise<Draft> {
  const script = DRAFTABLE[code]!.nllb.split('_')[1]!;
  const own = new RegExp(`\\p{Script=${script === 'Beng' ? 'Bengali' : script}}`, 'u');
  const dropped: string[] = [];
  const mt = async (text: string) => (await translate(text)).trim();

  /** Screen text: placeholders and the product name are swapped for numbers NLLB leaves alone. */
  const screen = async (key: string, en: string): Promise<string | null> => {
    const tokens = [...new Set(en.match(/\{\w+\}|HearMe/g) ?? [])];
    let src = en;
    tokens.forEach((t, i) => (src = src.split(t).join(String(7101 + i))));
    let out = asciiDigits(await mt(src));
    for (const [i, t] of tokens.entries()) {
      if (!out.includes(String(7101 + i))) {
        dropped.push(`${key}: lost ${t}`);
        return null;
      }
      out = out.split(String(7101 + i)).join(t);
    }
    if (!own.test(out) || out.length > en.length * 4 + 20) {
      dropped.push(`${key}: unusable`);
      return null;
    }
    return out.replace(/(\S+)( \1)+/gu, '$1');
  };

  const ui: Record<string, string> = {};
  for (const key of PASSENGER_PATH_KEYS) {
    if (isReservedKey(key)) continue;
    const en = STRINGS[key].en;
    const out = await screen(key, en);
    if (out) ui[key] = out;
  }
  const needs: Record<string, string> = {};
  const phrases: Record<string, string[]> = {};
  const examples: Record<string, string[]> = {};
  const keyword = (k: string) => {
    const w = keepTarget(asciiDigits(k), script).replace(/[.!?।॥。,]+$/u, '').trim();
    return w && w.length <= 40 && own.test(w) ? w : null;
  };
  for (const need of CORE_NEEDS) {
    const label = need.label.en;
    const drafted = await screen(`need ${need.id}`, label);
    needs[need.id] = drafted ?? label;
    // The label's translation is the first matching word; one more English phrase gives a second.
    const extra = (need.phrases.en ?? []).find((p) => p.toLowerCase() !== label.toLowerCase());
    const kws = [drafted ? keyword(drafted) : null, extra ? keyword(await mt(extra)) : null].filter((w): w is string => !!w);
    phrases[need.id] = [...new Set(kws)];
    // Whole example sentences only for the requests the demo stage offers to try.
    if (need.id === 'blanket' || need.id === 'water') {
      const ex = await screen(`example ${need.id}`, `Can I have ${need.id === 'water' ? 'some water' : 'a blanket'}, please?`);
      examples[need.id] = ex ? [ex] : [];
    }
  }
  const purposes: Record<string, string> = {};
  for (const p of PURPOSES) purposes[p.id] = (await screen(`purpose ${p.id}`, p.label.en)) ?? p.label.en;
  const replies: Record<string, string> = {};
  for (const r of REPLIES) {
    const out = await screen(`reply ${r.id}`, r.text.en);
    if (out) replies[r.id] = out;
  }
  return { code, ui, needs, purposes, replies, phrases, examples, dropped };
}

/**
 * Drop matching words that would send a request to the wrong need: a word two
 * needs share, or one the keyword matcher (with every pack and draft loaded)
 * confidently reads as another need.
 */
function cleanVocabulary(drafts: Draft[]): void {
  for (const d of drafts) {
    const seen = new Map<string, number>();
    for (const words of Object.values(d.phrases)) for (const w of words) seen.set(w, (seen.get(w) ?? 0) + 1);
    for (const id of Object.keys(d.phrases)) d.phrases[id] = d.phrases[id]!.filter((w) => seen.get(w) === 1);
  }
  for (let round = 0; round < 3; round++) {
    const merged: Need[] = NEEDS.map((n) => ({
      ...n,
      phrases: { ...n.phrases, ...Object.fromEntries(drafts.map((d) => [d.code, d.phrases[n.id] ?? []])) },
    }));
    const matcher = createKeywordMatcher(merged);
    let removed = 0;
    for (const d of drafts) {
      for (const [id, words] of Object.entries(d.phrases)) {
        d.phrases[id] = words.filter((w) => {
          const m = decide(matcher.match(w));
          const ok = !(m.kind === 'confident' && m.needId !== id);
          if (!ok) {
            removed++;
            d.dropped.push(`keyword "${w}" (${id}) read as ${m.kind === 'confident' ? m.needId : '?'}`);
          }
          return ok;
        });
      }
    }
    if (!removed) break;
  }
}

function writePack(d: Draft): void {
  const info = DRAFTABLE[d.code]!;
  const name = d.code.toUpperCase();
  const pack = {
    code: d.code,
    provenance: `Machine draft: translated offline from English by NLLB-200 (distilled 600M) for the prototype. Nobody has checked it yet. Screens and replies in this language carry a "machine-translated" note until a native speaker reviews them. Safety texts are never drafted: they appear in the fallback language.`,
    needs: d.needs,
    purposes: d.purposes,
    replies: d.replies,
    ui: d.ui,
    templates: ['{k}'],
    phrases: d.phrases,
    examples: d.examples,
  };
  const body = JSON.stringify(pack, null, 2);
  writeFileSync(
    join(PACK_DIR, `${d.code}.ts`),
    `import type { LocalePack } from './types';\n\n/**\n * ${info.name} (${info.native}). Machine draft — generated by \`npm run draft-languages -w @hearme/hub\`.\n * Edit freely: a native speaker's corrections are exactly what this file needs.\n */\nexport const ${name}: LocalePack = ${body} as LocalePack;\n`,
  );
}

/** Clean every finished draft, write its pack, and list them all in packs/index.ts. */
function assemble(): void {
  const drafts = readdirSync(DRAFT_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DRAFT_DIR, f), 'utf8')) as Draft)
    .sort((a, b) => a.code.localeCompare(b.code));
  cleanVocabulary(drafts);
  for (const d of drafts) {
    writePack(d);
    const kw = Object.values(d.phrases).reduce((s, w) => s + w.length, 0);
    const empty = Object.entries(d.phrases).filter(([, w]) => !w.length).map(([id]) => id);
    console.log(`${d.code}: ui ${Object.keys(d.ui).length}, replies ${Object.keys(d.replies).length}, keywords ${kw}${empty.length ? ` (none for ${empty.join(', ')})` : ''}`);
  }
  const indexFile = join(PACK_DIR, 'index.ts');
  const index = readFileSync(indexFile, 'utf8')
    .replace(/(\/\/ <drafts:imports>.*\n)[\s\S]*?(\/\/ <\/drafts:imports>)/, `$1${drafts.map((d) => `import { ${d.code.toUpperCase()} } from './${d.code}';\n`).join('')}$2`)
    .replace(/(\/\/ <drafts:list>\n)[\s\S]*?( *\/\/ <\/drafts:list>)/, `$1${drafts.length ? `  ${drafts.map((d) => d.code.toUpperCase()).join(', ')},\n` : ''}$2`);
  writeFileSync(indexFile, index);
}

const [mode, ...codes] = process.argv.slice(2);
if (mode === 'draft') {
  mkdirSync(DRAFT_DIR, { recursive: true });
  const nllb = await createNllb(inferenceThreads());
  for (const code of codes) {
    const info = DRAFTABLE[code];
    if (!info) throw new Error(`Not draftable: ${code}. Known: ${Object.keys(DRAFTABLE).join(', ')}`);
    if (existsSync(join(DRAFT_DIR, `${code}.json`))) {
      console.log(`${code}: already drafted, skipped`);
      continue;
    }
    const t0 = Date.now();
    let n = 0;
    const d = await draft(code, (text) => {
      if (++n % 25 === 0) console.log(`  ${code}: ${n} strings, ${((Date.now() - t0) / n / 1000).toFixed(1)} s each`);
      return nllb.translate(text, 'en', code, Math.min(96, 12 + Math.ceil(text.length * 1.2)));
    });
    writeFileSync(join(DRAFT_DIR, `${code}.json`), JSON.stringify(d, null, 2));
    // Each finished language goes straight into the app, so the tree is always consistent.
    assemble();
    console.log(`${code}: ${n} translations in ${Math.round((Date.now() - t0) / 1000)} s; ui ${Object.keys(d.ui).length}/${PASSENGER_PATH_KEYS.length}, replies ${Object.keys(d.replies).length}/${REPLIES.length}, dropped ${d.dropped.length}`);
  }
} else if (mode === 'assemble') {
  assemble();
} else {
  console.log('Usage: draft-languages draft <codes…> | assemble');
  process.exit(1);
}
if (!existsSync(DRAFT_DIR)) process.exit(0);
process.exit(0);
