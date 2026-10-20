import { describe, expect, it } from 'vitest';
import { CONFIDENCE_THRESHOLD, decide, defaultMatcher, normalize, SAMPLE_UTTERANCES, type LangCode } from '../src';

const m = (text: string) => defaultMatcher.match(text);

describe('keyword intent matcher (stand-in for multilingual-e5)', () => {
  it('matches the PDF story: Hindi "hot water for medicine" confidently, with the purpose', () => {
    const r = m('मुझे दवाई के लिए गरम पानी चाहिए');
    expect(r.candidates[0]?.needId).toBe('hot_water');
    expect(r.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(r.purposeId).toBe('for_medicine');
  });

  it('asks with pictures when noise cut the words (mockup step 2: hot water, tea, blanket)', () => {
    const d = decide(m('… गरम … चाहिए …'));
    expect(d.kind).toBe('ask');
    expect(d.kind === 'ask' && d.options).toEqual(['hot_water', 'tea', 'blanket']);
  });

  it('prefers the longer phrase: "गरम पानी" is hot water, not water', () => {
    expect(m('गरम पानी').candidates.map((c) => c.needId)).toEqual(['hot_water']);
  });

  it('treats "medicine" on its own as the medicine need', () => {
    const r = m('I need my medicine');
    expect(r.candidates[0]?.needId).toBe('medicine');
    expect(r.purposeId).toBeUndefined();
  });

  it('matches whole words only for Latin script', () => {
    expect(m('instead').candidates).toEqual([]);
  });

  it('handles Vietnamese diacritics and romanised Hindi', () => {
    expect(m('Cho tôi nước nóng').candidates[0]?.needId).toBe('hot_water');
    expect(m('garam pani please').candidates[0]?.needId).toBe('hot_water');
  });

  it('falls back to common options when nothing matches', () => {
    const d = decide(m('xyz'));
    expect(d).toMatchObject({ kind: 'ask', options: ['water', 'toilet', 'blanket'], confidence: 0 });
  });

  it.each(Object.keys(SAMPLE_UTTERANCES) as LangCode[])('sample utterances for %s: clear → confident hot water, noisy → ask', (lang) => {
    const clear = decide(m(SAMPLE_UTTERANCES[lang].clear));
    expect(clear).toMatchObject({ kind: 'confident', needId: 'hot_water', purposeId: 'for_medicine' });
    expect(decide(m(SAMPLE_UTTERANCES[lang].noisy)).kind).toBe('ask');
  });

  it('normalises punctuation and case', () => {
    expect(normalize('Hot, WATER!')).toBe(' hot water ');
  });
});

describe('sound-alike tier (Whisper spellings, from the speech eval)', () => {
  it('finds needs Whisper spelled the way they sound, but asks with pictures', () => {
    for (const [text, need] of [
      ['मुझे मेरी डवा चाही', 'medicine'], // डवा = दवा
      ['बहुत ठन्द है, कमबल दे देदेजे', 'blanket'], // कमबल = कंबल
      ['นาวจัง ขอภาพฮมหน่อย', 'blanket'], // ภาพฮม ≈ ผ้าห่ม
      ['Tôi cần xe lăng khi hạ cánh.', 'wheelchair_arrival'], // lăng ≈ lăn
    ] as const) {
      const r = m(text);
      expect(r.candidates[0]?.needId, text).toBe(need);
      expect(r.confidence, text).toBeLessThan(CONFIDENCE_THRESHOLD);
    }
  });

  it('does not read Vietnamese "ở đâu" (where) as "đau" (pain)', () => {
    const r = m('Nhà Vệ Xinh ở đâu?');
    expect(r.candidates[0]?.needId).toBe('toilet');
    expect(r.candidates.some((c) => c.needId === 'unwell')).toBe(false);
  });

  it('leaves exact matches alone', () => {
    expect(m('मुझे दवाई के लिए गरम पानी चाहिए').confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
  });
});
