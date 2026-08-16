const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
}

async function postForm(url: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Google token endpoint error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export async function getAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const body = await postForm(TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return body.access_token as string;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const body = await postForm(TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  return body as unknown as GoogleTokens;
}

async function sheetsFetch(path: string, accessToken: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${SHEETS_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Sheets API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export async function batchGetValues(
  spreadsheetId: string,
  ranges: string[],
  accessToken: string
): Promise<Record<string, unknown[][]>> {
  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const body = await sheetsFetch(
    `/${spreadsheetId}/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`,
    accessToken
  );
  const valueRanges = (body.valueRanges as { range: string; values?: unknown[][] }[]) ?? [];
  const result: Record<string, unknown[][]> = {};
  ranges.forEach((range, i) => {
    const tabName = range.split('!')[0];
    result[tabName] = valueRanges[i]?.values ?? [];
  });
  return result;
}

export async function batchClearValues(spreadsheetId: string, ranges: string[], accessToken: string): Promise<void> {
  await sheetsFetch(`/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ ranges }),
  });
}

export async function batchUpdateValues(
  spreadsheetId: string,
  data: { range: string; values: unknown[][] }[],
  accessToken: string
): Promise<void> {
  await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  });
}

export async function createSpreadsheet(
  title: string,
  sheetTitles: string[],
  accessToken: string
): Promise<{ spreadsheetId: string }> {
  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
    }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Sheets API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return { spreadsheetId: body.spreadsheetId as string };
}
