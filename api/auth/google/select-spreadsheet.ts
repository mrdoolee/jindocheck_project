import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSheetsExist } from '../../_lib/googleSheets.js';
import { TABLE_NAMES } from '../../_lib/tables.js';
import { requireSession, getUserRecord, saveUserRecord } from '../../_lib/session.js';

// Repoints this teacher's sync target at a spreadsheet the user picked via Google Picker
// (instead of the one auto-created on first connect). Immediately ensures the picked
// spreadsheet has all of TABLE_NAMES' tabs, so a mismatch surfaces here rather than on the
// next export (api/sheet.ts also does this on every request as a second line of defense).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await requireSession(req, res);
  if (!auth) return;
  const { sub } = auth;

  const body = req.body as { spreadsheetId?: string; accessToken?: string };
  const spreadsheetId = body?.spreadsheetId;
  const accessToken = body?.accessToken;
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    res.status(400).json({ error: 'spreadsheetId 필드가 필요합니다.' });
    return;
  }
  if (!accessToken || typeof accessToken !== 'string') {
    res.status(400).json({ error: 'accessToken 필드가 필요합니다.' });
    return;
  }

  try {
    // The client already minted this token via access-token.ts to hand to the Picker —
    // reuse it instead of spending a second Google token-endpoint round trip on a fresh one.
    await ensureSheetsExist(spreadsheetId, [...TABLE_NAMES], accessToken);

    // Re-read the record right before writing (not the one from requireSession above) so
    // the window in which a concurrent disconnect() could delete the record and have this
    // write resurrect it is as small as possible — a single read immediately followed by
    // the write, with no awaited network calls in between.
    const record = await getUserRecord(sub);
    if (!record) {
      res.status(401).json({ error: '연결이 해제되었습니다. 다시 연결해주세요.' });
      return;
    }
    await saveUserRecord(sub, { ...record, spreadsheetId });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
