// api/player-session.js

const jwt = require('jsonwebtoken');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function setCookie(res, name, value) {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`;
  res.setHeader('Set-Cookie', cookie);
}

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();

  // Accept multiple aliases and normalize to "gdrive"
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') {
    return 'gdrive';
  }

  // Keep youtube if you ever use it
  if (v === 'youtube' || v === 'yt') {
    return 'youtube';
  }

  return v; // fallback
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

  const courseId = String(body.courseId || '');
  const lessonId = String(body.lessonId || '');
  const videoProvider = normalizeProvider(body.videoProvider);
  const videoRef = String(body.videoRef || '');

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

    const enrollPath = `enrollments/${uid}/${courseId}`;
    const snap = await admin.database().ref(enrollPath).get();

    if (!snap.exists()) {
      res.status(403).send('Not enrolled in this course');
      return;
    }

    const expiresInSec = Number(process.env.PLAYER_SESSION_TTL_SEC || 300);
    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        uid,
        courseId,
        lessonId,
        videoProvider, // ✅ now normalized
        videoRef,
        iat: now,
        exp: now + expiresInSec,
      },
      secret
    );

    setCookie(res, 'ps', token);

    res.status(200).json({
      playerUrl: '/api/player',
      expiresAt: new Date((now + expiresInSec) * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[player-session] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};
