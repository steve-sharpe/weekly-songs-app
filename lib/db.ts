import { neon } from "@neondatabase/serverless";

let schemaInitPromise: Promise<void> | null = null;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  return neon(databaseUrl);
}

export async function ensureSchema() {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const sql = getSql();

      await sql`
        CREATE TABLE IF NOT EXISTS tracks (
          id SERIAL PRIMARY KEY,
          drive_file_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          track_title TEXT,
          artist_name TEXT,
          photo_url TEXT,
          album_name TEXT,
          release_year INTEGER,
          genre TEXT,
          duration_seconds INTEGER,
          mime_type TEXT NOT NULL,
          web_view_link TEXT,
          created_time TIMESTAMPTZ,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS track_title TEXT;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS artist_name TEXT;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS photo_url TEXT;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS album_name TEXT;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS release_year INTEGER;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS genre TEXT;
      `;

      await sql`
        ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          int_value INTEGER NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value_text TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS track_cycle_history (
          track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
          last_cycle_number INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS weekly_playlists (
          id SERIAL PRIMARY KEY,
          week_start DATE UNIQUE NOT NULL,
          cycle_number INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS weekly_playlist_tracks (
          id SERIAL PRIMARY KEY,
          playlist_id INTEGER NOT NULL REFERENCES weekly_playlists(id) ON DELETE CASCADE,
          track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
          UNIQUE (playlist_id, position),
          UNIQUE (playlist_id, track_id)
        );
      `;

      await sql`
        INSERT INTO app_state (key, int_value)
        VALUES ('playlist_cycle', 1)
        ON CONFLICT (key) DO NOTHING;
      `;

      await sql`
        INSERT INTO app_settings (key, value_text)
        VALUES (
          'ticker_text',
          'NEW WEEKLY PLAYLIST • 4 RANDOM TRACKS • NO REPEATS UNTIL EVERY SONG PLAYS • POWERED BY GOOGLE DRIVE •'
        )
        ON CONFLICT (key) DO NOTHING;
      `;
    })();
  }

  await schemaInitPromise;
}

export { getSql };
