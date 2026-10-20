import type { LangCode } from '../types';

/**
 * Speech input adapter.
 *
 * Production (per the PDF): audio streams to the crew tablet, which removes
 * engine noise (DeepFilterNet), transcribes offline (Whisper) and matches the
 * text to a need. Voice is never saved.
 *
 * This prototype ships `MockSpeechRecognizer`: it records nothing, animates a
 * level meter and returns a scripted transcript so the full journey —
 * including the low-confidence "Did you mean?" path — can be demonstrated.
 */
export interface SpeechRecognizer {
  readonly simulated: boolean;
  start(lang: LangCode, onLevel: (db: number) => void): void;
  stop(): Promise<{ transcript: string }>;
  cancel(): void;
}

export type UtteranceMode = 'alternate' | 'noisy' | 'clear';

/** Sample utterances consistent with the PDF story (hot water for medicine, partly drowned by engine noise). */
export const SAMPLE_UTTERANCES: Record<LangCode, { clear: string; noisy: string }> = {
  hi: { clear: 'मुझे दवाई के लिए गरम पानी चाहिए', noisy: '… गरम … चाहिए …' },
  en: { clear: 'Could I have some hot water for my medicine', noisy: '… warm … need …' },
  ja: { clear: '薬を飲むためのお湯をください', noisy: '…温かい…ください…' },
  th: { clear: 'ขอน้ำร้อนเพื่อกินยาหน่อย', noisy: '…อุ่น…หน่อย…' },
  id: { clear: 'Saya perlu air panas untuk minum obat', noisy: '… hangat … tolong …' },
  vi: { clear: 'Cho tôi nước nóng để uống thuốc', noisy: '… nóng … giúp …' },
};

export class MockSpeechRecognizer implements SpeechRecognizer {
  readonly simulated = true;
  mode: UtteranceMode = 'alternate';
  private turn = 0;
  private lang: LangCode = 'en';
  private meter?: ReturnType<typeof setInterval>;

  constructor(private processingDelayMs = 900) {}

  start(lang: LangCode, onLevel: (db: number) => void): void {
    this.lang = lang;
    this.cancel();
    this.meter = setInterval(() => onLevel(Math.round(76 + Math.random() * 10)), 120);
  }

  stop(): Promise<{ transcript: string }> {
    this.cancel();
    const sample = SAMPLE_UTTERANCES[this.lang];
    const useNoisy = this.mode === 'noisy' || (this.mode === 'alternate' && this.turn % 2 === 0);
    this.turn += 1;
    const transcript = useNoisy ? sample.noisy : sample.clear;
    return new Promise((resolve) => setTimeout(() => resolve({ transcript }), this.processingDelayMs));
  }

  cancel(): void {
    if (this.meter) clearInterval(this.meter);
    this.meter = undefined;
  }
}

/** Text-to-speech adapter (crew reply read aloud in the passenger's earphones). */
export interface Speaker {
  available(): boolean;
  speak(text: string, bcp47: string): void;
  stop(): void;
}

/** Haptic adapter ("buzz" reply channel). */
export interface Buzzer {
  buzz(): void;
}
