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
  templates: string[];
  needs: Record<string, string[]>;
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

/** Needs a pack has no keywords for, and keys that are not needs. */
export function checkPack(pack: LanguagePack): { missing: string[]; unknown: string[] } {
  const ids = new Set(NEEDS.map((n) => n.id));
  return {
    missing: NEEDS.filter((n) => !pack.needs[n.id]?.length).map((n) => n.id),
    unknown: Object.keys(pack.needs).filter((k) => !ids.has(k)),
  };
}
