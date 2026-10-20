import { describe, expect, it } from 'vitest';
import {
  contrastRatio, describeStatus, highContrastPalette, isValidSeat, lightPalette, NEEDS, normalizeSeat, LANGUAGES,
  REPLIES, ANNOUNCEMENTS, SAFETY_STEPS, STRINGS, requestTitle, sanitizeName, t, type PassengerRequest,
} from '../src';

describe('seat validation', () => {
  it.each(['23C', '1A', '70K', ' 23 c '])('accepts %s', (s) => expect(isValidSeat(s)).toBe(true));
  it.each(['', '0A', '71A', '23I', '23L', 'C23', '23CC'])('rejects %s', (s) => expect(isValidSeat(s)).toBe(false));
  it('normalises', () => expect(normalizeSeat(' 23 c')).toBe('23C'));
  it('sanitises names', () => expect(sanitizeName('  Sharda   Devi ')).toBe('Sharda Devi'));
});

describe('content completeness', () => {
  const langs = LANGUAGES.map((l) => l.code);
  it('every need, reply, announcement, safety step and UI string is translated into all 6 languages', () => {
    const all = [
      ...NEEDS.map((n) => n.label),
      ...REPLIES.map((r) => r.text),
      ...ANNOUNCEMENTS.map((a) => a.text),
      ...SAFETY_STEPS.flatMap((s) => [s.title, s.body]),
      ...Object.values(STRINGS),
    ];
    for (const entry of all) for (const l of langs) expect(entry[l], JSON.stringify(entry)).toBeTruthy();
  });
  it('fills placeholders', () => expect(t('hi', 'home.greetingName', { name: 'शारदा' })).toBe('नमस्ते, शारदा जी'));
});

describe('design tokens meet WCAG AA', () => {
  for (const [name, p] of [['light', lightPalette], ['high contrast', highContrastPalette]] as const) {
    it(`${name}: text and buttons ≥ 4.5:1`, () => {
      expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.textMuted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.onNavy, p.navy)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.success, p.successSoft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.danger, p.dangerSoft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.warning, p.warningSoft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.primary, p.primarySoft)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('status presentation', () => {
  const base: PassengerRequest = { id: 'x', needId: 'hot_water', purposeId: 'for_medicine', source: 'tap', createdAt: 0, updatedAt: 0, status: 'pending', attempts: 1, waitingForConnection: false };
  it('only sent/acknowledged are described as received', () => {
    expect(describeStatus(base, 'en').label).toBe('Sending…');
    expect(describeStatus({ ...base, waitingForConnection: true }, 'en').key).toBe('waiting');
    expect(describeStatus({ ...base, status: 'sent' }, 'en').label).toBe('Crew has received it');
    expect(describeStatus({ ...base, status: 'failed' }, 'en').tone).toBe('danger');
  });
  it('titles the request in the crew language', () => expect(requestTitle(base, 'ja')).toBe('お湯 · 服薬のため'));
});
