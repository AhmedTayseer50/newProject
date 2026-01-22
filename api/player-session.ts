import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdmin } from './_lib/firebaseAdmin';

// CommonJS require (عشان Vercel runtime عندك مش ESM)
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');

type Body = {
  courseId: string;
  lessonId: string;
  videoProvider: 'youtube';
  videoRef: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ===== Debug Logs (Request) =====
  console.log('[player-session] method:', req.method);
  console.log('[player-session] url:', req.url);
  console.log('[player-session] hasAuthHeader:', !!req.headers.authorization);
  console.log('[player-session] content-type:', req.headers['content-type']);
  console.log('[player-session] bodyType:', typeof req.body);
  console.log('[player-session] body:', req.body);

  if (req.method !== 'POST') {
    console.log('[player-session] 405 Method Not Allowed');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    console.log('[player-session] 401 Missing Authorization Bearer token');
    res.status(401).send('Missing Authorization Bearer token');
    return;
  }

  const idToken = match[1];
  console.log('[player-session] bearer token length:', idToken?.length);

  const body = (req.body || {}) as Partial<Body>;
  const courseId = String(body.courseId || '');
  const lessonId = String(body.lessonId || '');
  const videoProvider = body.videoProvider;
  const videoRef = String(body.videoRef || '');

  // ===== Debug Logs (Parsed Body) =====
  console.log('[player-session] parsed courseId:', courseId);
  console.log('[player-session] parsed lessonId:', lessonId);
  console.log('[player-session] parsed videoProvider:', videoProvider);
  console.log('[player-session] parsed videoRef length:', videoRef?.length);

  if (!courseId || !lessonId || !videoProvider || !videoRef) {
    console.log('[player-session] 400 Missing required fields');
    res.status(400).send('Missing required fields');
    return;
  }
  if (videoProvider !== 'youtube') {
    console.log('[player-session] 400 Unsupported video provider:', videoProvider);
    res.status(400).send('Unsupported video provider');
    return;
  }

  const secret = process.env['PLAYER_SESSION_SECRET'];
  console.log('[player-session] env PLAYER_SESSION_SECRET exists?', !!secret);

  if (!secret) {
    console.log('[player-session] 500 Missing env PLAYER_SESSION_SECRET');
    res.status(500).send('Missing env PLAYER_SESSION_SECRET');
    return;
  }

  const ttlRaw = process.env['PLAYER_SESSION_TTL_SEC'];
  const expiresInSec = Number(ttlRaw ?? 300);

  console.log('[player-session] env PLAYER_SESSION_TTL_SEC raw:', ttlRaw);
  console.log('[player-session] expiresInSec:', expiresInSec);

  try {
    console.log('[player-session] init firebase admin...');
    const admin = getAdmin();
    console.log('[player-session] firebase admin initialized OK');

    console.log('[player-session] verifying idToken...');
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    console.log('[player-session] idToken verified OK. uid:', uid);

    const enrollPath = `enrollments/${uid}/${courseId}`;
    console.log('[player-session] checking enrollment path:', enrollPath);

    const enrollmentSnap = await admin.database().ref(enrollPath).get();
    const isEnrolled = enrollmentSnap.exists();

    console.log('[player-session] enrollment exists?', isEnrolled);
    if (isEnrolled) {
      console.log('[player-session] enrollment value:', enrollmentSnap.val());
    }

    if (!isEnrolled) {
      console.log('[player-session] 403 Not enrolled in this course');
      res.status(403).send('Not enrolled in this course');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    console.log('[player-session] issuing session token at:', now);

    const token = jwt.sign(
      {
        uid,
        courseId,
        lessonId,
        videoProvider,
        videoRef,
        iat: now,
        exp: now + expiresInSec,
      },
      secret
    );

    console.log('[player-session] jwt signed OK. token length:', token?.length);

    const playerUrl = `/api/player?token=${encodeURIComponent(token)}`;
    console.log('[player-session] success -> playerUrl:', playerUrl);

    res.status(200).json({
      playerUrl,
      expiresAt: new Date((now + expiresInSec) * 1000).toISOString(),
    });
  } catch (err: any) {
    // ===== Important Debug Logs (Error) =====
    console.error('[player-session] ERROR:', err);
    console.error('[player-session] ERROR message:', err?.message);
    console.error('[player-session] ERROR stack:', err?.stack);

    // هنا خليتها 500 بدل 401 عشان لو المشكلة Server-side تبان صح
    res.status(500).send(err?.message || 'FUNCTION_INVOCATION_FAILED');
  }
}
