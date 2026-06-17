// api/player-session.js

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function setCookie(res, name, value, maxAgeSec) {
  const safeMaxAge = Math.max(60, Number(maxAgeSec || 1200));
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${safeMaxAge}`;
  res.setHeader('Set-Cookie', cookie);
}

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();

  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') {
    return 'gdrive';
  }

  if (v === 'youtube' || v === 'yt') {
    return 'youtube';
  }

  return v;
}

function makeSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function clientIp(req) {
  return String(
    req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      ''
  )
    .split(',')[0]
    .trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function safeEmail(decoded) {
  return String(decoded?.email || '').trim().toLowerCase();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).send('Missing Authorization Bearer token');
    return;
  }

  const idToken = match[1];
  const body = req.body || {};

  const courseId = String(body.courseId || '').trim();
  const lessonId = String(body.lessonId || '').trim();
  const videoProvider = normalizeProvider(body.videoProvider);
  const videoRef = String(body.videoRef || '').trim();

  if (!courseId || !lessonId || !videoProvider || !videoRef) {
    res.status(400).send('Missing required fields');
    return;
  }

  const secret = process.env.PLAYER_SESSION_SECRET;
  if (!secret) {
    res.status(500).send('Missing env PLAYER_SESSION_SECRET');
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = safeEmail(decoded);

    const enrollPath = `enrollments/${uid}/${courseId}`;
    const snap = await admin.database().ref(enrollPath).get();

    if (!snap.exists()) {
      res.status(403).send('Not enrolled in this course');
      return;
    }

    const expiresInSec = Number(process.env.PLAYER_SESSION_TTL_SEC || 1200);
    const now = Math.floor(Date.now() / 1000);
    const sid = makeSessionId();
    const userAgent = String(req.headers['user-agent'] || '');
    const ip = clientIp(req);

    await admin.database().ref(`activePlayerSessions/${uid}/${courseId}/${lessonId}`).set({
      sid,
      uid,
      email,
      courseId,
      lessonId,
      videoProvider,
      videoRef,
      userAgentHash: sha256(userAgent),
      ipHash: sha256(ip),
      createdAt: now,
      expiresAt: now + expiresInSec,
    });

    const token = jwt.sign(
      {
        sid,
        uid,
        email,
        courseId,
        lessonId,
        videoProvider,
        videoRef,
        userAgentHash: sha256(userAgent),
        iat: now,
        exp: now + expiresInSec,
      },
      secret
    );

    setCookie(res, 'ps', token, expiresInSec);

    res.status(200).json({
      playerUrl: '/api/player',
      expiresAt: new Date((now + expiresInSec) * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[player-session] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};
