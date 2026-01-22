# DrEnam

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

---

## Video protection (YouTube + short-lived session)

The lesson page requests a **short-lived internal player URL** for each lesson video.

Flow:
1. Lesson data contains `videoProvider: "youtube"` and `videoRef: "<videoId>"`.
2. Angular calls `POST /api/player-session` with the user's Firebase ID token.
3. The backend verifies enrollment and returns `playerUrl` like `/api/player?token=...`.
4. The lesson page embeds the returned URL in an `<iframe>`.

### Required Vercel environment variables

- `PLAYER_SESSION_SECRET`: strong random secret used to sign the short-lived session token.
- `PLAYER_SESSION_TTL_SEC` (optional): default `300` (5 minutes).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: service account JSON as **plain JSON** or **base64**.
- `FIREBASE_DATABASE_URL`: Firebase RTDB URL.

### Presence check (anti-recording friction)

While the video is **playing**, the lesson page shows an occasional overlay asking the user to confirm they are still watching.
If the user does not confirm within 30 seconds, playback is paused until they confirm.
