// api/drive-stream.js

const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;

  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });

  return out;
}

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') return 'gdrive';
  if (v === 'youtube' || v === 'yt') return 'youtube';
  return v;
}

module.exports = async function handler(req, res) {
  try {
    const secret = process.env.PLAYER_SESSION_SECRET;
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.ps;
    if (!token) return res.status(401).send('Missing session cookie');

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).send('Invalid/Expired session');
    }

    const provider = normalizeProvider(payload?.videoProvider);
    if (provider !== 'gdrive') return res.status(400).send('Not a Google Drive session');

    const fileId = String(payload?.videoRef || '');
    if (!fileId) return res.status(400).send('Missing fileId in session');

    const clientEmail = process.env.GOOGLE_DRIVE_SA_EMAIL;
    let privateKey = process.env.GOOGLE_DRIVE_SA_PRIVATE_KEY;

    if (!clientEmail || !privateKey) return res.status(500).send('Missing Google Drive service account env');

    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ✅ اقرأ نوع الملف الحقيقي
    const meta = await drive.files.get({
      fileId,
      fields: 'mimeType,name,size',
      supportsAllDrives: true,
    });

    const mimeType = String(meta.data.mimeType || '');
    const fileName = String(meta.data.name || 'video');

    // ✅ لو مش فيديو، رجّع Error واضح بدل "Format error"
    if (!mimeType.startsWith('video/')) {
      return res.status(415).json({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        mimeType,
        fileName,
        hint: 'ارفع الفيديو بصيغة MP4 (H.264 + AAC) أو WebM',
      });
    }

    const range = req.headers.range;

    const driveRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: range ? { Range: range } : undefined }
    );

    const h = driveRes.headers || {};
    const ct = String(h['content-type'] || mimeType);

    // ✅ لو Drive رجّع HTML/JSON يبقى فيه مشكلة صلاحيات/خطأ
    if (ct.includes('text/html') || ct.includes('application/json')) {
      return res.status(502).json({
        error: 'DRIVE_RETURNED_NON_VIDEO',
        contentType: ct,
        hint: 'راجع صلاحيات الملف: شاركه مع GOOGLE_DRIVE_SA_EMAIL أو اجعله Anyone with link',
      });
    }

    // Headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    if (h['content-length']) res.setHeader('Content-Length', String(h['content-length']));
    if (h['content-range']) res.setHeader('Content-Range', String(h['content-range']));

    if (range) res.statusCode = 206;

    driveRes.data.on('error', (e) => {
      console.error('[drive-stream] stream error', e);
      if (!res.headersSent) res.status(500).end('Stream error');
      else res.end();
    });

    driveRes.data.pipe(res);
  } catch (err) {
    console.error('[drive-stream] ERROR:', err);
    res.status(500).send('Drive stream failed');
  }
};
