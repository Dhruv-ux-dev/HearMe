import type { Speaker } from '@hearme/shared';

/**
 * Text-to-speech through the browser's Web Speech API. On a real seatback this
 * would route to the passenger's headphone jack via the IFE platform's audio API
 * (not integrated here). Many browsers ship offline voices; if none exists for
 * the language, `available()` still returns true and the browser may stay silent,
 * so text is always shown as well.
 */
export const browserSpeaker: Speaker = {
  available: () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  speak(text, bcp47) {
    if (!this.available()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcp47;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  },
  stop() {
    if (this.available()) window.speechSynthesis.cancel();
  },
};

/**
 * MOCK seat-identity adapter. A real IFE knows its seat from the aircraft
 * configuration; here it comes from `?seat=` (default 23C, the PDF's example).
 */
export function ifeSeatFromUrl(): string {
  const raw = new URLSearchParams(window.location.search).get('seat') ?? '';
  return /^([1-9]|[1-6][0-9]|70)[A-HJK]$/.test(raw.toUpperCase()) ? raw.toUpperCase() : '23C';
}
