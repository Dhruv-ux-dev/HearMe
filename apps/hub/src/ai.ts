import {
  ReplyMatcher,
  SemanticNeedMatcher,
  createKeywordMatcher,
  type Embedder,
  type LangCode,
  type MatchResult,
  type ModelState,
  type ReplyId,
} from '@hearme/shared';
import { ASR_MODELS, EMBED_MODEL, MODEL_DIR, type AsrSize } from './models';

/**
 * The crew tablet's offline AI: Whisper for speech → text and
 * multilingual-e5 for text → need / verified reply. Models load from disk
 * (download once with `npm run models`). Requests run one at a time so a
 * laptop stays responsive; nothing is written to disk.
 */

export interface Transcriber {
  transcribe(samples: Float32Array, lang: LangCode): Promise<string>;
}

const WHISPER_LANG: Record<LangCode, string> = {
  hi: 'hindi',
  en: 'english',
  ja: 'japanese',
  th: 'thai',
  id: 'indonesian',
  vi: 'vietnamese',
};

/** Whisper invents text for silence ("Thank you." …); skip clips with no speech. */
export function hasSpeech(samples: Float32Array, sampleRate = 16000): boolean {
  const frame = Math.round(sampleRate * 0.02);
  let voiced = 0;
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j]! * samples[j]!;
    if (Math.sqrt(sum / frame) > 0.01) voiced += 1;
  }
  return voiced * 0.02 >= 0.25;
}

async function loadTransformers() {
  const t = await import('@huggingface/transformers');
  t.env.cacheDir = MODEL_DIR;
  t.env.localModelPath = MODEL_DIR;
  t.env.allowRemoteModels = false;
  return t;
}

export async function createWhisper(size: AsrSize, threads: number): Promise<Transcriber> {
  const t = await loadTransformers();
  const asr = await t.pipeline('automatic-speech-recognition', ASR_MODELS[size], {
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    session_options: { intraOpNumThreads: threads, interOpNumThreads: 1 },
  });
  return {
    async transcribe(samples, lang) {
      // Long clips are cut to 20 s: requests are short, and this bounds the work per request.
      const clip = samples.length > 16000 * 20 ? samples.subarray(0, 16000 * 20) : samples;
      const out = (await asr(clip, { language: WHISPER_LANG[lang], task: 'transcribe', max_new_tokens: 64 })) as { text: string };
      return out.text.trim();
    },
  };
}

export async function createE5(threads: number): Promise<Embedder> {
  const t = await loadTransformers();
  const extractor = await t.pipeline('feature-extraction', EMBED_MODEL, {
    dtype: 'q8',
    session_options: { intraOpNumThreads: Math.min(2, threads), interOpNumThreads: 1 },
  });
  return {
    async embed(texts, kind) {
      const out: Float32Array[] = [];
      // Small batches keep memory flat while the index is built.
      for (let i = 0; i < texts.length; i += 32) {
        const batch = texts.slice(i, i + 32).map((x) => `${kind}: ${x}`);
        const tensor = await extractor(batch, { pooling: 'mean', normalize: true });
        const [rows, dims] = tensor.dims as [number, number];
        const data = tensor.data as Float32Array;
        for (let r = 0; r < rows; r++) out.push(data.slice(r * dims, (r + 1) * dims));
      }
      return out;
    },
  };
}

export interface AiStatus {
  asr: { model: string; state: ModelState; error?: string };
  embed: { model: string; state: ModelState; error?: string };
}

export interface AiEngineOptions {
  asrSize: AsrSize;
  threads: number;
  /** Factories are injectable for tests. */
  loadAsr?: () => Promise<Transcriber>;
  loadEmbedder?: () => Promise<Embedder>;
}

export class AiEngine {
  private asr: Transcriber | null = null;
  private needs: SemanticNeedMatcher | null = null;
  private replies: ReplyMatcher | null = null;
  private keyword = createKeywordMatcher();
  private queue: Promise<unknown> = Promise.resolve();
  readonly status: AiStatus;

  constructor(private options: AiEngineOptions) {
    this.status = {
      asr: { model: ASR_MODELS[options.asrSize], state: 'off' },
      embed: { model: EMBED_MODEL, state: 'off' },
    };
  }

  /** Load models one after the other (lower peak memory). Never throws. */
  async start(): Promise<void> {
    this.status.embed.state = 'loading';
    try {
      const embedder = await (this.options.loadEmbedder ?? (() => createE5(this.options.threads)))();
      this.needs = await SemanticNeedMatcher.create(embedder);
      this.replies = await ReplyMatcher.create(embedder);
      this.status.embed.state = 'ready';
    } catch (e) {
      this.status.embed = { ...this.status.embed, state: 'error', error: String(e) };
    }
    this.status.asr.state = 'loading';
    try {
      this.asr = await (this.options.loadAsr ?? (() => createWhisper(this.options.asrSize, this.options.threads)))();
      this.status.asr.state = 'ready';
    } catch (e) {
      this.status.asr = { ...this.status.asr, state: 'error', error: String(e) };
    }
  }

  get canTranscribe(): boolean {
    return this.asr !== null;
  }

  /** Speech → text. Throws if the speech model is not available. */
  transcribe(samples: Float32Array, lang: LangCode): Promise<string> {
    const asr = this.asr;
    if (!asr) return Promise.reject(new Error('speech model not loaded'));
    if (!hasSpeech(samples)) return Promise.resolve('');
    return this.serial(() => asr.transcribe(samples, lang));
  }

  /** Text → need. Uses meaning-based matching when the embedding model is ready, else keywords. */
  matchNeeds(text: string): Promise<MatchResult> {
    const needs = this.needs;
    if (!needs) return Promise.resolve(this.keyword.match(text));
    return this.serial(() => needs.match(text));
  }

  /** Crew speech → closest verified reply (null when unsure or unavailable). */
  async matchReply(text: string): Promise<{ replyId: ReplyId | null; confidence: number }> {
    const replies = this.replies;
    if (!replies || !text.trim()) return { replyId: null, confidence: 0 };
    const r = await this.serial(() => replies.match(text));
    return { replyId: r.replyId, confidence: r.confidence };
  }

  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
