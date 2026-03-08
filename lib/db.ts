import { neon } from "@neondatabase/serverless";

let schemaInitPromise: Promise<void> | null = null;

function getDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.NEON_DATABASE_URL,
  ];

  const databaseUrl = candidates.find((value) => value?.trim())?.trim();

  if (!databaseUrl) {
    throw new Error(
      "Missing database connection string. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL / NEON_DATABASE_URL).",
    );
  }

  return databaseUrl;
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
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

      await sql`
        CREATE TABLE IF NOT EXISTS rpg_players (
          id SERIAL PRIMARY KEY,
          player_name TEXT NOT NULL,
          name_key TEXT UNIQUE NOT NULL,
          level INTEGER NOT NULL DEFAULT 1,
          xp INTEGER NOT NULL DEFAULT 0,
          gold INTEGER NOT NULL DEFAULT 20,
          hp INTEGER NOT NULL DEFAULT 24,
          max_hp INTEGER NOT NULL DEFAULT 24,
          attack INTEGER NOT NULL DEFAULT 6,
          defense INTEGER NOT NULL DEFAULT 3,
          potions INTEGER NOT NULL DEFAULT 1,
          turns_left INTEGER NOT NULL DEFAULT 5,
          last_turns_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS player_name TEXT;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS name_key TEXT;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 20;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS hp INTEGER NOT NULL DEFAULT 24;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS max_hp INTEGER NOT NULL DEFAULT 24;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS attack INTEGER NOT NULL DEFAULT 6;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS defense INTEGER NOT NULL DEFAULT 3;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS potions INTEGER NOT NULL DEFAULT 1;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS turns_left INTEGER NOT NULL DEFAULT 5;
      `;

      await sql`
        ALTER TABLE rpg_players
        ADD COLUMN IF NOT EXISTS last_turns_reset_date DATE NOT NULL DEFAULT CURRENT_DATE;
      `;

      await sql`
        UPDATE rpg_players
        SET name_key = LOWER(TRIM(player_name))
        WHERE name_key IS NULL AND player_name IS NOT NULL;
      `;

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS rpg_players_name_key_unique_idx
        ON rpg_players(name_key);
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS booking_players (
          id SERIAL PRIMARY KEY,
          player_name TEXT NOT NULL,
          name_key TEXT UNIQUE NOT NULL,
          money INTEGER NOT NULL DEFAULT 300,
          fame INTEGER NOT NULL DEFAULT 0,
          scene_cred INTEGER NOT NULL DEFAULT 0,
          fan_trust INTEGER NOT NULL DEFAULT 50,
          current_week INTEGER NOT NULL DEFAULT 1,
          day_in_week INTEGER NOT NULL DEFAULT 1,
          season_complete BOOLEAN NOT NULL DEFAULT FALSE,
          selected_venue_id TEXT,
          selected_band_ids_json TEXT NOT NULL DEFAULT '[]',
          selected_promo_ids_json TEXT NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS player_name TEXT;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS name_key TEXT;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS money INTEGER NOT NULL DEFAULT 300;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS fame INTEGER NOT NULL DEFAULT 0;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS scene_cred INTEGER NOT NULL DEFAULT 0;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS fan_trust INTEGER NOT NULL DEFAULT 50;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS current_week INTEGER NOT NULL DEFAULT 1;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS day_in_week INTEGER NOT NULL DEFAULT 1;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS season_complete BOOLEAN NOT NULL DEFAULT FALSE;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS selected_venue_id TEXT;
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS selected_band_ids_json TEXT NOT NULL DEFAULT '[]';
      `;

      await sql`
        ALTER TABLE booking_players
        ADD COLUMN IF NOT EXISTS selected_promo_ids_json TEXT NOT NULL DEFAULT '[]';
      `;

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS booking_players_name_key_unique_idx
        ON booking_players(name_key);
      `;
    })();
  }

  await schemaInitPromise;
}

export { getSql };
