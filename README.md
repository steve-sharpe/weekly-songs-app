# Weekly Music Vault

Next.js app that:

- Reads audio files from a Google Drive folder
- Stores track metadata in Postgres
- Generates a weekly 4-track playlist
- Avoids repeating tracks until every track has been used in the cycle
- Streams selected tracks through your app

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Neon/Postgres (`DATABASE_URL`)
- Google Drive API (`googleapis`)
- Vercel Cron (`vercel.json`)

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `DATABASE_URL`: Neon/Postgres connection string
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: service account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: private key (keep `\n` escaped)
- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`: optional local path to service-account JSON file
- `GOOGLE_DRIVE_FOLDER_ID`: Drive folder with audio files
- `ADMIN_SECRET`: secret for manual admin endpoints
- `CRON_SECRET`: secret for cron endpoint authorization

## Google Drive Setup

1. Create a Google Cloud project and enable Drive API.
2. Create a service account and generate a JSON key.
3. Share the target Google Drive folder with the service account email.
4. Put credentials into env vars.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## API Endpoints

- `GET /api/playlist/current` → current (or latest) playlist
- `GET /api/stream/:trackId` → proxied audio stream from Google Drive
- `POST /api/admin/sync` → sync Drive tracks into DB
- `POST /api/admin/bootstrap` → sync tracks and generate current week playlist in one call
- `GET/PATCH /api/admin/settings` → read/update ticker scroll text
- `POST /api/admin/weekly` → generate weekly playlist manually
- `PATCH /api/admin/tracks/:trackId` → manually update track metadata fields
- `GET /api/cron/weekly` → weekly cron endpoint (syncs Drive tracks, then generates playlist)

For admin routes, include one of:

- `x-admin-secret: <ADMIN_SECRET>`
- `Authorization: Bearer <ADMIN_SECRET>`

For cron, Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.

## Weekly No-Repeat Logic

- Tracks are selected from all active tracks not used in the current cycle.
- If fewer than 4 eligible tracks remain, cycle increments and all tracks become eligible again.
- This guarantees each track is played once per cycle before repeats.

## Vercel Deploy

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add env vars in Vercel project settings.
4. Deploy.

`vercel.json` schedules cron every Monday at `00:05 UTC`.
