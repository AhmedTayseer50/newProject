// api/telegram-join-session.js

const jwt = require('jsonwebtoken');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function setCookie(res, name, value, maxAge = 120) {
  const cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  res.setHeader('Set-Cookie', cookie);
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

  if (!courseId) {
    res.status(400).send('Missing courseId');
    return;
  }

  const secret = process.env.TELEGRAM_JOIN_SESSION_SECRET;
  if (!secret) {
    res.status(500).send('Missing env TELEGRAM_JOIN_SESSION_SECRET');
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const enrollmentSnap = await admin
      .database()
      .ref(`enrollments/${uid}/${courseId}`)
      .get();

    if (!enrollmentSnap.exists()) {
      res.status(403).send('You do not have access to this course');
      return;
    }

    const privateSnap = await admin
      .database()
      .ref(`coursePrivate/${courseId}/telegramInviteUrl`)
      .get();

    const telegramInviteUrl = String(privateSnap.val() || '').trim();

    if (!telegramInviteUrl) {
      res.status(404).send('Telegram invite link is not configured');
      return;
    }

    const accessRef = admin.database().ref(`telegramAccess/${uid}/${courseId}`);

    const txResult = await accessRef.transaction((current) => {
      if (!current) return current;
      if (current.enabled !== true) return current;
      if (current.usedAt) return current;

      return {
        ...current,
        status: 'used',
        usedAt: Date.now(),
      };
    });

    if (!txResult.committed) {
      res
        .status(403)
        .send('Telegram access is not available or has already been used');
      return;
    }

    const newValue = txResult.snapshot.val();

    if (!newValue || !newValue.usedAt) {
      res
        .status(403)
        .send('Telegram access is not available or has already been used');
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        uid,
        courseId,
        telegramInviteUrl,
        iat: now,
        exp: now + 120,
      },
      secret
    );

    setCookie(res, 'tg_join', token, 120);

    res.status(200).json({
      redirectUrl: '/api/telegram-join-redirect',
    });
  } catch (err) {
    console.error('[telegram-join-session] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};