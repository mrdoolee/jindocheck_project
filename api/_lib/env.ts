import type { VercelResponse } from '@vercel/node';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// Shared for every endpoint that needs to mint/refresh a Google access token. Writes a 500
// and returns null on failure; callers must `return` immediately when this returns null.
export function requireGoogleClientCredentials(
  res: VercelResponse
): { clientId: string; clientSecret: string } | null {
  try {
    return { clientId: requireEnv('GOOGLE_CLIENT_ID'), clientSecret: requireEnv('GOOGLE_CLIENT_SECRET') };
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return null;
  }
}
