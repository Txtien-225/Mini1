# VKU Field Survey

Offline-first PWA for VKU classroom and campus facility inspections. It is designed for basements and remote buildings where the inspector may have no Wi-Fi or mobile signal.

## Features

- Installable PWA with `display: standalone`, responsive icons, and theme color `#0284c7`.
- Cache-first Service Worker for the app shell and offline boot.
- Three-step inspection form: location, category/rating/notes, and camera evidence.
- IndexedDB drafts: every field is persisted as it changes, so refreshes do not lose work.
- UUID-tagged `PENDING_SYNC` records with timestamps, sequential queue dispatch, `online` handling, and Background Sync registration.
- Capacitor Camera for native photo capture and Capacitor Network for native connectivity monitoring.

## Local setup

```bash
npm install
npm run dev
```

Open the printed HTTPS/localhost URL. To test offline behavior, submit a survey, switch DevTools Network to Offline, refresh, and confirm the app still boots and the record remains in Recent surveys.

## Production build and deploy

```bash
npm run build
npm run preview
```

Deploy the `dist` folder to Cloudflare Pages or Vercel. Use HTTPS in production because service workers and installability require a secure context. For Vercel, the default Vite configuration is enough; for Cloudflare Pages use build command `npm run build` and output directory `dist`.

The demo currently simulates successful queue dispatch locally so it remains a complete offline demonstration. To connect a real backend, replace `dispatchSurvey()` in `src/sync.ts` with a `fetch()` POST to the survey API and keep the sequential loop.

## Android APK with Capacitor

Install Android Studio and an Android SDK first, then run:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, run on a device or choose **Build > Generate App Bundles or APKs > Generate APKs**. The app id is `com.vku.fieldsurvey`. Camera permission is requested by `@capacitor/camera`; network status is monitored by `@capacitor/network`.

After web changes, use `npm run cap:sync` before rebuilding the APK.

## Submission checklist

- [ ] HTTPS live demo URL
- [ ] Public GitHub repository URL
- [ ] `npm run build` succeeds
- [ ] Offline refresh and draft persistence verified
- [ ] Android APK installed and camera tested on a real device
