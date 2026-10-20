import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

/**
 * HTTPS for the cabin hub. Phone browsers only allow the microphone on secure
 * pages, so the hub serves HTTPS with a self-signed certificate for its LAN
 * addresses (passengers accept it once). An airline deployment would use a
 * certificate from its own CA instead.
 */
const CERT_DIR = fileURLToPath(new URL('../.cert/', import.meta.url));

export async function loadOrCreateCert(hosts: string[]): Promise<{ key: string; cert: string }> {
  const metaPath = join(CERT_DIR, 'hosts.json');
  const keyPath = join(CERT_DIR, 'hub-key.pem');
  const certPath = join(CERT_DIR, 'hub-cert.pem');
  const wanted = ['localhost', '127.0.0.1', ...hosts].sort();
  if (existsSync(metaPath) && existsSync(keyPath) && existsSync(certPath)) {
    const saved = JSON.parse(readFileSync(metaPath, 'utf8')) as { hosts: string[]; until: number };
    const covers = wanted.every((h) => saved.hosts.includes(h));
    if (covers && saved.until > Date.now() + 86_400_000) {
      return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
    }
  }
  const notBeforeDate = new Date();
  const notAfterDate = new Date(notBeforeDate.getTime() + 365 * 86_400_000);
  const altNames = wanted.map((h) => (/^\d+\.\d+\.\d+\.\d+$/.test(h) ? { type: 7 as const, ip: h } : { type: 2 as const, value: h }));
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'HearMe cabin hub' }], {
    keySize: 2048,
    algorithm: 'sha256',
    notBeforeDate,
    notAfterDate,
    extensions: [{ name: 'subjectAltName', altNames }],
  });
  mkdirSync(CERT_DIR, { recursive: true });
  writeFileSync(keyPath, pems.private, { mode: 0o600 });
  writeFileSync(certPath, pems.cert);
  writeFileSync(metaPath, JSON.stringify({ hosts: wanted, until: notAfterDate.getTime() }));
  return { key: pems.private, cert: pems.cert };
}
