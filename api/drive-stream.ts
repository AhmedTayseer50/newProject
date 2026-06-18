// api/drive-stream.ts
// Vercel Serverless Function (Node)
// Streams Google Drive video with protected Range support + anti-download throttling.

const nodeCrypto = require('crypto');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

const DEFAULT_MAX_RANGE_BYTES = 3 * 1024 * 1024; // 3MB per request
const DEFAULT_MAX_BYTES_PER_MINUTE = 90 * 1024 * 1024; // 90MB/minute
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 90;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 2;
const DEFAULT_LOCK_TTL_SEC = 35;

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
  return nodeCrypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeProvider(value: any) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') return 'gdrive';
  return v;
}

function envNumber(name: string, fallback: number, min = 1) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

function isLikelyBrowserVideoRequest(req: any) {
  const secFetchDest = String(req.headers?.['sec-fetch-dest'] || '').toLowerCase();
  const secFetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();
  const secFetchMode = String(req.headers?.['sec-fetch-mode'] || '').toLowerCase();

  // Chrome/Edge video element usually sends: Sec-Fetch-Dest: video, Sec-Fetch-Site: same-origin.
  // Some browsers/proxies omit these headers, so only clearly suspicious values are blocked.
  if (secFetchDest && secFetchDest !== 'video' && secFetchDest !== 'empty') return false;
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') return false;
  if (secFetchMode && secFetchMode !== 'no-cors' && secFetchMode !== 'cors') return false;

  return true;
}

function parseRange(rangeHeader: string | undefined, fileSize: number, maxRangeBytes: number) {
  if (!rangeHeader) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
  if (!match) return null;

  let start: number;
  let end: number;

  if (match[1] === '' && match[2] === '') return null;

  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    const cappedSuffix = Math.min(suffixLength, maxRangeBytes);
    start = Math.max(fileSize - cappedSuffix, 0);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? Math.min(start + maxRangeBytes - 1, fileSize - 1) : Number(match[2]);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= fileSize) {
    return { invalid: true } as any;
  }

  end = Math.min(end, fileSize - 1);

  // Force every range response to be small chunks. This makes direct download helpers much less useful,
  // while the native player can continue requesting the next chunks normally.
  if (end - start + 1 > maxRangeBytes) {
    end = start + maxRangeBytes - 1;
  }

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

function sessionPath(payload: any) {
  return `activePlayerSessions/${payload.uid}/${payload.courseId}/${payload.lessonId}`;
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
  const activeRef = admin.database().ref(sessionPath(payload));
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

  activeRef.update({
    lastSeenAt: now,
    lastIpHash: sha256(clientIp(req)),
  }).catch(() => undefined);

  return { ok: true };
}

async function acquireStreamSlot(admin: any, sid: string) {
  const now = Math.floor(Date.now() / 1000);
  const maxConcurrent = envNumber('PLAYER_STREAM_MAX_CONCURRENT', DEFAULT_MAX_CONCURRENT_REQUESTS);
  const lockTtlSec = envNumber('PLAYER_STREAM_LOCK_TTL_SEC', DEFAULT_LOCK_TTL_SEC);
  const ref = admin.database().ref(`playerStreamLocks/${sid}`);

  const result = await ref.transaction((current: any) => {
    const active = Number(current?.active || 0);
    const updatedAt = Number(current?.updatedAt || 0);
    const safeActive = now - updatedAt > lockTtlSec ? 0 : active;

    if (safeActive >= maxConcurrent) {
      return; // abort transaction
    }

    return {
      active: safeActive + 1,
      updatedAt: now,
    };
  });

  return result?.committed === true;
}

async function releaseStreamSlot(admin: any, sid: string) {
  const now = Math.floor(Date.now() / 1000);
  const ref = admin.database().ref(`playerStreamLocks/${sid}`);
  await ref.transaction((current: any) => {
    const active = Math.max(Number(current?.active || 0) - 1, 0);
    return { active, updatedAt: now };
  }).catch(() => undefined);
}

async function checkAndRecordUsage(admin: any, payload: any, chunkSize: number, start: number, end: number) {
  const sid = String(payload.sid || '');
  const now = Math.floor(Date.now() / 1000);
  const maxBytesPerMinute = envNumber('PLAYER_STREAM_MAX_BYTES_PER_MINUTE', DEFAULT_MAX_BYTES_PER_MINUTE);
  const maxRequestsPerMinute = envNumber('PLAYER_STREAM_MAX_REQUESTS_PER_MINUTE', DEFAULT_MAX_REQUESTS_PER_MINUTE);
  const ref = admin.database().ref(`playerStreamUsage/${sid}`);

  let blockedReason = '';

  const result = await ref.transaction((current: any) => {
    const base = current || {};
    const windowStart = Number(base.windowStart || now);
    const isNewWindow = now - windowStart >= 60;

    const requestCount = isNewWindow ? 1 : Number(base.requestCount || 0) + 1;
    const bytesServed = isNewWindow ? chunkSize : Number(base.bytesServed || 0) + chunkSize;
    const violations = Number(base.violations || 0);

    if (requestCount > maxRequestsPerMinute) {
      blockedReason = 'Too many video stream requests in one minute';
      return {
        ...base,
        blocked: true,
        blockedReason,
        blockedAt: now,
        violations: violations + 1,
        lastRequestAt: now,
      };
    }

    if (bytesServed > maxBytesPerMinute) {
      blockedReason = 'Video stream is being consumed faster than normal playback';
      return {
        ...base,
        blocked: true,
        blockedReason,
        blockedAt: now,
        violations: violations + 1,
        lastRequestAt: now,
      };
    }

    return {
      windowStart: isNewWindow ? now : windowStart,
      requestCount,
      bytesServed,
      lastRequestAt: now,
      lastRangeStart: start,
      lastRangeEnd: end,
      blocked: false,
      blockedReason: '',
      violations,
    };
  });

  const val = result?.snapshot?.val?.() || {};
  if (blockedReason || val.blocked) {
    const reason = blockedReason || String(val.blockedReason || 'Suspicious video stream usage');
    await admin.database().ref(sessionPath(payload)).remove().catch(() => undefined);
    throw new Error(reason);
  }
}

async function handler(req: any, res: any) {
  const admin = getFirebaseAdmin();
  let acquired = false;
  let sid = '';

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

    sid = String(payload?.sid || '');
    if (!sid) return res.status(401).send('Missing session id');

    if (normalizeProvider(payload?.videoProvider) !== 'gdrive') {
      return res.status(400).send('Not a Google Drive session');
    }

    const active = await validateActiveSession(req, payload);
    if (!active.ok) {
      return res.status(403).send(active.reason || 'Inactive player session');
    }

    acquired = await acquireStreamSlot(admin, sid);
    if (!acquired) {
      await admin.database().ref(sessionPath(payload)).remove().catch(() => undefined);
      return res.status(429).send('Too many parallel video stream requests');
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

    // Native video playback should use Range. Direct download tools often try a non-range full request.
    if (!req.headers?.range) {
      return res.status(416).send('Range request required');
    }

    const maxRangeBytes = envNumber('PLAYER_STREAM_MAX_RANGE_BYTES', DEFAULT_MAX_RANGE_BYTES);
    const rangeInfo: any = parseRange(req.headers?.range, fileSize, maxRangeBytes);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    if (rangeInfo?.invalid || !rangeInfo) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const start = rangeInfo.start;
    const end = rangeInfo.end;
    const chunkSize = end - start + 1;

    await checkAndRecordUsage(admin, payload, chunkSize, start, end);

    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
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

    let released = false;
    const releaseOnce = () => {
      if (released) return;
      released = true;
      releaseStreamSlot(admin, sid).catch(() => undefined);
    };

    res.on('finish', releaseOnce);
    res.on('close', releaseOnce);

    driveRes.data.on('error', (e: any) => {
      console.error('[drive-stream] upstream stream error:', e);
      releaseOnce();
      try {
        if (!res.headersSent) res.status(500).end('Stream error');
        else res.end();
      } catch (_) {}
    });

    driveRes.data.pipe(res);
  } catch (err: any) {
    console.error('[drive-stream] ERROR:', err);
    if (acquired && sid) await releaseStreamSlot(admin, sid).catch(() => undefined);
    return res.status(403).send(err?.message || 'Drive stream blocked');
  }
}

module.exports = handler;
