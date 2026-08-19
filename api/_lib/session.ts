import { kv } from '@vercel/kv';
import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const SESSION_COOKIE_NAME = 'session_id';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export interface GoogleUserRecord {
  refreshToken: string;
  spreadsheetId: string;
  email: string;
  createdAt: string;
}

function getEncryptionKey(): Buffer {
  const hex = process.env.KV_ENCRYPTION_KEY;
  if (!hex) throw new Error('Missing environment variable: KV_ENCRYPTION_KEY');
  return Buffer.from(hex, 'hex');
}

export function encryptToken(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString('base64')).join('.');
}

export function decryptToken(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, encryptedB64] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function getCookie(req: VercelRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';').map((p) => p.trim())) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx) === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return undefined;
}

function appendSetCookie(res: VercelResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  const list = existing ? (Array.isArray(existing) ? existing.map(String) : [String(existing)]) : [];
  res.setHeader('Set-Cookie', [...list, cookie]);
}

export function setCookie(res: VercelResponse, name: string, value: string, maxAgeSeconds: number): void {
  appendSetCookie(
    res,
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  );
}

export function clearCookie(res: VercelResponse, name: string): void {
  appendSetCookie(res, `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export async function createSession(sub: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  await kv.set(`session:${sessionId}`, sub, { ex: SESSION_TTL_SECONDS });
  return sessionId;
}

export async function getSessionSub(sessionId: string): Promise<string | null> {
  const sub = await kv.get<string>(`session:${sessionId}`);
  return sub ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await kv.del(`session:${sessionId}`);
}

// Shared session-auth gate for every data/token endpoint (api/sheet.ts, access-token.ts,
// select-spreadsheet.ts): resolves the session cookie to a Google account record, or writes
// a 401 and returns null. Callers must `return` immediately when this returns null.
export async function requireSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<{ sub: string; record: GoogleUserRecord } | null> {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  const sub = sessionId ? await getSessionSub(sessionId) : null;
  if (!sub) {
    res.status(401).json({ error: '인증 실패' });
    return null;
  }
  const record = await getUserRecord(sub);
  if (!record) {
    res.status(401).json({ error: '인증 실패' });
    return null;
  }
  return { sub, record };
}

export async function getUserRecord(sub: string): Promise<GoogleUserRecord | null> {
  const raw = await kv.get<GoogleUserRecord>(`google-user:${sub}`);
  if (!raw) return null;
  return { ...raw, refreshToken: decryptToken(raw.refreshToken) };
}

export async function saveUserRecord(sub: string, record: GoogleUserRecord): Promise<void> {
  await kv.set(`google-user:${sub}`, { ...record, refreshToken: encryptToken(record.refreshToken) });
}

export async function deleteUserRecord(sub: string): Promise<void> {
  await kv.del(`google-user:${sub}`);
}

export { SESSION_TTL_SECONDS };
