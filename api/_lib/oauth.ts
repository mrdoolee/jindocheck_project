import type { VercelRequest } from '@vercel/node';

export const SCOPE = 'openid email https://www.googleapis.com/auth/drive.file';

export function getBaseUrl(req: VercelRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export function getRedirectUri(req: VercelRequest): string {
  return `${getBaseUrl(req)}/api/auth/google/callback`;
}

export interface IdTokenPayload {
  sub: string;
  email: string;
}

export function decodeIdTokenPayload(idToken: string): IdTokenPayload {
  const payload = idToken.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  const data = JSON.parse(json) as { sub: string; email: string };
  return { sub: data.sub, email: data.email };
}

export function buildAuthorizeUrl(req: VercelRequest, clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
