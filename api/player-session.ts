const jwt = require('jsonwebtoken');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function setCookie(res: any, name: string, value: string) {
  // Cookie HttpOnly + Secure + SameSite=Lax
  // مهم: Secure لازم عشان HTTPS على Vercel
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`;
  res.setHeader('Set-Cookie', cookie);
}

async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).send('Missing Authorization Bearer token');
    return;
  }

  const idToken = match[1];
  const body = req.body || {};

  const courseId = String(body.courseId || '');
  const lessonId = String(body.lessonId || '');
  const videoProvider = body.videoProvider;
  const videoRef = String(body.videoRef || '');

  if (!courseId || !lessonId || !videoProvider || !videoRef) {
    res.status(400).send('Missing required fields');
    return;
  }

  if (videoProvider !== 'youtube' && videoProvider !== 'gdrive') {
    res.status(400).send('Unsupported video provider');
    return;
  }

  const secret = process.env['PLAYER_SESSION_SECRET'];
  if (!secret) {
    res.status(500).send('Missing env PLAYER_SESSION_SECRET');
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const enrollPath = `enrollments/${uid}/${courseId}`;
    const enrollmentSnap = await admin.database().ref(enrollPath).get();

    if (!enrollmentSnap.exists()) {
      res.status(403).send('Not enrolled in this course');
      return;
    }

    const expiresInSec = Number(process.env['PLAYER_SESSION_TTL_SEC'] ?? 300);
    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        uid,
        courseId,
        lessonId,
        videoProvider,
        videoRef,
        iat: now,
        exp: now + expiresInSec,
      },
      secret,
    );

    // ✅ حط التوكن في Cookie بدل querystring
    setCookie(res, 'ps', token);

    // ✅ رجّع URL ثابت من غير token
    res.status(200).json({
      playerUrl: `/api/player`,
      expiresAt: new Date((now + expiresInSec) * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error('[player-session] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
}

module.exports = handler;
