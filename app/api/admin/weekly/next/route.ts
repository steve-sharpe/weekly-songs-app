import { NextRequest, NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin-auth";
import { ensureSchema, getSql } from "@/lib/db";
import { getWeekStartUTC, toISODate } from "@/lib/date";

export const runtime = "nodejs";

type NextWeekTrackRow = {
  track_id: number;
};

type ExistingPlaylistRow = {
  id: number;
  cycle_number: number;
};

function getNextWeekStartISO(date = new Date()): string {
  const currentWeekStart = getWeekStartUTC(date);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
  return toISODate(nextWeekStart);
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const weekStart = getNextWeekStartISO();

    const selectedRows = (await sql`
      SELECT wpt.track_id
      FROM weekly_playlists wp
      JOIN weekly_playlist_tracks wpt ON wpt.playlist_id = wp.id
      WHERE wp.week_start = ${weekStart}
      ORDER BY wpt.position ASC;
    `) as NextWeekTrackRow[];

    return NextResponse.json({
      weekStart,
      selectedTrackIds: selectedRows.map((row) => row.track_id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type NextWeekPayload = {
  trackIds?: number[];
};

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  try {
    await ensureSchema();
    const sql = getSql();

    const payload = (await request.json()) as NextWeekPayload;
    const uniqueTrackIds = Array.from(
      new Set((payload.trackIds ?? []).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)),
    );

    if (uniqueTrackIds.length === 0) {
      throw new Error("Pick at least one track for next week.");
    }

    if (uniqueTrackIds.length > 4) {
      throw new Error("Pick up to 4 tracks for next week.");
    }

    const activeRows = (await sql`
      SELECT id
      FROM tracks
      WHERE is_active = TRUE
        AND id = ANY(${uniqueTrackIds}::int[]);
    `) as { id: number }[];

    if (activeRows.length !== uniqueTrackIds.length) {
      throw new Error("One or more selected tracks are invalid or inactive.");
    }

    const weekStart = getNextWeekStartISO();

    const existingRows = (await sql`
      SELECT id, cycle_number
      FROM weekly_playlists
      WHERE week_start = ${weekStart}
      LIMIT 1;
    `) as ExistingPlaylistRow[];

    const cycleRows = (await sql`
      SELECT int_value
      FROM app_state
      WHERE key = 'playlist_cycle'
      LIMIT 1;
    `) as { int_value: number }[];

    const cycleNumber = existingRows[0]?.cycle_number ?? cycleRows[0]?.int_value ?? 1;

    let playlistId = existingRows[0]?.id;

    if (!playlistId) {
      const insertRows = (await sql`
        INSERT INTO weekly_playlists (week_start, cycle_number)
        VALUES (${weekStart}, ${cycleNumber})
        RETURNING id;
      `) as { id: number }[];

      playlistId = insertRows[0].id;
    } else {
      await sql`
        DELETE FROM weekly_playlist_tracks
        WHERE playlist_id = ${playlistId};
      `;

      await sql`
        UPDATE weekly_playlists
        SET cycle_number = ${cycleNumber}
        WHERE id = ${playlistId};
      `;
    }

    for (let index = 0; index < uniqueTrackIds.length; index += 1) {
      const trackId = uniqueTrackIds[index];
      const position = index + 1;

      await sql`
        INSERT INTO weekly_playlist_tracks (playlist_id, track_id, position)
        VALUES (${playlistId}, ${trackId}, ${position});
      `;

      await sql`
        INSERT INTO track_cycle_history (track_id, last_cycle_number, updated_at)
        VALUES (${trackId}, ${cycleNumber}, NOW())
        ON CONFLICT (track_id)
        DO UPDATE SET
          last_cycle_number = GREATEST(track_cycle_history.last_cycle_number, EXCLUDED.last_cycle_number),
          updated_at = NOW();
      `;
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      selectedTrackIds: uniqueTrackIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
