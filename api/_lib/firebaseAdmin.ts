import admin from 'firebase-admin';

let app: admin.app.App | undefined;

export function getFirebaseAdminApp(): admin.app.App {
  if (app) return app;

  const raw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  const databaseURL = process.env['FIREBASE_DATABASE_URL'];

  if (!raw) throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!databaseURL) throw new Error('Missing env FIREBASE_DATABASE_URL');

  let serviceAccountJson = raw;

  // يسمح إنك تبعت JSON مباشر أو Base64
  if (!raw.trim().startsWith('{')) {
    try {
      serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      // لو فشل، هنكمل بالـ raw زي ما هو
    }
  }

  const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  return app;
}

export function getFirebaseAdmin(): typeof admin {
  getFirebaseAdminApp();
  return admin;
}
