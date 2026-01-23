// api/player.js

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

module.exports = async function handler(req, res) {
  try {
    const secret = process.env.PLAYER_SESSION_SECRET;
    if (!secret) {
      res.status(500).send('Missing env PLAYER_SESSION_SECRET');
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.ps;
    if (!token) {
      res.status(401).send('Missing session cookie');
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      res.status(401).send('Invalid/Expired session');
      return;
    }

    if (!payload || payload.videoProvider !== 'gdrive') {
      res.status(400).send('This player is configured for Google Drive only');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    const html = `<!doctype html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Player</title>
  <style>
    html,body{height:100%;margin:0;background:#000}
    .wrap{height:100%;display:flex;align-items:center;justify-content:center}
    video{width:100%;height:100%;background:#000}
  </style>
</head>
<body>
  <div class="wrap">
    <video
      controls
      playsinline
      webkit-playsinline
      controlslist="nodownload"
      oncontextmenu="return false"
      src="/api/drive-stream"
    ></video>
  </div>
</body>
</html>`;

    res.status(200).send(html);
  } catch (err) {
    console.error('[player] ERROR:', err);
    res.status(500).send('FUNCTION_INVOCATION_FAILED');
  }
};
