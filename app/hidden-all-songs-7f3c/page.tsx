import type { Metadata } from "next";

import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Songs Vault",
  robots: {
    index: false,
    follow: false,
  },
};

type TrackRow = {
  id: number;
  title: string;
  track_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  duration_seconds: number | null;
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

async function getAllTracks(): Promise<TrackRow[]> {
  await ensureSchema();
  const sql = getSql();

  return (await sql`
    SELECT
      id,
      title,
      track_title,
      artist_name,
      album_name,
      duration_seconds
    FROM tracks
    WHERE is_active = TRUE
    ORDER BY COALESCE(artist_name, ''), COALESCE(track_title, title), id ASC;
  `) as TrackRow[];
}

export default async function HiddenAllSongsPage() {
  const tracks = await getAllTracks();

  return (
    <div className="comic-bg min-h-screen px-4 py-8 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <section className="paper-panel">
          <h1 className="panel-title">All Drive Songs</h1>
          <p className="week-meta">Hidden Library • {tracks.length} tracks</p>

          {tracks.length === 0 ? (
            <div className="empty-state mt-6">
              <p>No tracks found.</p>
              <p className="mt-2 text-sm">Run sync first from Admin.</p>
            </div>
          ) : (
            <div className="admin-grid mt-6">
              {tracks.map((track) => (
                <article key={track.id} className="admin-card">
                  <div>
                    <h2 className="track-title">{track.track_title ?? track.title}</h2>
                    <p className="track-artist">{track.artist_name ?? "Unknown Artist"}</p>
                    <p className="track-meta">
                      {track.album_name ? `${track.album_name} • ` : ""}
                      {formatDuration(track.duration_seconds)}
                    </p>
                  </div>

                  <audio controls preload="none" className="track-player w-full" src={`/api/stream/${track.id}`}>
                    Your browser does not support audio playback.
                  </audio>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
