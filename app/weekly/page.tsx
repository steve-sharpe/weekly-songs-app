import { getCurrentWeeklyPlaylist } from "@/lib/playlist";
import { getTickerText } from "@/lib/settings";
import PlaylistCards from "@/app/components/playlist-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TICKER_TEXT =
  "NEW WEEKLY PLAYLIST • 4 RANDOM TRACKS • NO REPEATS UNTIL EVERY SONG PLAYS • POWERED BY GOOGLE DRIVE •";

export default async function WeeklyPage() {
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

  return (
    <div className="comic-bg weekly-shell min-h-screen text-black">
      <header className="weekly-header">
        <h1 className="weekly-header-title">The Hulk Caesar Show</h1>
      </header>

      <div className="weekly-crawl">
        <div className="weekly-crawl-content">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      <div className="weekly-nav-row">
        <a href="/" className="weekly-back-btn">
          ← Go Back Home
        </a>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-2 sm:px-8 sm:pt-4">

        <section className="paper-panel mt-4">
          <h2 className="weekly-panel-title">This Week&apos;s 4 Tracks</h2>

          {playlist ? (
            <>
              <div className="weekly-subtitle-row">
                <p className="weekly-subtitle">Select image to play</p>
              </div>

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
