import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEEDS, type Need } from '@hearme/shared';

/**
 * Language packs: a new language for *understanding* requests is a data file,
 * not code. apps/hub/data/languages/<code>.json lists keywords for each need
 * and a few request templates; `npm run add-language -w @hearme/hub -- <code>`
 * checks it, retrains the need classifier with it and measures the result.
 * Screens and verified replies still need translating separately.
 */
export interface LanguagePack {
  code: string;
  name: string;
  /** Whisper's name for the language (e.g. "bengali"); without it the pack is for typing only. */
  whisper?: string;
  /** ISO 15924 script of the language (e.g. "Beng"): Whisper output in Hindi letters is converted to it. */
  script?: string;
  /** "machine": drafted by offline translation (add-language --draft); "human": written by a person. Both need native review. */
  draft?: 'machine' | 'human';
  note?: string;
  /** Request templates; {k} is replaced by each keyword. */
  templates: string[];
  /** Keywords per need id. */
  needs: Record<string, string[]>;
  /** Whole example requests per need id (used for training). */
  examples?: Record<string, string[]>;
}

export const PACK_DIR = fileURLToPath(new URL('../data/languages/', import.meta.url));

export function loadLanguagePacks(): LanguagePack[] {
  if (!existsSync(PACK_DIR)) return [];
  return readdirSync(PACK_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PACK_DIR, f), 'utf8')) as LanguagePack);
}

/** Needs with each pack's keywords added under the pack's language code. */
export function withLanguagePacks(needs: Need[] = NEEDS, packs = loadLanguagePacks()): Need[] {
  if (!packs.length) return needs;
  return needs.map((n) => {
    const phrases = { ...n.phrases } as Record<string, string[]>;
    for (const p of packs) if (p.needs[n.id]?.length) phrases[p.code] = p.needs[n.id]!;
    return { ...n, phrases: phrases as Need['phrases'] };
  });
}

const INDIC_BASE: Record<string, number> = { Beng: 0x0980, Guru: 0x0a00, Gujr: 0x0a80, Orya: 0x0b00, Taml: 0x0b80, Telu: 0x0c00, Knda: 0x0c80, Mlym: 0x0d00 };

/**
 * Whisper often writes an Indian language in Devanagari (Hindi letters):
 * Bengali "আমার" comes out as "अमार". The Indic Unicode blocks are laid out
 * letter for letter, so shifting the block restores the right script.
 */
export function fromDevanagari(text: string, script: string | undefined): string {
  const base = script ? INDIC_BASE[script] : undefined;
  if (!base || !/[\u0900-\u0963]/.test(text)) return text;
  return text.replace(/[\u0900-\u0963]/g, (c) => (script === 'Beng' && c === 'व' ? 'ব' : String.fromCharCode(c.charCodeAt(0) - 0x0900 + base)));
}

/** Needs a pack has no keywords for, and keys that are not needs. */
export function checkPack(pack: LanguagePack): { missing: string[]; unknown: string[] } {
  const ids = new Set(NEEDS.map((n) => n.id));
  return {
    missing: NEEDS.filter((n) => !pack.needs[n.id]?.length).map((n) => n.id),
    unknown: Object.keys(pack.needs).filter((k) => !ids.has(k)),
  };
}
