import { getCurrentWeeklyPlaylist } from "@/lib/playlist";
import { getTickerText } from "@/lib/settings";
import PlaylistCards from "@/app/components/playlist-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TICKER_TEXT =
  "NEW WEEKLY PLAYLIST • 4 RANDOM TRACKS • NO REPEATS UNTIL EVERY SONG PLAYS • POWERED BY GOOGLE DRIVE •";

export default async function Home() {
  let playlist = null;
  let tickerText = DEFAULT_TICKER_TEXT;

  try {
    tickerText = await getTickerText();
  } catch {
    tickerText = DEFAULT_TICKER_TEXT;
  }

  try {
    playlist = await getCurrentWeeklyPlaylist();
  } catch {
    playlist = null;
  }

  const weekDateLabel = playlist
    ? new Date(`${playlist.weekStart}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="comic-bg min-h-screen text-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
        <h1 className="comic-title text-center text-5xl sm:text-7xl">
          Weekly Music Vault
        </h1>
        <p className="hero-subtitle mt-2 text-center">
          Four handpicked-by-chaos tracks, refreshed every week.
        </p>

        <div className="ticker my-6">
          <p>
            <span>{tickerText}</span>
            <span>{tickerText}</span>
          </p>
        </div>

        <section className="paper-panel mt-4">
          <h2 className="panel-title">This Week&apos;s 4 Tracks</h2>

          {playlist ? (
            <>
              <p className="week-meta">
                Week of {weekDateLabel} • Cycle #{playlist.cycleNumber}
              </p>

              <PlaylistCards tracks={playlist.tracks} />
            </>
          ) : (
            <div className="empty-state">
              <p>No weekly playlist found yet.</p>
              <p className="mt-2 text-sm">
                Run sync first, then trigger playlist generation.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
