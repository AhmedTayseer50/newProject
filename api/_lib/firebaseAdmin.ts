// import * as admin from 'firebase-admin';

// let app: admin.app.App | undefined;

// export function getFirebaseAdminApp() {
//   if (app) {
//     console.log('[firebaseAdmin] reuse existing app');
//     return app;
//   }

//   const raw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
//   const databaseURL = process.env['FIREBASE_DATABASE_URL'];

//   console.log('[firebaseAdmin] FIREBASE_DATABASE_URL exists?', !!databaseURL);
//   console.log('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON exists?', !!raw);

//   if (!raw) {
//     console.error('[firebaseAdmin] Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
//     throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
//   }
//   if (!databaseURL) {
//     console.error('[firebaseAdmin] Missing env FIREBASE_DATABASE_URL');
//     throw new Error('Missing env FIREBASE_DATABASE_URL');
//   }

//   // معلومات تساعدنا نعرف هل raw JSON ولا base64
//   console.log('[firebaseAdmin] raw length:', raw.length);
//   console.log('[firebaseAdmin] raw startsWith "{" ?', raw.trim().startsWith('{'));
//   console.log('[firebaseAdmin] raw head:', raw.slice(0, 20));

//   let serviceAccountJson = raw;

//   if (raw.trim().startsWith('{') === false) {
//     console.log('[firebaseAdmin] raw not JSON -> trying base64 decode...');
//     try {
//       serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8');
//       console.log('[firebaseAdmin] base64 decoded OK. decoded length:', serviceAccountJson.length);
//       console.log('[firebaseAdmin] decoded head:', serviceAccountJson.slice(0, 20));
//     } catch (e: any) {
//       console.error('[firebaseAdmin] base64 decode FAILED:', e?.message);
//       // هنكمل بـ raw زي ما هو
//     }
//   }

//   let serviceAccount: any;
//   try {
//     serviceAccount = JSON.parse(serviceAccountJson);
//     console.log('[firebaseAdmin] JSON.parse OK. project_id:', serviceAccount?.project_id);
//     console.log('[firebaseAdmin] JSON.parse OK. client_email exists?', !!serviceAccount?.client_email);
//     console.log('[firebaseAdmin] private_key exists?', !!serviceAccount?.private_key);
//   } catch (e: any) {
//     console.error('[firebaseAdmin] JSON.parse FAILED:', e?.message);
//     console.error('[firebaseAdmin] json head:', serviceAccountJson.slice(0, 120));
//     throw e;
//   }

//   console.log('[firebaseAdmin] initializing admin app...');
//   try {
//     app = admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//       databaseURL,
//     });
//     console.log('[firebaseAdmin] initializeApp OK');
//   } catch (e: any) {
//     console.error('[firebaseAdmin] initializeApp FAILED:', e?.message);
//     console.error('[firebaseAdmin] stack:', e?.stack);
//     throw e;
//   }

//   return app;
// }

// export function getAdmin() {
//   getFirebaseAdminApp();
//   return admin;
// }


// ✅ CommonJS require بدل import
const admin: typeof import('firebase-admin') = require('firebase-admin');

let app: any;

function getFirebaseAdminApp() {
  if (app) {
    console.log('[firebaseAdmin] reuse existing app');
    return app;
  }

  const raw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  const databaseURL = process.env['FIREBASE_DATABASE_URL'];

  console.log('[firebaseAdmin] FIREBASE_DATABASE_URL exists?', !!databaseURL);
  console.log('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON exists?', !!raw);

  if (!raw) throw new Error('Missing env FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!databaseURL) throw new Error('Missing env FIREBASE_DATABASE_URL');

  let serviceAccountJson = raw;

  if (raw.trim().startsWith('{') === false) {
    console.log('[firebaseAdmin] raw not JSON -> trying base64 decode...');
    try {
      serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8');
      console.log('[firebaseAdmin] base64 decoded OK');
    } catch (e: any) {
      console.error('[firebaseAdmin] base64 decode FAILED:', e?.message);
    }
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log('[firebaseAdmin] JSON.parse OK. project_id:', serviceAccount?.project_id);
  } catch (e: any) {
    console.error('[firebaseAdmin] JSON.parse FAILED:', e?.message);
    console.error('[firebaseAdmin] json head:', serviceAccountJson.slice(0, 120));
    throw e;
  }

  console.log('[firebaseAdmin] initializing admin app...');
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  console.log('[firebaseAdmin] initializeApp OK');
  return app;
}

function getAdmin() {
  getFirebaseAdminApp();
  return admin;
}

// ✅ CommonJS exports
module.exports = { getFirebaseAdminApp, getAdmin };
