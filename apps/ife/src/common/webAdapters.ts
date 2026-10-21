import type { Speaker } from '@hearme/shared';
import { createBrowserVoice } from '@hearme/shared/tts';

/**
 * Text-to-speech through the browser's Web Speech API, with the shared voice
 * choice (the passenger's language, on-device voices first). On a real
 * seatback this would route to the headphone jack via the IFE platform's
 * audio API (not integrated here). Text is always shown as well.
 */
const voice = typeof window !== 'undefined' ? createBrowserVoice() : null;

export const browserSpeaker: Speaker = {
  available: () => voice !== null,
  speak(text, bcp47) {
    void voice?.speak(text, bcp47);
  },
  stop() {
    voice?.stop();
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
