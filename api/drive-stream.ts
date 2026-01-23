const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });
  return out;
}

async function handler(req, res) {
  try {
    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['ps'];
    if (!token) return res.status(401).send('Missing session cookie');

    let payload;
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

    const range = req.headers.range;

    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    // مرّر الهيدرز المهمة (للـ streaming)
    if (driveRes?.headers) {
      const h = driveRes.headers;
      if (h['content-type']) res.setHeader('Content-Type', h['content-type']);
      if (h['content-length']) res.setHeader('Content-Length', h['content-length']);
      if (h['content-range']) res.setHeader('Content-Range', h['content-range']);
      res.setHeader('Accept-Ranges', 'bytes');
    } else {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    }

    // no-store
    res.setHeader('Cache-Control', 'no-store');

    // لو فيه Range غالبًا هتبقى 206
    if (range) res.statusCode = 206;

    driveRes.data.on('error', (e) => {
      console.error('[drive-stream] stream error', e);
      if (!res.headersSent) res.status(500).end('Stream error');
      else res.end();
    });

    driveRes.data.pipe(res);
  } catch (err) {
    console.error('[drive-stream] ERROR:', err);
    return res.status(500).send('Drive stream failed');
  }
}

module.exports = handler;
