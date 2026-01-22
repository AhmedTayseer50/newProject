const jwt = require('jsonwebtoken');

function parseCookies(cookieHeader: string | undefined) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(';').forEach((part: string) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });

  return out;
}

async function handler(req: any, res: any) {
  try {
    const secret = process.env['PLAYER_SESSION_SECRET'];
    if (!secret) {
      res.status(500).send('Missing env PLAYER_SESSION_SECRET');
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['ps'];

    if (!token) {
      res.status(401).send('Missing session cookie');
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e: any) {
      res.status(401).send(e?.message || 'Invalid/Expired session');
      return;
    }

    const videoProvider = payload?.videoProvider;
    const videoRef = payload?.videoRef;

    if (videoProvider !== 'youtube' || !videoRef) {
      res.status(400).send('Invalid payload');
      return;
    }

    // ✅ YouTube embed URL
    const youtubeUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoRef)}?rel=0&modestbranding=1`;

    // ✅ Headers حماية (مش DRM، لكن تمنع caching + تقلل التسريب)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; " +
      "style-src 'unsafe-inline'; " +
      "script-src 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com; " +
      "frame-ancestors 'self';"
    );

    // ✅ HTML Player
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
    iframe{width:100%;height:100%;border:0}
  </style>
</head>
<body>
  <div class="wrap">
    <iframe
      src="${youtubeUrl}"
      title="Video Player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>

  <script>
    // حواجز بسيطة (مش حماية حقيقية ضد screen recording)
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && ['s','u','p'].includes((e.key||'').toLowerCase())) e.preventDefault();
      if (e.key === 'PrintScreen') e.preventDefault();
    });
  </script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (err: any) {
    console.error('[player] ERROR:', err);
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
}

module.exports = handler;
