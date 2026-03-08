"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type GamePlayer = {
  name: string;
  money: number;
  fame: number;
  sceneCred: number;
  fanTrust: number;
  currentWeek: number;
  dayInWeek: number;
  seasonComplete: boolean;
  selectedVenueId: string | null;
  selectedBandIds: string[];
  selectedPromoIds: string[];
};

type GameBandOption = {
  id: string;
  stageName: string;
  genre: string;
  draw: number;
  fee: number;
  reliability: number;
  crowdEnergy: number;
  enabled: boolean;
};

type GameVenueOption = {
  id: string;
  name: string;
  capacity: number;
  baseRent: number;
  prestige: number;
  genreAffinity: Record<string, number>;
  enabled: boolean;
};

type PromoPackage = {
  id: string;
  label: string;
  cost: number;
  attendanceBoost: number;
};

type GameShowResult = {
  venueName: string;
  attendance: number;
  capacity: number;
  revenue: number;
  costs: number;
  profit: number;
  featuredGuestName: string | null;
  featuredGuestHit: boolean;
};

type WatchCtaLink = {
  artistName: string;
  url: string;
  label: string;
};

type SeasonSettings = {
  weeksPerSeason: number;
  daysPerWeek: number;
  winThresholdFame: number;
  winThresholdSceneCred: number;
  winThresholdFanTrust: number;
};

type GameOptions = {
  bands: GameBandOption[];
  venues: GameVenueOption[];
  promoPackages: PromoPackage[];
};

type TurnRecap = {
  turnLabel: string;
  venueName: string;
  bandNames: string[];
  promoNames: string[];
  attendance: number;
  capacity: number;
  revenue: number;
  costs: number;
  profit: number;
  moneyAfter: number;
  fameDelta: number;
  sceneCredDelta: number;
  fanTrustDelta: number;
  sceneEvent: string | null;
  insightLines: string[];
  nextTip: string;
  nextStep: string;
  ctaLinks: WatchCtaLink[];
  featuredGuestName: string | null;
  featuredGuestHit: boolean;
};

type GameAction = "choose_venue" | "book_band" | "set_promo" | "run_show";

const PLAYER_STORAGE_KEY = "hulk_booking_player_name";

function formatSignedValue(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function getGenreFitBonus(venue: GameVenueOption | null, genre: string): number {
  if (!venue) {
    return 0;
  }

  const key = genre.trim().toLowerCase();
  return venue.genreAffinity[key] ?? 0;
}

export default function GamePage() {
  const [nameInput, setNameInput] = useState("");
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [options, setOptions] = useState<GameOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [latestTurnRecap, setLatestTurnRecap] = useState<TurnRecap | null>(null);
  const [featuredGuestOfWeek, setFeaturedGuestOfWeek] = useState<string | null>(null);
  const [seasonSettings, setSeasonSettings] = useState<SeasonSettings | null>(null);
  const [logLines, setLogLines] = useState<string[]>([
    "Welcome to George Street Booking Manager. Build the local scene and win headline slots.",
  ]);

  const selectedVenue = useMemo(() => {
    if (!player || !options || !player.selectedVenueId) {
      return null;
    }

    return options.venues.find((venue) => venue.id === player.selectedVenueId) ?? null;
  }, [options, player]);

  const selectedBands = useMemo(() => {
    if (!player || !options) {
      return [] as GameBandOption[];
    }

    const selected = new Set(player.selectedBandIds);
    return options.bands.filter((band) => selected.has(band.id));
  }, [options, player]);

  const selectedPromos = useMemo(() => {
    if (!player || !options) {
      return [] as PromoPackage[];
    }

    const selected = new Set(player.selectedPromoIds);
    return options.promoPackages.filter((promo) => selected.has(promo.id));
  }, [options, player]);

  const plannedCost = useMemo(() => {
    const venueCost = selectedVenue?.baseRent ?? 0;
    const bandCosts = selectedBands.reduce((total, band) => total + band.fee, 0);
    const promoCosts = selectedPromos.reduce((total, promo) => total + promo.cost, 0);

    return venueCost + bandCosts + promoCosts;
  }, [selectedBands, selectedPromos, selectedVenue]);

  const missingTurnRequirements = useMemo(() => {
    const missing: string[] = [];

    if (!selectedVenue) {
      missing.push("choose a venue");
    }

    if (selectedBands.length === 0) {
      missing.push("book at least one band");
    }

    return missing;
  }, [selectedVenue, selectedBands]);

  const canRunShow = useMemo(() => {
    return Boolean(player && !player.seasonComplete && missingTurnRequirements.length === 0);
  }, [missingTurnRequirements, player]);

  useEffect(() => {
    const savedName = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!savedName) {
      return;
    }

    setNameInput(savedName);
    void loadPlayer(savedName);
  }, []);

  async function loadPlayer(name: string) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/game/player?name=${encodeURIComponent(name)}`);
      const body = (await response.json()) as {
        player?: GamePlayer;
        options?: GameOptions;
        featuredGuestOfWeek?: string | null;
        seasonSettings?: SeasonSettings;
        error?: string;
      };

      if (!response.ok || !body.player || !body.options) {
        throw new Error(body.error || "Failed to load manager profile.");
      }

      const loadedPlayer = body.player;
      const loadedOptions = body.options;

      setPlayer(loadedPlayer);
      setOptions(loadedOptions);
      setFeaturedGuestOfWeek(body.featuredGuestOfWeek ?? null);
      setSeasonSettings(body.seasonSettings ?? null);
      setLatestTurnRecap(null);
      setLogLines((prev) => [`Welcome back, ${loadedPlayer.name}.`, ...prev].slice(0, 10));
    } catch {
      setPlayer(null);
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }

  async function createOrLoadPlayer(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/game/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });

      const body = (await response.json()) as {
        player?: GamePlayer;
        options?: GameOptions;
        featuredGuestOfWeek?: string | null;
        seasonSettings?: SeasonSettings;
        error?: string;
      };

      if (!response.ok || !body.player || !body.options) {
        throw new Error(body.error || "Could not create manager profile.");
      }

      const loadedPlayer = body.player;
      const loadedOptions = body.options;

      setPlayer(loadedPlayer);
      setOptions(loadedOptions);
      setFeaturedGuestOfWeek(body.featuredGuestOfWeek ?? null);
      setSeasonSettings(body.seasonSettings ?? null);
      window.localStorage.setItem(PLAYER_STORAGE_KEY, loadedPlayer.name);
      setNameInput(loadedPlayer.name);
      setLatestTurnRecap(null);
      setLogLines([
        `Promoter ready: ${loadedPlayer.name}`,
        "Book venues, stack local lineups, and grow your St. John's fame.",
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: GameAction, payload: Record<string, string> = {}) {
    if (!player) {
      return;
    }

    const playerBeforeAction = player;
    const selectedVenueBeforeAction = selectedVenue;
    const selectedBandsBeforeAction = selectedBands;
    const selectedPromosBeforeAction = selectedPromos;

    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: player.name,
          action,
          payload,
        }),
      });

      const body = (await response.json()) as {
        player?: GamePlayer;
        lines?: string[];
        showResult?: GameShowResult;
        ctaLinks?: WatchCtaLink[];
        featuredGuestOfWeek?: string | null;
        error?: string;
      };

      if (!response.ok || !body.player) {
        throw new Error(body.error || "Action failed.");
      }

      setPlayer(body.player);
  setFeaturedGuestOfWeek(body.featuredGuestOfWeek ?? null);

      if (action === "run_show" && body.showResult) {
        const systemLinePrefixes = [
          "Show complete at",
          "Fame ",
          "Next booking day:",
          "Season complete",
        ];
        const nextStepLine =
          body.lines?.find(
            (line) => line.startsWith("Next booking day:") || line.startsWith("Season complete"),
          ) ??
          (body.player.seasonComplete
            ? "Season complete. Start a new promoter run to play another season."
            : `Next booking day: Week ${body.player.currentWeek}, Day ${body.player.dayInWeek}.`);
        const sceneEventLine =
          body.lines?.find(
            (line) => !systemLinePrefixes.some((prefix) => line.startsWith(prefix)),
          ) ?? null;

        const attendanceRate =
          body.showResult.capacity > 0
            ? body.showResult.attendance / body.showResult.capacity
            : 0;
        const averageReliability =
          selectedBandsBeforeAction.length > 0
            ? selectedBandsBeforeAction.reduce((sum, band) => sum + band.reliability, 0) /
              selectedBandsBeforeAction.length
            : 0;
        const averageGenreFit =
          selectedBandsBeforeAction.length > 0
            ? selectedBandsBeforeAction.reduce(
                (sum, band) => sum + getGenreFitBonus(selectedVenueBeforeAction, band.genre),
                0,
              ) / selectedBandsBeforeAction.length
            : 0;
        const promoBoostTotal = selectedPromosBeforeAction.reduce(
          (sum, promo) => sum + promo.attendanceBoost,
          0,
        );

        const insightLines: string[] = [];

        if (attendanceRate >= 0.9) {
          insightLines.push("Turnout was near sellout, so your lineup and setup connected strongly.");
        } else if (attendanceRate >= 0.65) {
          insightLines.push("Turnout was solid, with room to improve toward a near-sellout show.");
        } else {
          insightLines.push("Turnout was low, which limited both revenue and momentum this turn.");
        }

        if (averageGenreFit >= 0.15) {
          insightLines.push("Band genres matched the venue well, boosting audience fit.");
        } else if (averageGenreFit <= 0.02) {
          insightLines.push("Genre fit was weak, so fewer venue-regulars likely converted into attendance.");
        }

        if (selectedPromosBeforeAction.length === 0 && attendanceRate < 0.85) {
          insightLines.push("No promo package was active, so this turn relied only on baseline draw.");
        } else if (promoBoostTotal >= 0.15) {
          insightLines.push("Your promo stack gave a meaningful turnout boost.");
        }

        if (averageReliability < 65) {
          insightLines.push("Lower lineup reliability made this show performance less consistent.");
        } else if (averageReliability >= 82) {
          insightLines.push("High lineup reliability helped stabilize show results.");
        }

        if (body.showResult.profit >= 0) {
          insightLines.push("The show ran at a profit after venue, band, and promo costs.");
        } else {
          insightLines.push("Costs exceeded revenue this turn, resulting in a cash loss.");
        }

        let nextTip = "Keep testing one variable at a time (venue, lineup, or promo) to learn what shifts turnout fastest.";
        if (attendanceRate < 0.6 && averageGenreFit < 0.1) {
          nextTip = "Next turn tip: book bands whose genre matches the chosen venue's affinity for better attendance.";
        } else if (attendanceRate < 0.75 && selectedPromosBeforeAction.length === 0) {
          nextTip = "Next turn tip: add at least one promo package to raise turnout floor on weaker nights.";
        } else if (body.showResult.profit < 0 && attendanceRate >= 0.6) {
          nextTip = "Next turn tip: keep turnout, but cut spend by selecting a cheaper venue or one lower-fee band.";
        } else if (body.showResult.profit > 0 && attendanceRate > 0.85) {
          nextTip = "Next turn tip: this setup is strong; test a higher-prestige venue for bigger fame upside.";
        }

        setLatestTurnRecap({
          turnLabel: `Week ${playerBeforeAction.currentWeek}, Day ${playerBeforeAction.dayInWeek}`,
          venueName: body.showResult.venueName,
          bandNames: selectedBandsBeforeAction.map((band) => band.stageName),
          promoNames: selectedPromosBeforeAction.map((promo) => promo.label),
          attendance: body.showResult.attendance,
          capacity: body.showResult.capacity,
          revenue: body.showResult.revenue,
          costs: body.showResult.costs,
          profit: body.showResult.profit,
          moneyAfter: body.player.money,
          fameDelta: body.player.fame - playerBeforeAction.fame,
          sceneCredDelta: body.player.sceneCred - playerBeforeAction.sceneCred,
          fanTrustDelta: body.player.fanTrust - playerBeforeAction.fanTrust,
          sceneEvent: sceneEventLine,
          insightLines,
          nextTip,
          nextStep: nextStepLine,
          ctaLinks: body.ctaLinks ?? [],
          featuredGuestName: body.showResult.featuredGuestName,
          featuredGuestHit: body.showResult.featuredGuestHit,
        });
      }

      if (body.lines?.length) {
        setLogLines((prev) => [...body.lines!, ...prev].slice(0, 10));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="comic-bg min-h-screen px-4 py-8 text-black sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/" className="weekly-back-btn inline-block">
          ← Go Back Home
        </Link>

        <section className="paper-panel mt-4 space-y-6 p-5 sm:p-8">
          <div className="space-y-2 text-center">
            <h1 className="weekly-panel-title">George Street Booking Manager</h1>
            <p className="weekly-subtitle">
              Build the hottest local lineup in St. John&apos;s and win the headline slot.
            </p>
          </div>

          <form onSubmit={createOrLoadPlayer} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              className="rounded border-2 border-black bg-white px-3 py-2 text-base"
              placeholder="Enter promoter name"
              maxLength={24}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded border-2 border-black bg-yellow-300 px-4 py-2 font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Create / Load"}
            </button>
          </form>

          {message ? <p className="admin-message">{message}</p> : null}

          {player && options ? (
            <>
              <div className="grid grid-cols-2 gap-3 rounded border-2 border-black bg-white p-4 text-sm sm:grid-cols-6 sm:text-base">
                <p><strong>Name:</strong> {player.name}</p>
                <p><strong>Money:</strong> ${player.money}</p>
                <p><strong>Fame:</strong> {player.fame}</p>
                <p><strong>Scene Cred:</strong> {player.sceneCred}</p>
                <p><strong>Fan Trust:</strong> {player.fanTrust}</p>
                <p><strong>Season:</strong> Week {player.currentWeek} Day {player.dayInWeek}</p>
              </div>

              <div className="rounded border-2 border-black bg-white p-4">
                <h2 className="track-title">Plan Tonight&apos;s Show</h2>
                <p className="track-meta mt-1">
                  Select one venue, up to three bands, and optional promo packages.
                </p>
                <p className="track-meta mt-2">
                  Planned spend: <strong>${plannedCost}</strong>
                  {selectedVenue ? ` • Venue: ${selectedVenue.name}` : " • No venue selected"}
                </p>
                <p className="track-meta mt-1">
                  Featured guest this slot: {featuredGuestOfWeek ?? "None"}
                </p>
                {seasonSettings ? (
                  <p className="track-meta mt-1">
                    Season target: Fame {seasonSettings.winThresholdFame}, Scene Cred {seasonSettings.winThresholdSceneCred}, Fan Trust {seasonSettings.winThresholdFanTrust}
                  </p>
                ) : null}
              </div>

              <div className="rounded border-2 border-black bg-white p-4">
                <h3 className="track-title">Turn Checklist</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>1) Choose exactly one venue.</li>
                  <li>2) Book 1 to 3 bands for the lineup.</li>
                  <li>3) Add optional promo packages, then run the show.</li>
                </ul>
                <p className="track-meta mt-3">
                  {missingTurnRequirements.length
                    ? `Still needed: ${missingTurnRequirements.join(" and ")}.`
                    : "Ready to run tonight's show."}
                </p>
              </div>

              <div className="rounded border-2 border-black bg-white p-4">
                <h3 className="track-title">Venues</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.venues.map((venue) => {
                    const active = player.selectedVenueId === venue.id;

                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => void runAction("choose_venue", { venueId: venue.id })}
                        disabled={actionLoading || player.seasonComplete}
                        className={`rounded border-2 border-black p-3 text-left shadow-[4px_4px_0_#000] ${
                          active ? "bg-yellow-300" : "bg-white"
                        } disabled:opacity-60`}
                      >
                        <p className="font-bold uppercase">{venue.name}</p>
                        <p className="text-sm">Capacity: {venue.capacity}</p>
                        <p className="text-sm">Rent: ${venue.baseRent}</p>
                        <p className="text-sm">Prestige: {venue.prestige}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded border-2 border-black bg-white p-4">
                <h3 className="track-title">Bands</h3>
                <p className="track-meta mt-1">Booked: {player.selectedBandIds.length} / 3</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.bands.map((band) => {
                    const active = player.selectedBandIds.includes(band.id);

                    return (
                      <button
                        key={band.id}
                        type="button"
                        onClick={() => void runAction("book_band", { bandId: band.id })}
                        disabled={actionLoading || player.seasonComplete}
                        className={`rounded border-2 border-black p-3 text-left shadow-[4px_4px_0_#000] ${
                          active ? "bg-green-300" : "bg-white"
                        } disabled:opacity-60`}
                      >
                        <p className="font-bold uppercase">{band.stageName}</p>
                        <p className="text-sm">Genre: {band.genre}</p>
                        <p className="text-sm">Draw: {band.draw}</p>
                        <p className="text-sm">Fee: ${band.fee}</p>
                        <p className="text-sm">Reliability: {band.reliability}%</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded border-2 border-black bg-white p-4">
                <h3 className="track-title">Promotion</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.promoPackages.map((promo) => {
                    const active = player.selectedPromoIds.includes(promo.id);

                    return (
                      <button
                        key={promo.id}
                        type="button"
                        onClick={() => void runAction("set_promo", { promoId: promo.id })}
                        disabled={actionLoading || player.seasonComplete}
                        className={`rounded border-2 border-black p-3 text-left shadow-[4px_4px_0_#000] ${
                          active ? "bg-blue-300" : "bg-white"
                        } disabled:opacity-60`}
                      >
                        <p className="font-bold uppercase">{promo.label}</p>
                        <p className="text-sm">Cost: ${promo.cost}</p>
                        <p className="text-sm">Attendance boost: +{Math.round(promo.attendanceBoost * 100)}%</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void runAction("run_show")}
                disabled={actionLoading || player.seasonComplete || !canRunShow}
                className="w-full rounded border-2 border-black bg-red-400 px-4 py-3 text-lg font-bold uppercase shadow-[4px_4px_0_#000] disabled:opacity-60"
              >
                {player.seasonComplete
                  ? "Season Complete"
                  : !canRunShow
                    ? "Complete Setup To Run Show"
                  : actionLoading
                    ? "Running Show..."
                    : "Run Tonight's Show"}
              </button>

              {latestTurnRecap ? (
                <div className="rounded border-2 border-black bg-white p-4">
                  <h2 className="track-title">Latest Turn Recap</h2>
                  <p className="track-meta mt-1">
                    {latestTurnRecap.turnLabel} • {latestTurnRecap.venueName}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">Attendance</p>
                      <p className="mt-1 text-sm">
                        {latestTurnRecap.attendance} / {latestTurnRecap.capacity} ({Math.round((latestTurnRecap.attendance / Math.max(1, latestTurnRecap.capacity)) * 100)}%)
                      </p>
                    </div>
                    <div className="rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">Profit</p>
                      <p className="mt-1 text-sm">{formatSignedValue(latestTurnRecap.profit)} cash</p>
                      <p className="track-meta mt-1">Revenue ${latestTurnRecap.revenue} • Costs ${latestTurnRecap.costs}</p>
                    </div>
                    <div className="rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">Reputation</p>
                      <p className="mt-1 text-sm">Fame {formatSignedValue(latestTurnRecap.fameDelta)}</p>
                      <p className="text-sm">Scene Cred {formatSignedValue(latestTurnRecap.sceneCredDelta)}</p>
                      <p className="text-sm">Fan Trust {formatSignedValue(latestTurnRecap.fanTrustDelta)}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">Lineup</p>
                      <p className="mt-1 text-sm">
                        {latestTurnRecap.bandNames.length
                          ? latestTurnRecap.bandNames.join(", ")
                          : "No bands recorded."}
                      </p>
                      <p className="track-meta mt-1">
                        Promos: {latestTurnRecap.promoNames.length ? latestTurnRecap.promoNames.join(", ") : "None"}
                      </p>
                    </div>
                    <div className="rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">What Happened</p>
                      <p className="mt-1 text-sm">
                        {latestTurnRecap.sceneEvent ?? "No special scene event this turn."}
                      </p>
                      <p className="track-meta mt-1">
                        Featured guest: {latestTurnRecap.featuredGuestName ?? "None"}
                        {latestTurnRecap.featuredGuestName
                          ? latestTurnRecap.featuredGuestHit
                            ? " (bonus hit)"
                            : " (not booked)"
                          : ""}
                      </p>
                      <p className="track-meta mt-1">{latestTurnRecap.nextStep}</p>
                      <p className="track-meta mt-1">Current money: ${latestTurnRecap.moneyAfter}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded border border-black p-3">
                    <p className="text-sm font-bold uppercase">Why This Turn Went This Way</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {latestTurnRecap.insightLines.map((insight, index) => (
                        <li key={`${insight}-${index}`}>• {insight}</li>
                      ))}
                    </ul>
                    <p className="track-meta mt-2">{latestTurnRecap.nextTip}</p>
                  </div>

                  {latestTurnRecap.ctaLinks.length ? (
                    <div className="mt-3 rounded border border-black p-3">
                      <p className="text-sm font-bold uppercase">Keep The Momentum Going</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {latestTurnRecap.ctaLinks.map((link) => (
                          <a
                            key={`${link.artistName}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border-2 border-black bg-yellow-200 px-3 py-2 text-sm font-bold uppercase shadow-[3px_3px_0_#000]"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="rounded border-2 border-black bg-white p-4 text-left">
            <p className="track-title">Recent Activity</p>
            <p className="track-meta mt-1">Latest updates from your booking actions.</p>
            <ul className="mt-3 space-y-2 text-sm sm:text-base">
              {logLines.map((line, index) => (
                <li key={`${line}-${index}`} className="rounded border border-black p-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
