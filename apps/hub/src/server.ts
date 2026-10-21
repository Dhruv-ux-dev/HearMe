import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { LANGUAGES, type HubStatus, type LangCode, type UnderstandResult, type UnderstandStreamLine, type UnderstandTarget } from '@hearme/shared';
import type { AiEngine } from './ai';
import { AudioError, decodeAudio, hasFfmpeg } from './audio';
import { lookupBooking } from './booking';
import { mobileconfig, pemToDer, type HubCertificate } from './cert';
import { joinPage, qrSvg, seatCardsPage, trustPage } from './pages';
import { STORY_SENTENCES, storyVoice } from './story';
import type { CabinRelay } from './relay';

export interface PublicUrls {
  /** Best URL for other devices (LAN + HTTPS when available). */
  base: string;
  lan: string[];
  /**
   * Plain-http page that installs the hub's root certificate on a phone and
   * then opens the app (set when phones may need to install it first).
   */
  trust?: string;
  /** What seat 23C's QR code opens (the trust page when there is one). */
  join?: string;
}

/** The address a seat's QR code should open: through /trust when phones may need the root first. */
export function joinUrl(urls: PublicUrls, seat: string): string {
  const app = `/mobile/?seat=${encodeURIComponent(seat)}`;
  return urls.trust ? `${urls.trust}?next=${encodeURIComponent(app)}` : `${urls.base}${app}`;
}

/** Only same-site paths may follow the trust check (no open redirects). */
export function safeNext(v: string | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') && v.length <= 200 ? v : '/mobile/?seat=23C';
}

export interface HandlerOptions {
  staticDir: string;
  ai: AiEngine;
  relay: CabinRelay;
  urls: () => PublicUrls;
  version: string;
  /** The HTTPS certificate in use (null when HTTPS is off). */
  certificate?: () => HubCertificate | null;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

const LANG_CODES = new Set<string>(LANGUAGES.map((l) => l.code));
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024;

function send(res: ServerResponse, status: number, body: string | Buffer, type = 'application/json; charset=utf-8'): void {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const json = (res: ServerResponse, status: number, value: unknown) => send(res, status, JSON.stringify(value));

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new AudioError('request too large', 413));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseLang(v: unknown): LangCode | null {
  return typeof v === 'string' && LANG_CODES.has(v) ? (v as LangCode) : null;
}

function parseTarget(v: unknown): UnderstandTarget {
  return v === 'replies' ? 'replies' : 'needs';
}

/** Only the laptop running the hub (the demo stage, scripts) may change models or warm them. */
export function isLocal(req: IncomingMessage): boolean {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
}

/** Phones ask for a streamed answer so they can show each stage while Whisper works. */
function wantsStream(req: IncomingMessage): boolean {
  return String(req.headers.accept ?? '').includes('application/x-ndjson');
}

export function createHandler(opts: HandlerOptions) {
  const root = resolve(opts.staticDir);

  async function understandText(text: string, lang: LangCode, target: UnderstandTarget, asrMs: number, onMatching?: () => void): Promise<UnderstandResult> {
    if (text) onMatching?.();
    const t0 = Date.now();
    const result: UnderstandResult = { transcript: text, asrMs, matchMs: 0 };
    if (target === 'needs') result.match = await opts.ai.matchNeeds(text);
    else result.reply = await opts.ai.matchReply(text);
    result.matchMs = Date.now() - t0;
    if (text) {
      opts.relay.emitEvent({
        type: 'understood',
        at: Date.now(),
        target,
        lang,
        transcript: text,
        match: target === 'needs' ? result.match?.candidates[0]?.needId : (result.reply?.replyId ?? undefined),
        confidence: target === 'needs' ? (result.match?.confidence ?? 0) : (result.reply?.confidence ?? 0),
        asrMs,
        matchMs: result.matchMs,
      });
    }
    return result;
  }

  async function api(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const path = url.pathname;
    if (path === '/api/status' && req.method === 'GET') {
      const urls = opts.urls();
      const { asr, embed } = opts.ai.status;
      const status: HubStatus & { urls: PublicUrls; clients: number } = {
        ok: true,
        name: 'hearme-hub',
        version: opts.version,
        asr: { model: asr.model, state: asr.state, warmupMs: asr.warmupMs, typicalMs: asr.typicalMs ?? (asr.state === 'ready' ? opts.ai.estimateAsrMs() : undefined) },
        embed: { model: embed.model, state: embed.state, warmupMs: embed.warmupMs, typicalMs: embed.typicalMs },
        ffmpeg: hasFfmpeg(),
        urls,
        clients: opts.relay.clientCount,
        queue: opts.ai.queueLength,
      };
      return json(res, 200, status);
    }
    if (path === '/api/understand' && req.method === 'POST') {
      const lang = parseLang(url.searchParams.get('lang'));
      if (!lang) return json(res, 400, { error: 'unknown language' });
      if (!opts.ai.canTranscribe) return json(res, 503, { error: 'speech model is not ready yet' });
      const target = parseTarget(url.searchParams.get('target'));
      const body = await readBody(req, MAX_AUDIO_BYTES);
      const samples = await decodeAudio(body, req.headers['content-type']);
      const stream = wantsStream(req);
      const write = (line: UnderstandStreamLine) => {
        if (stream && !res.writableEnded) res.write(`${JSON.stringify(line)}\n`);
      };
      if (stream) {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        write({ stage: 'received', seconds: Math.round((samples.length / 16000) * 10) / 10 });
      }
      try {
        const t0 = Date.now();
        let started = t0;
        const transcript = await opts.ai.transcribe(samples, lang, {
          onQueued: (ahead) => write({ stage: 'queued', ahead }),
          onStart: (estimateMs) => {
            started = Date.now();
            write({ stage: 'transcribing', estimateMs });
            opts.relay.emitEvent({ type: 'working', at: started, target, lang, estimateMs });
          },
        });
        const result = await understandText(transcript, lang, target, Date.now() - started, () => write({ stage: 'matching', transcript }));
        if (!stream) return json(res, 200, result);
        write({ stage: 'done', result });
        return void res.end();
      } catch (e) {
        if (!stream) throw e;
        // Headers are already sent: report the failure in the stream.
        write({ stage: 'error', status: e instanceof AudioError ? e.status : 500, error: e instanceof AudioError ? e.message : 'speech recognition failed' });
        return void res.end();
      }
    }
    if (path === '/api/story' && req.method === 'GET') {
      // The scripted demo's sentence (and whether a recording of it exists on this hub).
      const lang = parseLang(url.searchParams.get('lang')) ?? 'hi';
      const voice = storyVoice(lang);
      return json(res, 200, { lang, sentence: STORY_SENTENCES[lang] ?? null, voice: voice?.source ?? null });
    }
    if (path === '/api/story/voice' && req.method === 'GET') {
      const lang = parseLang(url.searchParams.get('lang')) ?? 'hi';
      const voice = storyVoice(lang);
      if (!voice) return json(res, 404, { error: 'no recording of the story sentence on this hub' });
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-HearMe-Voice': voice.source });
      return void res.end(voice.wav);
    }
    if (path === '/api/warmup' && req.method === 'POST') {
      if (!isLocal(req)) return json(res, 403, { error: 'only from the hub laptop' });
      return json(res, 200, await opts.ai.warmup());
    }
    if (path === '/api/asr' && req.method === 'POST') {
      // Only the laptop running the hub (the demo stage) may change the speech model.
      if (!isLocal(req)) return json(res, 403, { error: 'only from the hub laptop' });
      const size = url.searchParams.get('size');
      if (size !== 'small' && size !== 'base') return json(res, 400, { error: 'size must be small or base' });
      void opts.ai.switchAsr(size);
      return json(res, 202, { switching: size });
    }
    if (path === '/api/match' && req.method === 'POST') {
      const body = await readBody(req, MAX_JSON_BYTES);
      let input: { text?: unknown; lang?: unknown; target?: unknown };
      try {
        input = JSON.parse(body.toString('utf8'));
      } catch {
        return json(res, 400, { error: 'invalid JSON' });
      }
      const lang = parseLang(input.lang);
      if (!lang || typeof input.text !== 'string' || input.text.length > 300) return json(res, 400, { error: 'invalid request' });
      return json(res, 200, await understandText(input.text.trim(), lang, parseTarget(input.target), 0));
    }
    if (path === '/api/trust' && req.method === 'GET') {
      const cert = opts.certificate?.() ?? null;
      return json(res, 200, {
        source: cert?.source ?? 'none',
        caName: cert?.caName ?? null,
        caFingerprint: cert?.caFingerprint ?? null,
        hosts: cert?.hosts ?? [],
        notAfter: cert?.notAfter ?? null,
        trustPage: opts.urls().trust ?? null,
      });
    }
    if (path === '/api/booking' && req.method === 'GET') {
      const profile = lookupBooking(String(url.searchParams.get('seat') ?? '').toUpperCase());
      return profile ? json(res, 200, { profile, source: 'sample manifest' }) : json(res, 404, { error: 'no booking for this seat' });
    }
    if (path === '/api/qr.svg' && req.method === 'GET') {
      const data = url.searchParams.get('data') ?? '';
      if (!data || data.length > 500) return json(res, 400, { error: 'invalid data' });
      return send(res, 200, await qrSvg(data, Number(url.searchParams.get('size')) || 220), 'image/svg+xml');
    }
    return json(res, 404, { error: 'not found' });
  }

  function serveStatic(res: ServerResponse, pathname: string): void {
    let rel = decodeURIComponent(pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = resolve(join(root, normalize(rel)));
    if (!file.startsWith(root + '/') && file !== root) return send(res, 403, 'forbidden', 'text/plain');
    if (!existsSync(file) || !statSync(file).isFile()) {
      // "/mobile" without the slash, or a page that has not been built yet.
      if (existsSync(join(file, 'index.html'))) {
        res.writeHead(301, { Location: `${pathname}/` });
        return void res.end();
      }
      return send(res, 404, 'not found — run `npm run build` first', 'text/plain; charset=utf-8');
    }
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    const hashed = /\/assets\/|\/_expo\/static\/|\.[0-9a-f]{8,}\./.test(file);
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': type.startsWith('text/html') || file.endsWith('sw.js') ? 'no-cache' : hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'microphone=(self), camera=(self)',
    });
    createReadStream(file).pipe(res);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://hub.local');
    try {
      if (url.pathname.startsWith('/api/')) {
        // LAN-only API with no cookies: allow the Expo dev server and native apps to call it.
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        if (req.method === 'OPTIONS') return void res.writeHead(204).end();
        return await api(req, res, url);
      }
      const urls = opts.urls();
      const cert = opts.certificate?.() ?? null;
      if (url.pathname === '/trust' || url.pathname === '/trust/') {
        const secure = urls.base.startsWith('https:') ? urls.base : null;
        return send(
          res,
          200,
          trustPage({
            source: cert ? cert.source : 'none',
            caName: cert?.caName ?? '',
            caFingerprint: cert?.caFingerprint ?? null,
            secureBase: cert ? secure : null,
            next: safeNext(url.searchParams.get('next')),
          }),
          'text/html; charset=utf-8',
        );
      }
      if (url.pathname.startsWith('/trust/')) {
        // Only the root's public certificate is ever served; its private key stays on this laptop.
        const ca = cert?.caPem;
        if (!ca) return send(res, 404, 'no certificate to install', 'text/plain; charset=utf-8');
        const download = (body: string | Buffer, type: string, name: string) => {
          res.writeHead(200, { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          res.end(body);
        };
        if (url.pathname === '/trust/hearme-ca.crt') return download(pemToDer(ca), 'application/x-x509-ca-cert', 'hearme-ca.crt');
        if (url.pathname === '/trust/hearme-ca.pem') return download(ca, 'application/x-pem-file', 'hearme-ca.pem');
        if (url.pathname === '/trust/hearme.mobileconfig') return download(mobileconfig(ca, cert.caName), 'application/x-apple-aspen-config', 'HearMe.mobileconfig');
        return send(res, 404, 'not found', 'text/plain; charset=utf-8');
      }
      if (url.pathname === '/join') {
        return send(res, 200, await joinPage(joinUrl(urls, '23C'), `${urls.base}/#/crew`, `${urls.base}/#/stage`, !!urls.trust), 'text/html; charset=utf-8');
      }
      if (url.pathname === '/seats') {
        const rows = [21, 22, 23, 24, 25, 26];
        const seats = rows.flatMap((r) => ['A', 'B', 'C', 'D', 'E', 'F'].map((c) => `${r}${c}`)).concat('31A');
        return send(res, 200, await seatCardsPage((seat) => joinUrl(urls, seat), seats), 'text/html; charset=utf-8');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed', 'text/plain');
      return serveStatic(res, url.pathname);
    } catch (e) {
      if (e instanceof AudioError) return json(res, e.status, { error: e.message });
      if (!res.headersSent) json(res, 500, { error: 'internal error' });
    }
  };
}
