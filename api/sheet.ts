import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken, batchGetValues, batchClearValues, batchUpdateValues } from './_lib/googleSheets.js';
import { TABLE_NAMES } from './_lib/tables.js';
import { getCookie, getSessionSub, getUserRecord, SESSION_COOKIE_NAME } from './_lib/session.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = getCookie(req, SESSION_COOKIE_NAME);
  const sub = sessionId ? await getSessionSub(sessionId) : null;
  if (!sub) {
    res.status(401).json({ error: '인증 실패' });
    return;
  }
  const record = await getUserRecord(sub);
  if (!record) {
    res.status(401).json({ error: '인증 실패' });
    return;
  }

  let clientId: string, clientSecret: string;
  try {
    clientId = requireEnv('GOOGLE_CLIENT_ID');
    clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  try {
    const accessToken = await getAccessToken(record.refreshToken, clientId, clientSecret);
    const spreadsheetId = record.spreadsheetId;

    if (req.method === 'GET') {
      const tables = await batchGetValues(spreadsheetId, [...TABLE_NAMES], accessToken);
      res.status(200).json({ tables });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body as { tables?: Record<string, unknown[][]> };
      if (!body?.tables) {
        res.status(400).json({ error: 'tables 필드가 필요합니다.' });
        return;
      }
      const names = TABLE_NAMES.filter((name) => body.tables![name]);
      await batchClearValues(spreadsheetId, names, accessToken);
      await batchUpdateValues(
        spreadsheetId,
        names.map((name) => ({ range: `${name}!A1`, values: body.tables![name] })),
        accessToken
      );
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
