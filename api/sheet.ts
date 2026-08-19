import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken, batchGetValues, batchClearValues, batchUpdateValues } from './_lib/googleSheets.js';
import { TABLE_NAMES } from './_lib/tables.js';
import { requireSession } from './_lib/session.js';
import { requireGoogleClientCredentials } from './_lib/env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireSession(req, res);
  if (!auth) return;
  const { record } = auth;

  const creds = requireGoogleClientCredentials(res);
  if (!creds) return;
  const { clientId, clientSecret } = creds;

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
      // Tabs are guaranteed to exist here — either from createSpreadsheet() on first
      // connect, or from ensureSheetsExist() in select-spreadsheet.ts at pick time. No
      // need to re-check on every export.
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
