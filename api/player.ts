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

async function handler(req, res) {
  try {
    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['ps'];
    if (!token) return res.status(401).send('Missing session cookie');

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).send('Invalid/Expired session');
    }

    const provider = payload?.videoProvider;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (provider !== 'gdrive') {
      // لو لسه عندك دروس يوتيوب قديمة، ممكن تسيب رسالة أو تتعامل معاها لاحقًا
      return res.status(400).send('This player is configured for Google Drive only');
    }

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

    return res.status(200).send(html);
  } catch (err) {
    console.error('[player] ERROR:', err);
    return res.status(500).send('FUNCTION_INVOCATION_FAILED');
  }
}

module.exports = handler;
