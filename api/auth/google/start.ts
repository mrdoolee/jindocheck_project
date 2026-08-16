import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { buildAuthorizeUrl } from '../../_lib/oauth.js';
import { setCookie } from '../../_lib/session.js';

const STATE_COOKIE = 'oauth_state';
const STATE_TTL_SECONDS = 600;

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  setCookie(res, STATE_COOKIE, state, STATE_TTL_SECONDS);
  res.setHeader('Cache-Control', 'no-store');

  const url = buildAuthorizeUrl(req, clientId, state);
  res.writeHead(302, { Location: url });
  res.end();
}
