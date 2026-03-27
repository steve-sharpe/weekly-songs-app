import type { Metadata } from "next";
import Link from "next/link";

import SongsViewSwitcher from "@/app/components/songs-view-switcher";
import { ensureSchema, getSql } from "@/lib/db";
import type { PlaylistTrack } from "@/lib/types";

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
  photo_url: string | null;
  album_name: string | null;
  release_year: number | null;
  genre: string | null;
  duration_seconds: number | null;
  mime_type: string;
  web_view_link: string | null;
};

async function getAllTracks(): Promise<TrackRow[]> {
  await ensureSchema();
  const sql = getSql();

  return (await sql`
    SELECT
      id,
      title,
      track_title,
      artist_name,
      photo_url,
      album_name,
      release_year,
      genre,
      duration_seconds,
      mime_type,
      web_view_link
    FROM tracks
    WHERE is_active = TRUE
    ORDER BY COALESCE(artist_name, ''), COALESCE(track_title, title), id ASC;
  `) as TrackRow[];
}

export default async function HiddenAllSongsPage() {
  const tracks = await getAllTracks();
  const displayTracks: PlaylistTrack[] = tracks.map((track) => ({
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
  }));

  return (
    <div className="comic-bg min-h-screen px-4 py-8 sm:px-8">
      <main className="mx-auto max-w-6xl">
        <div className="weekly-nav-row mb-3">
          <Link href="/" className="weekly-back-btn">
            ← Home
          </Link>
        </div>

        <section className="paper-panel">
          <h1 className="panel-title">All Drive Songs</h1>
          <p className="week-meta">Hidden Library • {tracks.length} tracks</p>

          {tracks.length === 0 ? (
            <div className="empty-state mt-6">
              <p>No tracks found.</p>
              <p className="mt-2 text-sm">Run sync first from Admin.</p>
            </div>
          ) : (
            <SongsViewSwitcher tracks={displayTracks} />
          )}
        </section>
      </main>
    </div>
  );
}
