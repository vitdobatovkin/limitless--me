# GROK ME

An unofficial fan experience for discovering your alter ego from the Grok and xAI universe.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm start
```

Set `NEXT_PUBLIC_SITE_URL` to the public deployment origin so shared result pages and Open Graph images use the correct URL.

## Content

Profiles and result copy live in `app/participants.ts`. Avatars are stored locally in `public/avatars` so the carousel and share cards do not depend on a third-party avatar service at runtime.

GROK ME is an unofficial fan project and is not affiliated with xAI, X, or SpaceXAI.
