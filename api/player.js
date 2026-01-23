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

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') return 'gdrive';
  if (v === 'youtube' || v === 'yt') return 'youtube';
  return v;
}

module.exports = async function handler(req, res) {
  try {
    const secret = process.env.PLAYER_SESSION_SECRET;
    if (!secret) return res.status(500).send('Missing env PLAYER_SESSION_SECRET');

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.ps;
    if (!token) return res.status(401).send('Missing session cookie');

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(401).send('Invalid/Expired session');
    }

    const provider = normalizeProvider(payload?.videoProvider);
    if (provider !== 'gdrive') return res.status(400).send(`Unsupported provider: ${String(payload?.videoProvider)}`);

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
      id="v"
      controls
      playsinline
      webkit-playsinline
      preload="metadata"
      crossorigin="anonymous"
      controlslist="nodownload"
      src="/api/drive-stream"
    ></video>
  </div>

  <script>
    (function () {
      const v = document.getElementById('v');

      function post(type, extra) {
        try {
          window.parent && window.parent.postMessage(Object.assign({ type }, extra || {}), '*');
        } catch (_) {}
      }

      function snap(label) {
        const err = v && v.error ? { code: v.error.code, message: v.error.message } : null;
        post('PLAYER_DEBUG', {
          label,
          currentSrc: v ? v.currentSrc : null,
          networkState: v ? v.networkState : null,
          readyState: v ? v.readyState : null,
          paused: v ? v.paused : null,
          ended: v ? v.ended : null,
          error: err
        });
      }

      snap('init');

      ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','play','playing','pause','waiting','stalled','ended','error','emptied','abort'].forEach(evt => {
        v.addEventListener(evt, function () {
          if (evt === 'playing') post('PLAYER_STATE', { state: 'playing' });
          if (evt === 'pause') post('PLAYER_STATE', { state: 'paused' });
          if (evt === 'ended') post('PLAYER_STATE', { state: 'ended' });
          snap(evt);
        });
      });

      window.addEventListener('message', function (e) {
        const d = e && e.data;
        if (!d || typeof d !== 'object') return;
        if (d.type !== 'PARENT_COMMAND') return;

        if (d.command === 'play') {
          v.play().catch(err => post('PLAYER_DEBUG', { label:'play() rejected', err: String(err) }));
        }
        if (d.command === 'pause') v.pause();
      });
    })();
  </script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (err) {
    console.error('[player] ERROR:', err);
    res.status(500).send('FUNCTION_INVOCATION_FAILED');
  }
};
