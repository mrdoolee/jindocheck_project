import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken } from '../../_lib/googleSheets.js';
import { requireSession } from '../../_lib/session.js';
import { requireGoogleClientCredentials } from '../../_lib/env.js';

// Mints a short-lived access token for the Google Picker to use client-side. The
// refresh_token and client_secret never leave the server — only this narrow, short-lived
// token is ever sent to the browser.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await requireSession(req, res);
  if (!auth) return;
  const { record } = auth;

  const creds = requireGoogleClientCredentials(res);
  if (!creds) return;
  const { clientId, clientSecret } = creds;

  try {
    const accessToken = await getAccessToken(record.refreshToken, clientId, clientSecret);
    res.status(200).json({ accessToken });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
}
