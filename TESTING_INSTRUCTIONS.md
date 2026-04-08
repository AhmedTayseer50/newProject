# Testing Instructions

## 1. Frontend smoke test

Run the local frontend:

```bash
npm start
```

Open `http://localhost:4200`, then verify:

- Arabic pages load from right to left.
- English pages load under `/en/`.
- Cart, checkout, payment result, course details, and lesson pages render without console errors.

## 2. Production build

Build both locales exactly as Vercel does:

```bash
npm run build:vercel
```

This should generate:

- `dist/dr-enam/ar`
- `dist/dr-enam/en`

## 3. Unit tests

Run the Angular unit tests:

```bash
npm test -- --watch=false
```

## 4. Serverless integration checklist

Before testing payment and protected content flows, configure the required environment variables described in `README.md`.

Then verify:

- `POST /api/paymob-create-session` returns a real Paymob iframe URL when mock mode is disabled.
- `POST /api/paymob-callback` rejects requests without callback protection in production.
- `POST /api/player-session` creates a short-lived cookie for enrolled users only.
- `/api/player` and `/api/drive-stream` reject missing or expired player cookies.
- `POST /api/telegram-join-session` only works for enrolled users with unused Telegram access.
