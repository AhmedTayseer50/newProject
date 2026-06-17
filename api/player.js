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
// const jwt = require('jsonwebtoken');

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'gdrive' || v === 'drive' || v === 'google_drive' || v === 'google-drive' || v === 'google drive') return 'gdrive';
  if (v === 'youtube' || v === 'yt') return 'youtube';
  return v;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

    const watermarkText = escapeHtml(payload?.email || payload?.uid || 'Nabdet Hayaah');
    const sessionText = escapeHtml(String(payload?.sid || '').slice(0, 10));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const html = `<!doctype html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Player</title>
  <style>
    html,body{height:100%;margin:0;background:#000;overflow:hidden}
    .wrap{height:100%;display:flex;align-items:center;justify-content:center;position:relative;background:#000}
    video{width:100%;height:100%;background:#000;display:block}
    .wm{position:absolute;z-index:5;left:4%;top:7%;padding:7px 11px;border-radius:999px;background:rgba(0,0,0,.38);color:rgba(255,255,255,.78);font:700 13px/1.35 Arial,sans-serif;letter-spacing:.2px;pointer-events:none;user-select:none;mix-blend-mode:screen;text-shadow:0 1px 4px rgba(0,0,0,.65);animation:wmMove 42s linear infinite}
    .wm small{display:block;font-weight:600;font-size:10px;opacity:.72;margin-top:1px}
    @keyframes wmMove{0%{left:4%;top:7%}24%{left:67%;top:12%}48%{left:58%;top:76%}72%{left:8%;top:70%}100%{left:4%;top:7%}}
  </style>
</head>
<body oncontextmenu="return false">
  <div class="wrap">
    <video
      id="v"
      controls
      playsinline
      webkit-playsinline
      preload="metadata"
      crossorigin="anonymous"
      controlslist="nodownload noplaybackrate noremoteplayback"
      disablepictureinpicture
      disableremoteplayback
      src="/api/drive-stream"
    ></video>
    <div class="wm">${watermarkText}<small>Session: ${sessionText}</small></div>
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

      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && ['s','p','u'].includes(String(e.key).toLowerCase())) {
          e.preventDefault();
        }
      });

      snap('init');

      ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','play','playing','pause','waiting','stalled','ended','error','emptied','abort','seeking','seeked'].forEach(evt => {
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
