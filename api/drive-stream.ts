// api/drive-stream.ts
// Vercel Serverless Function (Node)
// Streams Google Drive video with protected Range support.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

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

function sha256(value: any) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeProvider(value: any) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') return 'gdrive';
  return v;
}

function isLikelyBrowserVideoRequest(req: any) {
  const secFetchDest = String(req.headers?.['sec-fetch-dest'] || '').toLowerCase();
  const secFetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();
  const secFetchMode = String(req.headers?.['sec-fetch-mode'] || '').toLowerCase();

  // Chrome/Edge video element usually sends: Sec-Fetch-Dest: video, Sec-Fetch-Site: same-origin
  // Some browsers/proxies omit these headers, so we only block clearly suspicious values.
  if (secFetchDest && secFetchDest !== 'video' && secFetchDest !== 'empty') return false;
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') return false;
  if (secFetchMode && secFetchMode !== 'no-cors' && secFetchMode !== 'cors') return false;

  return true;
}

function parseRange(rangeHeader: string | undefined, fileSize: number) {
  if (!rangeHeader) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
  if (!match) return null;

  let start: number;
  let end: number;

  if (match[1] === '' && match[2] === '') return null;

  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? fileSize - 1 : Number(match[2]);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= fileSize) {
    return { invalid: true } as any;
  }

  end = Math.min(end, fileSize - 1);
  return { start, end, invalid: false };
}

function clientIp(req: any) {
  return String(
    req.headers?.['x-forwarded-for'] ||
      req.headers?.['x-real-ip'] ||
      req.socket?.remoteAddress ||
      ''
  )
    .split(',')[0]
    .trim();
}

async function validateActiveSession(req: any, payload: any) {
  const admin = getFirebaseAdmin();
  const uid = String(payload?.uid || '');
  const courseId = String(payload?.courseId || '');
  const lessonId = String(payload?.lessonId || '');
  const sid = String(payload?.sid || '');

  if (!uid || !courseId || !lessonId || !sid) {
    return { ok: false, reason: 'Missing session identity' };
  }

  const now = Math.floor(Date.now() / 1000);
  const activeRef = admin.database().ref(`activePlayerSessions/${uid}/${courseId}/${lessonId}`);
  const activeSnap = await activeRef.get();

  if (!activeSnap.exists()) {
    return { ok: false, reason: 'Session is not active' };
  }

  const active = activeSnap.val() || {};
  if (String(active.sid || '') !== sid) {
    return { ok: false, reason: 'Session was replaced by another active player' };
  }

  if (Number(active.expiresAt || 0) < now) {
    await activeRef.remove().catch(() => undefined);
    return { ok: false, reason: 'Session expired' };
  }

  const userAgent = String(req.headers?.['user-agent'] || '');
  if (payload?.userAgentHash && payload.userAgentHash !== sha256(userAgent)) {
    return { ok: false, reason: 'Session user-agent mismatch' };
  }

  const enrollSnap = await admin.database().ref(`enrollments/${uid}/${courseId}`).get();
  if (!enrollSnap.exists()) {
    return { ok: false, reason: 'Enrollment no longer exists' };
  }

  // Lightweight heartbeat for admin diagnostics without changing the active sid.
  activeRef.update({
    lastSeenAt: now,
    lastIpHash: sha256(clientIp(req)),
  }).catch(() => undefined);

  return { ok: true };
}

async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).send('Method Not Allowed');
    }

    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    if (!isLikelyBrowserVideoRequest(req)) {
      return res.status(403).send('Blocked non-player video request');
    }

    const cookies = parseCookies(req.headers?.cookie);
    const token = cookies['ps'];
    if (!token) return res.status(401).send('Missing session cookie');

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).send('Invalid/Expired session');
    }

    if (normalizeProvider(payload?.videoProvider) !== 'gdrive') {
      return res.status(400).send('Not a Google Drive session');
    }

    const active = await validateActiveSession(req, payload);
    if (!active.ok) {
      return res.status(403).send(active.reason || 'Inactive player session');
    }

    const fileId = String(payload?.videoRef || '').trim();
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

    const meta = metaRes.data || {};
    const fileSize = Number(meta.size || 0);
    const contentType = String(meta.mimeType || 'video/mp4');

    if (!fileSize || !Number.isFinite(fileSize)) {
      return res.status(500).send('Missing Google Drive file size');
    }

    const rangeInfo: any = parseRange(req.headers?.range, fileSize);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    if (rangeInfo?.invalid) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    let start = 0;
    let end = fileSize - 1;
    let statusCode = 200;

    if (rangeInfo) {
      start = rangeInfo.start;
      end = rangeInfo.end;
      statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    }

    const chunkSize = end - start + 1;
    res.statusCode = statusCode;
    res.setHeader('Content-Length', String(chunkSize));

    if (req.method === 'HEAD') {
      return res.end();
    }

    const driveRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      {
        responseType: 'stream',
        headers: { Range: `bytes=${start}-${end}` },
      }
    );

    driveRes.data.on('error', (e: any) => {
      console.error('[drive-stream] upstream stream error:', e);
      try {
        if (!res.headersSent) res.status(500).end('Stream error');
        else res.end();
      } catch (_) {}
    });

    driveRes.data.pipe(res);
  } catch (err) {
    console.error('[drive-stream] ERROR:', err);
    return res.status(500).send('Drive stream failed');
  }
}

module.exports = handler;
