import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getCookie,
  clearCookie,
  deleteSession,
  getSessionSub,
  getUserRecord,
  clearUserToken,
  SESSION_COOKIE_NAME,
} from '../_lib/session.js';

const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  if (!sessionId) {
    res.status(200).json({ ok: true });
    return;
  }

  const sub = await getSessionSub(sessionId);
  if (sub) {
    const record = await getUserRecord(sub);
    if (record) {
      try {
        await fetch(REVOKE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: record.refreshToken }).toString(),
        });
      } catch {
        // Best-effort: still remove local records even if Google's revoke call fails,
        // so the user isn't stuck "connected" server-side with no way to disconnect.
      }
    }
    // Keep the spreadsheetId mapping (not the token) so reconnecting with the same
    // Google account resumes the same sheet instead of creating a new one — drive.file
    // scope means we have no other way to find it again once the mapping is gone.
    await clearUserToken(sub);
  }

  await deleteSession(sessionId);
  clearCookie(res, SESSION_COOKIE_NAME);
  res.status(200).json({ ok: true });
}
