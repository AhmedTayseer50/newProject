const jwt = require('jsonwebtoken');

async function handler(req: any, res: any) {
  try {
    // ✅ لازم يبقى token من query
    const tokenRaw = req.query ? req.query['token'] : undefined;
    const token = typeof tokenRaw === 'string' ? tokenRaw : '';

    if (!token) {
      res.status(400).send('Missing token');
      return;
    }

    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) {
      res.status(500).send('Missing env PLAYER_SESSION_SECRET');
      return;
    }

    // ✅ verify token
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e: any) {
      res.status(401).send(e?.message || 'Invalid token');
      return;
    }

    // ✅ رد بسيط: رجّع البيانات اللي محتاجها الفرونت
    // (لو عندك منطق تاني زي توليد player HTML أو proxy لليوتيوب، قولّي وأنا أعدّله)
    res.status(200).json({
      ok: true,
      uid: payload?.uid,
      courseId: payload?.courseId,
      lessonId: payload?.lessonId,
      videoProvider: payload?.videoProvider,
      videoRef: payload?.videoRef,
      exp: payload?.exp,
    });
  } catch (err: any) {
    console.error('[player] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
}

module.exports = handler;
