import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCookie, getSessionSub, getUserRecord, SESSION_COOKIE_NAME } from '../_lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  const sub = sessionId ? await getSessionSub(sessionId) : null;
  if (!sub) {
    res.status(200).json({ connected: false });
    return;
  }
  const record = await getUserRecord(sub);
  if (!record) {
    res.status(200).json({ connected: false });
    return;
  }
  res.status(200).json({ connected: true, email: record.email });
}
