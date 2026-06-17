// api/drive-stream.ts
// Vercel Serverless Function (Node)
// Streams Google Drive video with proper Range support, using a short-lived session cookie "ps".

const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });

  return out;
}

function parseRangeHeader(rangeHeader: string | undefined, fileSize: number) {
  if (!rangeHeader || !fileSize) return null;

  const match = String(rangeHeader).match(/bytes=(\d*)-(\d*)/);
  if (!match) return null;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : fileSize - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0) start = 0;
  if (end >= fileSize) end = fileSize - 1;
  if (start > end || start >= fileSize) return null;

  return { start, end };
}

async function handler(req: any, res: any) {
  try {
    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    const cookies = parseCookies(req.headers?.cookie);
    const token = cookies['ps'];
    if (!token) return res.status(401).send('Missing session cookie');

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).send('Invalid/Expired session');
    }

    if (payload?.videoProvider !== 'gdrive') {
      return res.status(400).send('Not a Google Drive session');
    }

    const fileId = String(payload?.videoRef || '');
    if (!fileId) return res.status(400).send('Missing fileId in session');

    const clientEmail = process.env['GOOGLE_DRIVE_SA_EMAIL'];
    let privateKey = process.env['GOOGLE_DRIVE_SA_PRIVATE_KEY'];

    if (!clientEmail || !privateKey) {
      return res.status(500).send('Missing Google Drive service account env');
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const metaRes = await drive.files.get({
      fileId,
      fields: 'name,size,mimeType',
      supportsAllDrives: true,
    });

    const fileSize = Number(metaRes?.data?.size || 0);
    const contentType = metaRes?.data?.mimeType || 'video/mp4';
    const range = parseRangeHeader(req.headers?.range, fileSize);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Content-Disposition', 'inline');

    let driveRangeHeader: string | undefined;

    if (range && fileSize) {
      const chunkSize = range.end - range.start + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
      res.setHeader('Content-Length', String(chunkSize));
      driveRangeHeader = `bytes=${range.start}-${range.end}`;
    } else {
      res.statusCode = 200;
      if (fileSize) res.setHeader('Content-Length', String(fileSize));
    }

    const driveRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      {
        responseType: 'stream',
        headers: driveRangeHeader ? { Range: driveRangeHeader } : undefined,
      },
    );

    driveRes.data.on('error', (e: any) => {
      console.error('[drive-stream] upstream stream error:', e);
      try {
        if (!res.headersSent) res.status(500).end('Stream error');
        else res.end();
      } catch (_) {}
    });

    driveRes.data.pipe(res);
  } catch (err: any) {
    console.error('[drive-stream] ERROR:', err);
    return res.status(500).send(err?.message || 'Drive stream failed');
  }
}

module.exports = handler;
