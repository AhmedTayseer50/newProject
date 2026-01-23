/* api/drive-stream.ts */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
const { google } = require('googleapis') as typeof import('googleapis');

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) {
      res.status(500).send('Missing env PLAYER_SESSION_SECRET');
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['ps'];
    if (!token) {
      res.status(401).send('Missing session cookie');
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      res.status(401).send('Invalid/Expired session');
      return;
    }

    if (payload?.videoProvider !== 'gdrive') {
      res.status(400).send('Not a Google Drive session');
      return;
    }

    const fileId = String(payload?.videoRef || '');
    if (!fileId) {
      res.status(400).send('Missing fileId in session');
      return;
    }

    const clientEmail = process.env['GOOGLE_DRIVE_SA_EMAIL'];
    let privateKey = process.env['GOOGLE_DRIVE_SA_PRIVATE_KEY'];

    if (!clientEmail || !privateKey) {
      res.status(500).send('Missing Google Drive service account env');
      return;
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const range = req.headers.range;

    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    const h = driveRes.headers || {};

    if (h['content-type']) res.setHeader('Content-Type', String(h['content-type']));
    if (h['content-length']) res.setHeader('Content-Length', String(h['content-length']));
    if (h['content-range']) res.setHeader('Content-Range', String(h['content-range']));

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    if (range) res.statusCode = 206;

    driveRes.data.on('error', (e: unknown) => {
      console.error('[drive-stream] stream error', e);
      if (!res.headersSent) res.status(500).end('Stream error');
      else res.end();
    });

    driveRes.data.pipe(res);
  } catch (err: unknown) {
    console.error('[drive-stream] ERROR:', err);
    res.status(500).send('Drive stream failed');
  }
}
