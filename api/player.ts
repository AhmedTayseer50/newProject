import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

type SessionClaims = {
  uid: string;
  courseId: string;
  lessonId: string;
  videoProvider: 'youtube';
  videoRef: string; // YouTube videoId
  exp: number;
};

function htmlEscape(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.PLAYER_SESSION_SECRET;
  if (!secret) {
    res.status(500).send('Missing env PLAYER_SESSION_SECRET');
    return;
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(401).send('Missing token');
    return;
  }

  let claims: SessionClaims;
  try {
    claims = jwt.verify(token, secret) as SessionClaims;
  } catch (err: any) {
    res.status(401).send(err?.message || 'Invalid token');
    return;
  }

  if (claims.videoProvider !== 'youtube') {
    res.status(400).send('Unsupported provider');
    return;
  }

  const videoId = String(claims.videoRef || '');
  if (!videoId) {
    res.status(400).send('Missing videoRef');
    return;
  }

  // Security-ish headers: keep it simple for now
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // NOTE: For YouTube embeds, CSP needs to allow https://www.youtube.com and https://www.youtube-nocookie.com

  const safeVideoId = htmlEscape(videoId);

  res.status(200).send(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Player</title>
    <style>
      html, body { height: 100%; margin: 0; background: #000; }
      #player { width: 100%; height: 100%; }
      /* منع كليك يمين (ردع بسيط) */
      body { -webkit-user-select: none; user-select: none; }
    </style>
  </head>
  <body oncontextmenu="return false;">
    <div id="player"></div>
    <script>
      // YouTube IFrame API
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      var player;
      function postState(state) {
        try {
          parent.postMessage({ type: 'PLAYER_STATE', state: state }, '*');
        } catch (e) {}
      }

      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          videoId: '${safeVideoId}',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            controls: 1
          },
          events: {
            'onReady': function() { postState('ready'); },
            'onStateChange': function(event) {
              // 1 PLAYING, 2 PAUSED, 0 ENDED
              if (event.data === 1) postState('playing');
              else if (event.data === 2) postState('paused');
              else if (event.data === 0) postState('ended');
            }
          }
        });
      }

      // Commands from parent (pause/play)
      window.addEventListener('message', function(ev) {
        if (!ev || !ev.data || typeof ev.data !== 'object') return;
        if (ev.data.type !== 'PARENT_COMMAND') return;
        if (!player) return;
        if (ev.data.command === 'pause') player.pauseVideo();
        if (ev.data.command === 'play') player.playVideo();
      });
    </script>
  </body>
</html>`);
}
