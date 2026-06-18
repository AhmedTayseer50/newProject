// api/telegram-join-session.js
// Single endpoint for Telegram availability check + join redirect session.
// This avoids adding an extra Serverless Function on Vercel Hobby plan.

const jwt = require('jsonwebtoken');
const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function setCookie(res, name, value, maxAge = 120) {
  const cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  res.setHeader('Set-Cookie', cookie);
}

async function readTelegramState(admin, uid, courseId) {
  const enrollmentSnap = await admin
    .database()
    .ref(`enrollments/${uid}/${courseId}`)
    .get();

  if (!enrollmentSnap.exists()) {
    return {
      hasEnrollment: false,
      telegramInviteUrl: '',
      used: false,
    };
  }

  const privateSnap = await admin
    .database()
    .ref(`coursePrivate/${courseId}/telegramInviteUrl`)
    .get();

  const telegramInviteUrl = String(privateSnap.val() || '').trim();

  if (!telegramInviteUrl) {
    return {
      hasEnrollment: true,
      telegramInviteUrl: '',
      used: false,
    };
  }

  const accessSnap = await admin
    .database()
    .ref(`telegramAccess/${uid}/${courseId}`)
    .get();

  const access = accessSnap.exists() ? accessSnap.val() || {} : {};
  const used = !!access.usedAt || access.status === 'used';

  return {
    hasEnrollment: true,
    telegramInviteUrl,
    used,
  };
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
  const action = String(body.action || 'join').trim().toLowerCase();

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

    const state = await readTelegramState(admin, uid, courseId);

    if (!state.hasEnrollment) {
      if (action === 'status') {
        res.status(403).json({ available: false, used: false });
        return;
      }

      res.status(403).send('You do not have access to this course');
      return;
    }

    if (action === 'status') {
      res.status(200).json({
        available: !!state.telegramInviteUrl,
        used: !!state.used,
      });
      return;
    }

    if (!state.telegramInviteUrl) {
      res.status(404).send('Telegram invite link is not configured');
      return;
    }

    await admin.database().ref(`telegramAccess/${uid}/${courseId}`).update({
      status: 'used',
      usedAt: Date.now(),
      lastJoinedAt: Date.now(),
    });

    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        uid,
        courseId,
        telegramInviteUrl: state.telegramInviteUrl,
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
