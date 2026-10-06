# App Distributor

Self-hosted internal distribution for Android builds. Upload an APK, share it with your team or testers, and keep every build traceable back to the GitHub issues it ships.

https://github.com/user-attachments/assets/80c754e0-60c0-4bf5-9341-eacf93595738

## Features

- **Apps & builds**: upload APKs per app; version, package and metadata are read straight from the file.
- **Environments**: tag each build (e.g. dev / staging / production).
- **Share links**: public download page per build with OpenGraph preview, no login required.
- **Replace APK**: swap a build's file while keeping its link, with update history.
- **GitHub integration**: link issues to a build and post a comment on them automatically (per-user token, stored encrypted).
- **Pluggable storage**: S3-compatible buckets or Google Drive (OAuth).
- **Roles**: publishers upload and manage, viewers download.
- **Mobile API**: `/api/mobile/*` endpoints for a companion app.

## Tech stack

Next.js 16 (App Router) · React 19 · Prisma + PostgreSQL · AWS SDK v3 · Google Drive API

## Getting started

```bash
npm install
# create .env with the variables below
npm run db:migrate
npm run db:seed        # optional: demo data
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Secret used to sign session tokens |
| `ENCRYPTION_KEY` | yes | 64 hex chars, encrypts stored credentials. `openssl rand -hex 32` |
| `BASE_URL` | prod | Public URL of the deployment (default `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Drive only | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Drive only | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Drive only | `<BASE_URL>/api/storage/gdrive/oauth/callback` |

S3 credentials are entered per storage in the app (Storage page), not via env.

### Demo data

`npm run db:seed` creates demo users (`viewer@northline.io` etc.) with password `buildappdemo`. **Never run the seed against production.**

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
