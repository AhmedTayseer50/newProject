import admin from 'firebase-admin';

let app: admin.app.App | undefined;

/**
 * Initializes Firebase Admin SDK for Vercel Serverless Functions.
 *
 * Required env vars:
 * - FIREBASE_SERVICE_ACCOUNT_JSON: JSON string of a service account
 *   (or base64 if you prefer... see decode below)
 * - FIREBASE_DATABASE_URL: RTDB URL
 */
export function getFirebaseAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!raw) {
    throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  if (!databaseURL) {
    throw new Error('Missing env FIREBASE_DATABASE_URL');
  }

  // Allow either plain JSON or base64-encoded JSON
  let serviceAccountJson = raw;
  if (raw.trim().startsWith('{') === false) {
    try {
      serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      // ignore
    }
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  return app;
}

export function getAdmin() {
  getFirebaseAdminApp();
  return admin;
}
