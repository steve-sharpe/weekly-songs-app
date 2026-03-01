import { ensureSchema, getSql } from "@/lib/db";
import { getWeekStartUTC, toISODate } from "@/lib/date";
import { WeeklyPlaylist } from "@/lib/types";

type PlaylistHeaderRow = {
  id: number;
  week_start: string | Date;
  cycle_number: number;
  created_at: string | Date;
};

type PlaylistTrackRow = {
  id: number;
  title: string;
  track_title: string | null;
  artist_name: string | null;
  photo_url: string | null;
  album_name: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
  mime_type: string;
  web_view_link: string | null;
  position: number;
};

function mapPlaylist(
  header: PlaylistHeaderRow,
  tracks: PlaylistTrackRow[],
): WeeklyPlaylist {
  return {
    weekStart: toISODate(new Date(header.week_start)),
    cycleNumber: header.cycle_number,
    createdAt: new Date(header.created_at).toISOString(),
    tracks: tracks
      .sort((a, b) => a.position - b.position)
      .map((track) => ({
        id: track.id,
        title: track.title,
        trackTitle: track.track_title ?? track.title,
        artistName: track.artist_name ?? "Unknown Artist",
        photoUrl: track.photo_url,
        albumName: track.album_name,
        releaseYear: track.release_year,
        genre: track.genre,
        durationSeconds: track.duration_seconds,
        mimeType: track.mime_type,
        streamUrl: `/api/stream/${track.id}`,
        webViewLink: track.web_view_link,
      })),
  };
}

async function getCycleNumber(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT int_value
    FROM app_state
    WHERE key = 'playlist_cycle'
    LIMIT 1;
  `) as { int_value: number }[];

  return rows[0]?.int_value ?? 1;
}

async function setCycleNumber(cycleNumber: number): Promise<void> {
  const sql = getSql();

  await sql`
    UPDATE app_state
    SET int_value = ${cycleNumber},
        updated_at = NOW()
    WHERE key = 'playlist_cycle';
  `;
}

async function getPlaylistTracks(playlistId: number): Promise<PlaylistTrackRow[]> {
  const sql = getSql();

  return (await sql`
    SELECT
      t.id,
      t.title,
      t.track_title,
      t.artist_name,
      t.photo_url,
      t.album_name,
      t.release_year,
      t.genre,
      t.duration_seconds,
      t.mime_type,
      t.web_view_link,
      wpt.position
    FROM weekly_playlist_tracks wpt
    JOIN tracks t ON t.id = wpt.track_id
    WHERE wpt.playlist_id = ${playlistId}
    ORDER BY wpt.position ASC;
  `) as PlaylistTrackRow[];
}

async function getPlaylistForWeek(weekStart: string): Promise<WeeklyPlaylist | null> {
  const sql = getSql();
  const headers = (await sql`
    SELECT id, week_start, cycle_number, created_at
    FROM weekly_playlists
    WHERE week_start = ${weekStart}
    LIMIT 1;
  `) as PlaylistHeaderRow[];

  const header = headers[0];
  if (!header) {
    return null;
  }

  const tracks = await getPlaylistTracks(header.id);
  return mapPlaylist(header, tracks);
}

async function getLatestPlaylist(): Promise<WeeklyPlaylist | null> {
  const sql = getSql();
  const headers = (await sql`
    SELECT id, week_start, cycle_number, created_at
    FROM weekly_playlists
    ORDER BY week_start DESC
    LIMIT 1;
  `) as PlaylistHeaderRow[];

  const header = headers[0];
  if (!header) {
    return null;
  }

  const tracks = await getPlaylistTracks(header.id);
  return mapPlaylist(header, tracks);
}

async function getTrackCount(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM tracks
    WHERE is_active = TRUE;
  `) as { count: number }[];

  return rows[0]?.count ?? 0;
}

async function pickEligibleTracks(cycleNumber: number, limit: number) {
  const sql = getSql();

  return (await sql`
    SELECT
      t.id,
      t.title,
      t.mime_type,
      t.web_view_link
    FROM tracks t
    LEFT JOIN track_cycle_history h ON h.track_id = t.id
    WHERE t.is_active = TRUE
      AND COALESCE(h.last_cycle_number, 0) < ${cycleNumber}
    ORDER BY RANDOM()
    LIMIT ${limit};
  `) as {
    id: number;
    title: string;
    mime_type: string;
    web_view_link: string | null;
  }[];
}

async function countEligibleTracks(cycleNumber: number): Promise<number> {
  const sql = getSql();

  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM tracks t
    LEFT JOIN track_cycle_history h ON h.track_id = t.id
    WHERE t.is_active = TRUE
      AND COALESCE(h.last_cycle_number, 0) < ${cycleNumber};
  `) as { count: number }[];

  return rows[0]?.count ?? 0;
}

export async function getCurrentWeeklyPlaylist(
  date = new Date(),
): Promise<WeeklyPlaylist | null> {
  await ensureSchema();

  const weekStart = toISODate(getWeekStartUTC(date));
  const exact = await getPlaylistForWeek(weekStart);
  if (exact) {
    return exact;
  }

  return getLatestPlaylist();
}

export async function generateWeeklyPlaylist(date = new Date()): Promise<WeeklyPlaylist> {
  await ensureSchema();

  const weekStart = toISODate(getWeekStartUTC(date));
  const existing = await getPlaylistForWeek(weekStart);
  if (existing) {
    return existing;
  }

  const totalTracks = await getTrackCount();
  if (totalTracks === 0) {
    throw new Error("No active tracks available. Sync tracks first.");
  }

  const selectionSize = Math.min(4, totalTracks);
  let cycleNumber = await getCycleNumber();
  let eligibleCount = await countEligibleTracks(cycleNumber);

  if (eligibleCount < selectionSize) {
    cycleNumber += 1;
    await setCycleNumber(cycleNumber);
    eligibleCount = await countEligibleTracks(cycleNumber);
  }

  if (eligibleCount === 0) {
    throw new Error("Unable to select tracks. Check your track data.");
  }

  const chosen = await pickEligibleTracks(cycleNumber, selectionSize);
  if (chosen.length === 0) {
    throw new Error("No eligible tracks selected.");
  }

  const sql = getSql();
  const playlistRows = (await sql`
    INSERT INTO weekly_playlists (week_start, cycle_number)
    VALUES (${weekStart}, ${cycleNumber})
    RETURNING id;
  `) as { id: number }[];

  const playlistId = playlistRows[0].id;

  for (let index = 0; index < chosen.length; index += 1) {
    const track = chosen[index];
    const position = index + 1;

    await sql`
      INSERT INTO weekly_playlist_tracks (playlist_id, track_id, position)
      VALUES (${playlistId}, ${track.id}, ${position});
    `;

    await sql`
      INSERT INTO track_cycle_history (track_id, last_cycle_number, updated_at)
      VALUES (${track.id}, ${cycleNumber}, NOW())
      ON CONFLICT (track_id)
      DO UPDATE SET
        last_cycle_number = EXCLUDED.last_cycle_number,
        updated_at = NOW();
    `;
  }

  const headerRows = (await sql`
    SELECT id, week_start, cycle_number, created_at
    FROM weekly_playlists
    WHERE id = ${playlistId}
    LIMIT 1;
  `) as PlaylistHeaderRow[];

  const header = headerRows[0];
  const tracks = await getPlaylistTracks(playlistId);
  return mapPlaylist(header, tracks);
}
