import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCodeForTokens, createSpreadsheet } from '../../_lib/googleSheets.js';
import { getRedirectUri, decodeIdTokenPayload } from '../../_lib/oauth.js';
import { TABLE_NAMES } from '../../_lib/tables.js';
import {
  getCookie,
  clearCookie,
  setCookie,
  createSession,
  getUserRecord,
  saveUserRecord,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '../../_lib/session.js';

const STATE_COOKIE = 'oauth_state';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('환경변수가 설정되지 않았습니다.');
    return;
  }

  const expectedState = getCookie(req, STATE_COOKIE);
  clearCookie(res, STATE_COOKIE);
  if (!expectedState || req.query.state !== expectedState) {
    res.status(401).send('인증 실패: state 값이 일치하지 않습니다.');
    return;
  }

  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).send(`구글 인증 실패: ${req.query.error ?? '알 수 없는 오류'}`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, getRedirectUri(req));
    if (!tokens.refresh_token) {
      res
        .status(500)
        .send(
          '구글이 refresh_token을 내려주지 않았습니다. 이미 이 앱에 권한을 승인한 적이 있다면 ' +
            'https://myaccount.google.com/permissions 에서 앱 접근 권한을 해제한 뒤 다시 시도하세요.'
        );
      return;
    }
    if (!tokens.id_token) {
      res.status(500).send('구글이 id_token을 내려주지 않았습니다.');
      return;
    }

    const { sub, email } = decodeIdTokenPayload(tokens.id_token);
    const existing = await getUserRecord(sub);

    const spreadsheetId = existing
      ? existing.spreadsheetId
      : (await createSpreadsheet('학급 진도 관리 동기화', [...TABLE_NAMES], tokens.access_token)).spreadsheetId;

    await saveUserRecord(sub, {
      refreshToken: tokens.refresh_token,
      spreadsheetId,
      email,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });

    const sessionId = await createSession(sub);
    setCookie(res, SESSION_COOKIE_NAME, sessionId, SESSION_TTL_SECONDS);

    res.writeHead(302, { Location: '/#/setup/sheets?connected=1' });
    res.end();
  } catch (err) {
    res.status(500).send(`연결 실패: ${(err as Error).message}`);
  }
}
