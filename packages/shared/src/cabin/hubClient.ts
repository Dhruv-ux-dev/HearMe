import type { LangCode, PassengerProfile, ReplyId } from '../types';
import type { MatchResult } from '../matching/matcher';

/**
 * HTTP side of the cabin hub (same origin as its WebSocket). Used by phones,
 * seatback screens and crew consoles. Everything stays on the cabin network.
 */

export interface HubStatus {
  ok: true;
  name: 'hearme-hub';
  version: string;
  asr: { model: string; state: ModelState };
  embed: { model: string; state: ModelState };
  /** True when this hub can decode compressed audio (ffmpeg installed). */
  ffmpeg: boolean;
  /** Where other devices can reach the hub (LAN address, HTTPS when available). */
  urls?: { base: string; lan: string[] };
  clients?: number;
}

export type ModelState = 'off' | 'loading' | 'ready' | 'error';

export type UnderstandTarget = 'needs' | 'replies';

export interface UnderstandResult {
  transcript: string;
  asrMs: number;
  matchMs: number;
  /** For target 'needs'. */
  match?: MatchResult;
  /** For target 'replies' (crew speech → closest verified reply). */
  reply?: { replyId: ReplyId | null; confidence: number };
}

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function join(hubUrl: string, path: string): string {
  return new URL(path, hubUrl.endsWith('/') ? hubUrl : `${hubUrl}/`).toString();
}

/** Returns the hub's status, or null if no hub answers at this URL. */
export async function fetchHubStatus(hubUrl: string, timeoutMs = 2500): Promise<HubStatus | null> {
  try {
    return await withTimeout(timeoutMs, async (signal) => {
      const res = await fetch(join(hubUrl, 'api/status'), { signal, cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as Partial<HubStatus>;
      return body && body.name === 'hearme-hub' ? (body as HubStatus) : null;
    });
  } catch {
    return null;
  }
}

/**
 * Send recorded speech to the hub: Whisper turns it into text on the crew
 * tablet, then it is matched to a need (passengers) or a verified reply (crew).
 * `audio` is 16 kHz mono 16-bit PCM, or a compressed recording with its MIME type.
 */
export async function understandSpeech(
  hubUrl: string,
  audio: ArrayBuffer | Uint8Array | Blob,
  options: { lang: string; target?: UnderstandTarget; mimeType?: string; timeoutMs?: number },
): Promise<UnderstandResult> {
  const { lang, target = 'needs', mimeType = 'audio/L16;rate=16000;channels=1', timeoutMs = 30_000 } = options;
  return withTimeout(timeoutMs, async (signal) => {
    const res = await fetch(join(hubUrl, `api/understand?lang=${lang}&target=${target}`), {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: audio as BodyInit,
      signal,
    });
    if (!res.ok) throw new Error(`hub ${res.status}`);
    return (await res.json()) as UnderstandResult;
  });
}

/** Match typed text on the hub (meaning-based). Returns null if the hub cannot help. */
export async function matchOnHub(
  hubUrl: string,
  text: string,
  options: { lang: string; target?: UnderstandTarget; timeoutMs?: number },
): Promise<UnderstandResult | null> {
  const { lang, target = 'needs', timeoutMs = 4000 } = options;
  try {
    return await withTimeout(timeoutMs, async (signal) => {
      const res = await fetch(join(hubUrl, 'api/match'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, target }),
        signal,
      });
      return res.ok ? ((await res.json()) as UnderstandResult) : null;
    });
  } catch {
    return null;
  }
}

/** Language and needs saved at check-in travel with the booking: look them up by seat. */
export async function lookupBookingOnHub(hubUrl: string, seat: string, timeoutMs = 3000): Promise<PassengerProfile | null> {
  try {
    return await withTimeout(timeoutMs, async (signal) => {
      const res = await fetch(join(hubUrl, `api/booking?seat=${encodeURIComponent(seat)}`), { signal, cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { profile?: PassengerProfile };
      return body.profile ?? null;
    });
  } catch {
    return null;
  }
}

/** Float32 samples (−1..1) → 16-bit little-endian PCM bytes. */
export function floatToPcm16(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

/** Linear-interpolation resample (good enough for speech going to Whisper). */
export function resampleTo16k(samples: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return samples;
  const ratio = fromRate / 16000;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const frac = pos - i0;
    out[i] = samples[i0]! * (1 - frac) + samples[i1]! * frac;
  }
  return out;
}

/** Loudness of a block of samples in dBFS (for the live level meter). */
export function levelDb(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}
