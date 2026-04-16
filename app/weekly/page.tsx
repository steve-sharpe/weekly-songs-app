import Link from "next/link";

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
        <Link href="/" className="weekly-back-btn">
          ← Go Back Home
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-2 sm:px-8 sm:pt-4">

        <section className="paper-panel mt-4">
          <h2 className="weekly-panel-title">Hulk Caesar Show Jukebox</h2>
          <div className="weekly-subtitle-row">
            <p className="weekly-subtitle">Try the new Jukebox for all songs!</p>
          </div>
          <div className="flex justify-center mt-6">
            <a
              href="https://hcssonglist.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="play-all-btn now-playing-btn text-lg px-8 py-4"
              style={{ textDecoration: "none" }}
            >
              🎵 Open Hulk Caesar Show Jukebox
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
