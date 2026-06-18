// api/telegram-join-status.js

const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

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

  const courseId = String(req.body?.courseId || '').trim();
  if (!courseId) {
    res.status(400).send('Missing courseId');
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const uid = decoded.uid;

    const enrollmentSnap = await admin
      .database()
      .ref(`enrollments/${uid}/${courseId}`)
      .get();

    if (!enrollmentSnap.exists()) {
      res.status(403).json({ available: false, used: false });
      return;
    }

    const privateSnap = await admin
      .database()
      .ref(`coursePrivate/${courseId}/telegramInviteUrl`)
      .get();

    const telegramInviteUrl = String(privateSnap.val() || '').trim();
    if (!telegramInviteUrl) {
      res.status(200).json({ available: false, used: false });
      return;
    }

    const accessSnap = await admin
      .database()
      .ref(`telegramAccess/${uid}/${courseId}`)
      .get();

    const access = accessSnap.exists() ? accessSnap.val() || {} : {};
    const used = !!access.usedAt || access.status === 'used';

    res.status(200).json({ available: true, used });
  } catch (err) {
    console.error('[telegram-join-status] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
};
