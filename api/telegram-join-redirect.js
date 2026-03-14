// api/telegram-join-redirect.js

const jwt = require('jsonwebtoken');

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

function clearCookie(res, name) {
  res.setHeader(
    'Set-Cookie',
    `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

module.exports = async function handler(req, res) {
  try {
    const secret = process.env.TELEGRAM_JOIN_SESSION_SECRET;

    if (!secret) {
      res.status(500).send('Missing env TELEGRAM_JOIN_SESSION_SECRET');
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.tg_join;

    if (!token) {
      res.status(401).send('Missing Telegram join session');
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      clearCookie(res, 'tg_join');
      res.status(401).send('Invalid or expired Telegram join session');
      return;
    }

    const target = String(payload?.telegramInviteUrl || '').trim();

    if (!target) {
      clearCookie(res, 'tg_join');
      res.status(400).send('Missing target URL');
      return;
    }

    clearCookie(res, 'tg_join');
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target);
  } catch (err) {
    console.error('[telegram-join-redirect] ERROR:', err);
    res.status(500).send('FUNCTION_INVOCATION_FAILED');
  }
};