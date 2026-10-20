import { NEEDS, PURPOSE_PHRASES } from '../catalog/needs';
import type { Need, NeedPurpose } from '../types';

/**
 * Intent matcher: turns a transcript (or typed text) into one of the known needs.
 *
 * The PDF's production design is Whisper (speech → text) followed by
 * multilingual-e5 embeddings that match the text to 1 of 64 needs, asking with
 * pictures when confidence < 85%. This module is a deterministic, offline
 * keyword matcher standing in for the embedding model. It keeps the same
 * contract (ranked candidates + confidence) so the real model can replace it
 * behind `IntentMatcher`.
 */

export const CONFIDENCE_THRESHOLD = 0.85;

export interface MatchCandidate {
  needId: string;
  score: number;
}

export interface MatchResult {
  /** Ranked candidates, best first. May be empty. */
  candidates: MatchCandidate[];
  /** 0..1. At or above CONFIDENCE_THRESHOLD the top candidate can be used directly. */
  confidence: number;
  purposeId?: NeedPurpose['id'];
}

export interface IntentMatcher {
  match(text: string): MatchResult;
}

/** Lower-case, strip Latin diacritics (keeps Devanagari/Thai marks), turn punctuation into spaces. */
export function normalize(text: string): string {
  return (
    ' ' +
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .normalize('NFC')
      .replace(/[.,!?;:"'“”‘’()[\]{}…、。！？「」·\-–—/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() +
    ' '
  );
}

const LATIN_ONLY = /^[a-z0-9 ]+$/;

interface Span {
  start: number;
  end: number;
}

interface Hit extends Span {
  kind: 'phrase' | 'hint' | 'purpose';
  needId?: string;
  purposeId?: NeedPurpose['id'];
}

function findSpans(text: string, keyword: string): Span[] {
  const kw = normalize(keyword).trim();
  if (!kw) return [];
  // Latin keywords must match whole words; other scripts have no word spaces.
  const needle = LATIN_ONLY.test(kw) ? ` ${kw} ` : kw;
  const spans: Span[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) break;
    const start = LATIN_ONLY.test(kw) ? at + 1 : at;
    spans.push({ start, end: start + kw.length });
    from = at + 1;
  }
  return spans;
}

function allKeywords(map: Partial<Record<string, string[]>> | undefined): string[] {
  return map ? Object.values(map).flatMap((v) => v ?? []) : [];
}

export function createKeywordMatcher(needs: Need[] = NEEDS): IntentMatcher {
  return {
    match(input: string): MatchResult {
      const text = normalize(input);
      if (!text.trim()) return { candidates: [], confidence: 0 };

      const hits: Hit[] = [];
      for (const [purposeId, words] of Object.entries(PURPOSE_PHRASES) as [NeedPurpose['id'], string[]][]) {
        for (const w of words) for (const s of findSpans(text, w)) hits.push({ ...s, kind: 'purpose', purposeId });
      }
      for (const need of needs) {
        for (const w of allKeywords(need.phrases)) for (const s of findSpans(text, w)) hits.push({ ...s, kind: 'phrase', needId: need.id });
        for (const w of allKeywords(need.hints)) for (const s of findSpans(text, w)) hits.push({ ...s, kind: 'hint', needId: need.id });
      }

      // A hit fully inside a longer hit is part of that longer phrase
      // ("गरम पानी" is hot water, not water; "दवाई के लिए" is a purpose, not the medicine need).
      const kept = hits.filter(
        (h) =>
          !hits.some(
            (o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start && o.needId !== h.needId,
          ),
      );

      const scores = new Map<string, number>();
      const seen = new Set<string>();
      for (const h of kept) {
        if (!h.needId) continue;
        const key = `${h.needId}:${h.start}:${h.end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const add = h.kind === 'phrase' ? 1 : 0.35;
        scores.set(h.needId, Math.min(1.5, (scores.get(h.needId) ?? 0) + add));
      }

      const purposeHits = kept.filter((h) => h.kind === 'purpose');
      const candidates = [...scores.entries()]
        .map(([needId, score]) => ({ needId, score }))
        .sort((a, b) => b.score - a.score || needOrder(a.needId) - needOrder(b.needId));

      const top = candidates[0];
      let confidence = 0;
      if (top) {
        const second = candidates[1]?.score ?? 0;
        const strength = Math.min(1, top.score);
        const margin = (top.score - second) / top.score;
        confidence = Math.min(0.99, 0.6 * strength + 0.4 * margin);
      }

      let purposeId: NeedPurpose['id'] | undefined;
      if (top) {
        const need = needs.find((n) => n.id === top.needId);
        purposeId = purposeHits.map((h) => h.purposeId!).find((p) => need?.purposes?.includes(p));
      }

      return { candidates, confidence: round(confidence), purposeId };
    },
  };
}

function needOrder(id: string): number {
  const i = NEEDS.findIndex((n) => n.id === id);
  return i === -1 ? 999 : i;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Decide what the UI should do with a match result.
 *  confident – go straight to the confirm/send step for the top need
 *  ask       – "Did you mean this?" with up to 3 picture options
 */
export type MatchDecision =
  | { kind: 'confident'; needId: string; purposeId?: NeedPurpose['id']; confidence: number }
  | { kind: 'ask'; options: string[]; purposeId?: NeedPurpose['id']; confidence: number };

/** Fallback options when nothing matched: the most common things people ask for. */
export const FALLBACK_OPTIONS = ['water', 'toilet', 'blanket'];

export function decide(result: MatchResult, threshold = CONFIDENCE_THRESHOLD): MatchDecision {
  const top = result.candidates[0];
  if (top && result.confidence >= threshold) {
    return { kind: 'confident', needId: top.needId, purposeId: result.purposeId, confidence: result.confidence };
  }
  const options = result.candidates.slice(0, 3).map((c) => c.needId);
  for (const f of FALLBACK_OPTIONS) if (options.length < 3 && !options.includes(f)) options.push(f);
  return { kind: 'ask', options, purposeId: result.purposeId, confidence: result.confidence };
}

export const defaultMatcher = createKeywordMatcher();
