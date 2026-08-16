import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCookie, clearCookie, deleteSession, SESSION_COOKIE_NAME } from '../_lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  if (sessionId) await deleteSession(sessionId);
  clearCookie(res, SESSION_COOKIE_NAME);
  res.status(200).json({ ok: true });
}
