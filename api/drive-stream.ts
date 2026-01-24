// api/drive-stream.ts
// Vercel Serverless Function (Node)
// Streams Google Drive video with Range support, using a short-lived session cookie "ps"

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

    const range = req.headers?.range;

    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    // خُد نفس status من جوجل (ده مهم جدًا)
    const status = driveRes?.status || (range ? 206 : 200);
    res.statusCode = status;

    const h = driveRes?.headers || {};
    const contentType = h['content-type'] || 'video/mp4';
    const contentLength = h['content-length'];
    const contentRange = h['content-range'];
    const contentDisposition = h['content-disposition'];

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');

    // مرّر Content-Disposition لو موجود (بيساعد اسم الملف)
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    // لو 206 لازم Content-Range. لو مفيش → هننزّلها لـ 200 عشان المتصفح ما ينهارش
    if (status === 206) {
      if (!contentRange) {
        res.statusCode = 200;
      } else {
        res.setHeader('Content-Range', contentRange);
      }
    }

    if (contentLength) res.setHeader('Content-Length', contentLength);

    // stream errors
    driveRes.data.on('error', (e: any) => {
      console.error('[drive-stream] upstream stream error:', e);
      try {
        if (!res.headersSent) res.status(500).end('Stream error');
        else res.end();
      } catch (_) {}
    });

    // pipe stream
    driveRes.data.pipe(res);
  } catch (err) {
    console.error('[drive-stream] ERROR:', err);
    return res.status(500).send('Drive stream failed');
  }
}

module.exports = handler;
