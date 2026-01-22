const admin = require('firebase-admin');

let app: any;

function getFirebaseAdminApp() {
  if (app) return app;

  const raw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  const databaseURL = process.env['FIREBASE_DATABASE_URL'];

  if (!raw) throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!databaseURL) throw new Error('Missing env FIREBASE_DATABASE_URL');

  let serviceAccountJson = raw;

  if (!raw.trim().startsWith('{')) {
    try {
      serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8');
    } catch {}
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  return app;
}

function getFirebaseAdmin() {
  getFirebaseAdminApp();
  return admin;
}

module.exports = {
  getFirebaseAdminApp,
  getFirebaseAdmin,
};
