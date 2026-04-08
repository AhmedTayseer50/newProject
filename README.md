# DrEnam

Angular 16 application with Vercel serverless endpoints for:

- Firebase authentication and data access
- Paymob checkout and payment confirmation
- Google Drive protected lesson streaming
- Telegram one-time join flow
- Arabic and English localized builds

## Local development

- Start the frontend: `npm start`
- Production build for both locales: `npm run build:vercel`
- Run unit tests: `npm test`

## Deployment target

The project is configured for Vercel:

- Build command: `npm run build:vercel`
- Output directory: `dist/dr-enam`
- Localized entry points: `/ar/` and `/en/`

## Environment variables

### Firebase

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase service account JSON, either plain JSON or base64 encoded.
- `FIREBASE_DATABASE_URL`: Firebase Realtime Database URL.

### Lesson player

- `PLAYER_SESSION_SECRET`: secret used to sign the short-lived player session cookie.
- `PLAYER_SESSION_TTL_SEC`: optional session lifetime in seconds. Default is `300`.
- `GOOGLE_DRIVE_SA_EMAIL`: service account email with access to lesson files.
- `GOOGLE_DRIVE_SA_PRIVATE_KEY`: service account private key for Google Drive access.

### Paymob

- `PAYMOB_API_KEY`: Paymob API key.
- `PAYMOB_INTEGRATION_ID`: Paymob integration ID.
- `PAYMOB_IFRAME_ID`: Paymob iframe ID.
- `PAYMOB_HMAC_SECRET`: recommended. Used to validate the Paymob processed callback.
- `PAYMOB_CALLBACK_TOKEN`: recommended fallback or extra protection. Add it as a fixed query parameter in the callback URL configured inside Paymob.
- `PAYMOB_REQUIRE_PROTECTED_CALLBACK`: optional. Defaults to enforced in production. Keeps callback protection mandatory outside production too when set to `true`.
- `PAYMOB_MOCK_MODE`: optional. Must be `true` to enable the local mock checkout flow. Mock mode is blocked automatically in production.

### Telegram

- `TELEGRAM_JOIN_SESSION_SECRET`: secret used to sign the short-lived Telegram join cookie.

## Paymob callback configuration

The processed callback endpoint is:

- `/api/paymob-callback`

Recommended secure configuration:

1. Configure `PAYMOB_HMAC_SECRET` in Vercel.
2. Configure `PAYMOB_CALLBACK_TOKEN` in Vercel.
3. In Paymob dashboard, set the processed callback URL to:
   `/api/paymob-callback?token=YOUR_CALLBACK_TOKEN`

The backend now rejects unprotected production callbacks.

## Payment flow

1. Angular calls `POST /api/paymob-create-session` with the signed-in Firebase user token.
2. The backend validates the selected items and stores a pending order in Firebase.
3. If mock mode is explicitly enabled in non-production, the order uses `/api/paymob-mock-complete`.
4. Otherwise the backend creates the Paymob order and returns the real iframe URL.
5. Paymob calls `/api/paymob-callback` after payment completion.
6. The backend updates order status and grants course plus Telegram access only after callback validation succeeds.

## Protected lesson video flow

1. Lesson data uses `videoProvider: "gdrive"` and `videoRef: "<googleDriveFileId>"`.
2. Angular calls `POST /api/player-session` with the Firebase ID token.
3. The backend verifies enrollment and writes a short-lived signed cookie.
4. The frontend loads `/api/player` inside an iframe.
5. `/api/player` streams the video through `/api/drive-stream` using the signed cookie.

## Release checklist

- Set all required Vercel environment variables.
- Keep `PAYMOB_MOCK_MODE` unset in production unless you explicitly need a sandbox environment.
- Confirm the Paymob processed callback includes either a valid `hmac` or the configured callback token.
- Verify Google Drive service account access to protected lesson files.
- Run `npm run build:vercel`.
- Run `npm test`.
