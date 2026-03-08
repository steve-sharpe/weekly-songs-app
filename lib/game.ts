import { ensureSchema, getSql } from "@/lib/db";
import {
  BookingBandDesign,
  BookingGameOptions,
  BookingPromoPackage,
  BookingVenueDesign,
  GameDesignConfig,
  SceneEventDesign,
  SeasonSettings,
  getBookingGameOptions,
  getGameDesign,
  getGenreFitForVenue,
  normalizeGameDesign,
} from "@/lib/game-design";

const MAX_NAME_LENGTH = 24;
const MAX_BANDS_PER_SHOW = 3;
const BASE_TICKET_PRICE = 12;
const CONCESSION_PER_ATTENDEE = 2;
const STARTING_MONEY = 300;
const STARTING_FAME = 0;
const STARTING_SCENE_CRED = 0;
const STARTING_FAN_TRUST = 50;
const DESIGN_OPTIONS_CACHE_TTL_MS = 15000;

type DesignOptionsCache = {
  expiresAt: number;
  value: {
    design: GameDesignConfig;
    options: BookingGameOptions;
  };
};

let designOptionsCache: DesignOptionsCache | null = null;

type PlayerRow = {
  id: number;
  player_name: string;
  name_key: string;
  money: number;
  fame: number;
  scene_cred: number;
  fan_trust: number;
  current_week: number;
  day_in_week: number;
  season_complete: boolean;
  selected_venue_id: string | null;
  selected_band_ids_json: string;
  selected_promo_ids_json: string;
};

export type GamePlayer = {
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

export type GameAction = "choose_venue" | "book_band" | "set_promo" | "run_show";

export type GameActionPayload = {
  venueId?: string;
  bandId?: string;
  promoId?: string;
};

export type GameShowResult = {
  venueName: string;
  attendance: number;
  capacity: number;
  revenue: number;
  costs: number;
  profit: number;
  featuredGuestName: string | null;
  featuredGuestHit: boolean;
};

export type WatchCtaLink = {
  artistName: string;
  url: string;
  label: string;
};

export type GameActionResult = {
  player: GamePlayer;
  lines: string[];
  action: GameAction;
  showResult?: GameShowResult;
  ctaLinks?: WatchCtaLink[];
  featuredGuestOfWeek?: string | null;
};

export type GameStateResponse = {
  player: GamePlayer;
  options: BookingGameOptions;
  featuredGuestOfWeek: string | null;
  seasonSettings: SeasonSettings;
};

export type SimulateNightInput = {
  design?: unknown;
  venueId?: string;
  bandIds?: string[];
  promoIds?: string[];
  week?: number;
  day?: number;
};

export type SimulateNightResult = {
  showResult: GameShowResult;
  lines: string[];
  featuredGuestOfWeek: string | null;
};

type NightOutcome = {
  attendance: number;
  capacity: number;
  revenue: number;
  costs: number;
  profit: number;
  fameDelta: number;
  sceneCredDelta: number;
  fanTrustDelta: number;
  moneyDelta: number;
  sceneEvent: SceneEventDesign | null;
  featuredGuestName: string | null;
  featuredGuestHit: boolean;
};

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH);
}

function toNameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseStringArrayJson(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function toArrayJson(value: string[]): string {
  return JSON.stringify(value);
}

function mapPlayer(row: PlayerRow): GamePlayer {
  return {
    name: row.player_name,
    money: row.money,
    fame: row.fame,
    sceneCred: row.scene_cred,
    fanTrust: row.fan_trust,
    currentWeek: row.current_week,
    dayInWeek: row.day_in_week,
    seasonComplete: row.season_complete,
    selectedVenueId: row.selected_venue_id,
    selectedBandIds: parseStringArrayJson(row.selected_band_ids_json),
    selectedPromoIds: parseStringArrayJson(row.selected_promo_ids_json),
  };
}

function findVenue(options: BookingGameOptions, venueId: string | null): BookingVenueDesign | null {
  if (!venueId) {
    return null;
  }

  return options.venues.find((venue) => venue.id === venueId) ?? null;
}

function findBands(options: BookingGameOptions, ids: string[]): BookingBandDesign[] {
  const selected = new Set(ids);
  return options.bands.filter((band) => selected.has(band.id));
}

function findPromos(options: BookingGameOptions, ids: string[]): BookingPromoPackage[] {
  const selected = new Set(ids);
  return options.promoPackages.filter((promo) => selected.has(promo.id));
}

function getFeaturedGuestForTurn(
  options: BookingGameOptions,
  currentWeek: number,
  dayInWeek: number,
  daysPerWeek: number,
): BookingBandDesign | null {
  const candidates = options.bands.filter((band) => band.enabled);
  if (!candidates.length) {
    return null;
  }

  const safeDays = Math.max(1, daysPerWeek);
  const turnIndex = (Math.max(1, currentWeek) - 1) * safeDays + (Math.max(1, dayInWeek) - 1);
  const slot = ((turnIndex % candidates.length) + candidates.length) % candidates.length;
  return candidates[slot] ?? null;
}

function rollSceneEvent(sceneEvents: SceneEventDesign[]): SceneEventDesign | null {
  const enabledEvents = sceneEvents.filter((event) => event.enabled);
  if (!enabledEvents.length) {
    return null;
  }

  const triggered = enabledEvents.filter((event) => Math.random() < event.chance);
  if (!triggered.length) {
    return null;
  }

  return triggered[randomInt(0, triggered.length - 1)] ?? null;
}

function hasMetWinThreshold(player: PlayerRow, seasonSettings: SeasonSettings): boolean {
  return (
    player.fame >= seasonSettings.winThresholdFame &&
    player.scene_cred >= seasonSettings.winThresholdSceneCred &&
    player.fan_trust >= seasonSettings.winThresholdFanTrust
  );
}

function clampPlayerToSeason(player: PlayerRow, seasonSettings: SeasonSettings): void {
  player.current_week = clamp(player.current_week, 1, seasonSettings.weeksPerSeason);
  player.day_in_week = clamp(player.day_in_week, 1, seasonSettings.daysPerWeek);

  if (player.current_week >= seasonSettings.weeksPerSeason && player.day_in_week >= seasonSettings.daysPerWeek) {
    player.season_complete = true;
  }
}

function advanceCalendar(player: PlayerRow, seasonSettings: SeasonSettings): void {
  if (player.season_complete) {
    return;
  }

  if (player.day_in_week < seasonSettings.daysPerWeek) {
    player.day_in_week += 1;
  } else {
    player.current_week += 1;
    player.day_in_week = 1;
  }

  if (player.current_week > seasonSettings.weeksPerSeason) {
    player.current_week = seasonSettings.weeksPerSeason;
    player.day_in_week = seasonSettings.daysPerWeek;
    player.season_complete = true;
  }
}

function calculateNightOutcome(
  venue: BookingVenueDesign,
  bookedBands: BookingBandDesign[],
  promos: BookingPromoPackage[],
  sceneEvents: SceneEventDesign[],
  featuredGuest: BookingBandDesign | null,
  featuredBonus: GameDesignConfig["featuredGuestBonus"],
): NightOutcome {
  const bandDraw = bookedBands.reduce((total, band) => total + band.draw, 0);
  const fitBonus =
    bookedBands.reduce((total, band) => total + getGenreFitForVenue(venue, band.genre), 0) /
    bookedBands.length;
  const promoBonus = promos.reduce((total, promo) => total + promo.attendanceBoost, 0);
  const reliabilityFactor =
    bookedBands.reduce((total, band) => total + band.reliability, 0) / bookedBands.length / 100;
  const noise = randomFloat(0.88, 1.12);

  const attendancePotential = bandDraw * (1 + fitBonus + promoBonus) * reliabilityFactor;
  const attendance = clamp(Math.round(attendancePotential * noise), 0, venue.capacity);

  const ticketPrice = BASE_TICKET_PRICE + Math.floor(venue.prestige / 2);
  const ticketRevenue = attendance * ticketPrice;
  const concessionRevenue =
    attendance >= Math.round(venue.capacity * 0.75)
      ? attendance * CONCESSION_PER_ATTENDEE
      : 0;
  const totalRevenue = ticketRevenue + concessionRevenue;

  const totalBandFees = bookedBands.reduce((total, band) => total + band.fee, 0);
  const promoSpend = promos.reduce((total, promo) => total + promo.cost, 0);
  const totalCosts = venue.baseRent + totalBandFees + promoSpend;
  const profit = totalRevenue - totalCosts;

  let fameDelta = 0;
  if (attendance >= Math.round(venue.capacity * 0.9)) {
    fameDelta += 5;
  } else if (attendance >= Math.round(venue.capacity * 0.6)) {
    fameDelta += 2;
  } else if (attendance <= Math.round(venue.capacity * 0.35)) {
    fameDelta -= 2;
  }

  if (attendance >= venue.capacity) {
    fameDelta += venue.prestige;
  }

  let sceneCredDelta = bookedBands.length;
  if (fitBonus >= 0.25) {
    sceneCredDelta += 2;
  }

  let fanTrustDelta = 0;
  if (profit >= 0) {
    fanTrustDelta += 2;
  }

  if (profit < -80) {
    fanTrustDelta -= 3;
  }

  const featuredGuestHit = Boolean(
    featuredGuest && bookedBands.some((band) => band.id === featuredGuest.id),
  );

  let featuredMoneyDelta = 0;
  if (featuredGuestHit && featuredBonus.enabled) {
    featuredMoneyDelta += featuredBonus.moneyBonus;
    fameDelta += featuredBonus.fameBonus;
    sceneCredDelta += featuredBonus.sceneCredBonus;
    fanTrustDelta += featuredBonus.fanTrustBonus;
  }

  const sceneEvent = rollSceneEvent(sceneEvents);

  let moneyDelta = profit + featuredMoneyDelta;
  if (sceneEvent?.moneyDelta) {
    moneyDelta += sceneEvent.moneyDelta;
  }

  fameDelta += sceneEvent?.fameDelta ?? 0;
  sceneCredDelta += sceneEvent?.sceneCredDelta ?? 0;
  fanTrustDelta += sceneEvent?.fanTrustDelta ?? 0;

  return {
    attendance,
    capacity: venue.capacity,
    revenue: totalRevenue,
    costs: totalCosts,
    profit,
    fameDelta,
    sceneCredDelta,
    fanTrustDelta,
    moneyDelta,
    sceneEvent,
    featuredGuestName: featuredGuest?.stageName ?? null,
    featuredGuestHit,
  };
}

async function loadPlayerRow(nameKey: string): Promise<PlayerRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      player_name,
      name_key,
      money,
      fame,
      scene_cred,
      fan_trust,
      current_week,
      day_in_week,
      season_complete,
      selected_venue_id,
      selected_band_ids_json,
      selected_promo_ids_json
    FROM booking_players
    WHERE name_key = ${nameKey}
    LIMIT 1;
  `) as PlayerRow[];

  return rows[0] ?? null;
}

async function savePlayerRow(player: PlayerRow): Promise<PlayerRow> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE booking_players
    SET
      money = ${player.money},
      fame = ${player.fame},
      scene_cred = ${player.scene_cred},
      fan_trust = ${player.fan_trust},
      current_week = ${player.current_week},
      day_in_week = ${player.day_in_week},
      season_complete = ${player.season_complete},
      selected_venue_id = ${player.selected_venue_id},
      selected_band_ids_json = ${player.selected_band_ids_json},
      selected_promo_ids_json = ${player.selected_promo_ids_json},
      updated_at = NOW()
    WHERE id = ${player.id}
    RETURNING
      id,
      player_name,
      name_key,
      money,
      fame,
      scene_cred,
      fan_trust,
      current_week,
      day_in_week,
      season_complete,
      selected_venue_id,
      selected_band_ids_json,
      selected_promo_ids_json;
  `) as PlayerRow[];

  return rows[0] ?? player;
}

async function fetchArtistWatchLinks(artistNames: string[]): Promise<WatchCtaLink[]> {
  const normalizedNames = Array.from(
    new Set(
      artistNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    ),
  );

  if (!normalizedNames.length) {
    return [];
  }

  const sql = getSql();
  const links: WatchCtaLink[] = [];

  for (const artistName of normalizedNames.slice(0, 3)) {
    const rows = (await sql`
      SELECT TRIM(artist_name) AS artist_name, web_view_link
      FROM tracks
      WHERE is_active = TRUE
        AND artist_name IS NOT NULL
        AND TRIM(artist_name) <> ''
        AND web_view_link IS NOT NULL
        AND TRIM(web_view_link) <> ''
        AND LOWER(TRIM(artist_name)) = LOWER(${artistName})
      ORDER BY created_time DESC NULLS LAST, id DESC
      LIMIT 1;
    `) as { artist_name: string; web_view_link: string }[];

    const match = rows[0];
    if (!match?.web_view_link) {
      continue;
    }

    links.push({
      artistName: match.artist_name,
      url: match.web_view_link,
      label: `Watch ${match.artist_name} on the show`,
    });
  }

  return links;
}

async function getDesignAndOptions(): Promise<{ design: GameDesignConfig; options: BookingGameOptions }> {
  const now = Date.now();
  if (designOptionsCache && designOptionsCache.expiresAt > now) {
    return designOptionsCache.value;
  }

  const design = await getGameDesign();
  const options = getBookingGameOptions(design);
  const value = { design, options };

  designOptionsCache = {
    expiresAt: now + DESIGN_OPTIONS_CACHE_TTL_MS,
    value,
  };

  return value;
}

export async function getOrCreatePlayer(nameInput: string): Promise<GamePlayer> {
  await ensureSchema();

  const normalizedName = normalizeName(nameInput);
  const nameKey = toNameKey(nameInput);

  if (!normalizedName || normalizedName.length < 2) {
    throw new Error("Name must be at least 2 characters.");
  }

  const existing = await loadPlayerRow(nameKey);
  if (existing) {
    return mapPlayer(existing);
  }

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO booking_players (
      player_name,
      name_key,
      money,
      fame,
      scene_cred,
      fan_trust,
      current_week,
      day_in_week,
      season_complete,
      selected_venue_id,
      selected_band_ids_json,
      selected_promo_ids_json
    )
    VALUES (
      ${normalizedName},
      ${nameKey},
      ${STARTING_MONEY},
      ${STARTING_FAME},
      ${STARTING_SCENE_CRED},
      ${STARTING_FAN_TRUST},
      1,
      1,
      FALSE,
      NULL,
      '[]',
      '[]'
    )
    RETURNING
      id,
      player_name,
      name_key,
      money,
      fame,
      scene_cred,
      fan_trust,
      current_week,
      day_in_week,
      season_complete,
      selected_venue_id,
      selected_band_ids_json,
      selected_promo_ids_json;
  `) as PlayerRow[];

  return mapPlayer(rows[0]);
}

export async function getPlayer(nameInput: string): Promise<GamePlayer | null> {
  await ensureSchema();

  const nameKey = toNameKey(nameInput);
  if (!nameKey) {
    return null;
  }

  const player = await loadPlayerRow(nameKey);
  if (!player) {
    return null;
  }

  return mapPlayer(player);
}

export async function getPlayerState(nameInput: string): Promise<GameStateResponse | null> {
  const player = await getPlayer(nameInput);
  if (!player) {
    return null;
  }

  const { design, options } = await getDesignAndOptions();
  const featuredGuestOfWeek = getFeaturedGuestForTurn(
    options,
    player.currentWeek,
    player.dayInWeek,
    design.seasonSettings.daysPerWeek,
  )?.stageName ?? null;

  return {
    player,
    options,
    featuredGuestOfWeek,
    seasonSettings: design.seasonSettings,
  };
}

export async function createOrLoadPlayerState(nameInput: string): Promise<GameStateResponse> {
  const player = await getOrCreatePlayer(nameInput);
  const { design, options } = await getDesignAndOptions();

  const featuredGuestOfWeek = getFeaturedGuestForTurn(
    options,
    player.currentWeek,
    player.dayInWeek,
    design.seasonSettings.daysPerWeek,
  )?.stageName ?? null;

  return {
    player,
    options,
    featuredGuestOfWeek,
    seasonSettings: design.seasonSettings,
  };
}

export async function performGameAction(
  nameInput: string,
  action: GameAction,
  payload: GameActionPayload,
): Promise<GameActionResult> {
  await ensureSchema();

  const nameKey = toNameKey(nameInput);
  const player = await loadPlayerRow(nameKey);
  if (!player) {
    throw new Error("Player not found. Create your character first.");
  }

  const { design, options } = await getDesignAndOptions();
  clampPlayerToSeason(player, design.seasonSettings);

  const lines: string[] = [];
  let showResult: GameShowResult | undefined;
  let ctaLinks: WatchCtaLink[] | undefined;

  const featuredGuest = getFeaturedGuestForTurn(
    options,
    player.current_week,
    player.day_in_week,
    design.seasonSettings.daysPerWeek,
  );

  const selectedBandIds = parseStringArrayJson(player.selected_band_ids_json);
  const selectedPromoIds = parseStringArrayJson(player.selected_promo_ids_json);

  if (action === "choose_venue") {
    const venueId = payload.venueId?.trim() ?? "";
    if (!venueId) {
      throw new Error("Choose a venue.");
    }

    const venue = findVenue(options, venueId);
    if (!venue) {
      throw new Error("Selected venue is unavailable.");
    }

    player.selected_venue_id = venue.id;
    lines.push(`Venue selected: ${venue.name}.`);
  }

  if (action === "book_band") {
    const bandId = payload.bandId?.trim() ?? "";
    if (!bandId) {
      throw new Error("Choose a band.");
    }

    const band = options.bands.find((candidate) => candidate.id === bandId);
    if (!band) {
      throw new Error("Selected band is unavailable.");
    }

    const updatedIds = [...selectedBandIds];
    const existingIndex = updatedIds.indexOf(bandId);

    if (existingIndex >= 0) {
      updatedIds.splice(existingIndex, 1);
      lines.push(`Removed ${band.stageName} from tonight's lineup.`);
    } else {
      if (updatedIds.length >= MAX_BANDS_PER_SHOW) {
        throw new Error(`You can book up to ${MAX_BANDS_PER_SHOW} bands per show.`);
      }

      updatedIds.push(bandId);
      lines.push(`Booked ${band.stageName}.`);
    }

    player.selected_band_ids_json = toArrayJson(updatedIds);
  }

  if (action === "set_promo") {
    const promoId = payload.promoId?.trim() ?? "";
    if (!promoId) {
      throw new Error("Choose a promo package.");
    }

    const promo = options.promoPackages.find((candidate) => candidate.id === promoId);
    if (!promo) {
      throw new Error("Selected promo package is unavailable.");
    }

    const updatedIds = [...selectedPromoIds];
    const existingIndex = updatedIds.indexOf(promoId);

    if (existingIndex >= 0) {
      updatedIds.splice(existingIndex, 1);
      lines.push(`Removed promo package: ${promo.label}.`);
    } else {
      updatedIds.push(promoId);
      lines.push(`Promo added: ${promo.label}.`);
    }

    player.selected_promo_ids_json = toArrayJson(updatedIds);
  }

  if (action === "run_show") {
    if (player.season_complete) {
      throw new Error("Season complete. Start a new player name to run another season.");
    }

    const venue = findVenue(options, player.selected_venue_id);
    if (!venue) {
      throw new Error("Choose a venue before running the show.");
    }

    const bookedBands = findBands(options, selectedBandIds);
    if (bookedBands.length < MAX_BANDS_PER_SHOW) {
      throw new Error(`Book ${MAX_BANDS_PER_SHOW} bands before running the show.`);
    }

    const promos = findPromos(options, selectedPromoIds);

    const outcome = calculateNightOutcome(
      venue,
      bookedBands,
      promos,
      design.sceneEvents,
      featuredGuest,
      design.featuredGuestBonus,
    );

    player.money += outcome.moneyDelta;
    player.fame = Math.max(0, player.fame + outcome.fameDelta);
    player.scene_cred = Math.max(0, player.scene_cred + outcome.sceneCredDelta);
    player.fan_trust = clamp(player.fan_trust + outcome.fanTrustDelta, 0, 100);

    player.selected_venue_id = null;
    player.selected_band_ids_json = "[]";
    player.selected_promo_ids_json = "[]";

    advanceCalendar(player, design.seasonSettings);

    lines.push(
      `Show complete at ${venue.name}: ${outcome.attendance}/${outcome.capacity} attendance, ${outcome.profit >= 0 ? "+" : ""}${outcome.profit} cash flow.`,
    );
    lines.push(
      `Fame ${outcome.fameDelta >= 0 ? "+" : ""}${outcome.fameDelta}, Scene Cred ${outcome.sceneCredDelta >= 0 ? "+" : ""}${outcome.sceneCredDelta}, Fan Trust ${outcome.fanTrustDelta >= 0 ? "+" : ""}${outcome.fanTrustDelta}.`,
    );

    if (outcome.featuredGuestName) {
      if (outcome.featuredGuestHit) {
        lines.push(`Featured Guest bonus triggered with ${outcome.featuredGuestName}.`);
      } else {
        lines.push(`Featured Guest this turn was ${outcome.featuredGuestName}.`);
      }
    }

    if (outcome.sceneEvent) {
      lines.push(outcome.sceneEvent.label);
    }

    const wasGreatShow = outcome.profit >= 0 && outcome.attendance >= Math.round(outcome.capacity * 0.75);
    if (wasGreatShow) {
      ctaLinks = await fetchArtistWatchLinks(bookedBands.map((band) => band.stageName));
      if (ctaLinks.length) {
        lines.push(`Great show momentum: watch ${ctaLinks[0].artistName} on the show.`);
      }
    }

    if (player.season_complete) {
      if (hasMetWinThreshold(player, design.seasonSettings)) {
        lines.push("Season complete: You earned the Headline Power reputation in St. John's!");
      } else {
        lines.push("Season complete. Build stronger lineups next run to capture a headline slot.");
      }
    } else {
      lines.push(`Next booking day: Week ${player.current_week}, Day ${player.day_in_week}.`);
    }

    showResult = {
      venueName: venue.name,
      attendance: outcome.attendance,
      capacity: outcome.capacity,
      revenue: outcome.revenue,
      costs: outcome.costs,
      profit: outcome.profit,
      featuredGuestName: outcome.featuredGuestName,
      featuredGuestHit: outcome.featuredGuestHit,
    };
  }

  const saved = await savePlayerRow(player);
  const featuredGuestOfWeek = getFeaturedGuestForTurn(
    options,
    saved.current_week,
    saved.day_in_week,
    design.seasonSettings.daysPerWeek,
  )?.stageName ?? null;

  return {
    player: mapPlayer(saved),
    lines,
    action,
    showResult,
    ctaLinks,
    featuredGuestOfWeek,
  };
}

export async function simulateNightPreview(input: SimulateNightInput): Promise<SimulateNightResult> {
  const design = normalizeGameDesign(input.design);
  const options = getBookingGameOptions(design);

  const venueId = input.venueId?.trim() ?? "";
  if (!venueId) {
    throw new Error("Choose a venue to simulate.");
  }

  const venue = findVenue(options, venueId);
  if (!venue) {
    throw new Error("Selected venue is unavailable.");
  }

  const bandIds = Array.isArray(input.bandIds) ? input.bandIds.map((id) => id.trim()).filter(Boolean) : [];
  const bookedBands = findBands(options, bandIds);
  if (!bookedBands.length) {
    throw new Error("Select at least one band to simulate.");
  }

  const promoIds = Array.isArray(input.promoIds) ? input.promoIds.map((id) => id.trim()).filter(Boolean) : [];
  const promos = findPromos(options, promoIds);

  const simWeek = clamp(Math.floor(Number(input.week ?? 1)), 1, design.seasonSettings.weeksPerSeason);
  const simDay = clamp(Math.floor(Number(input.day ?? 1)), 1, design.seasonSettings.daysPerWeek);

  const featuredGuest = getFeaturedGuestForTurn(
    options,
    simWeek,
    simDay,
    design.seasonSettings.daysPerWeek,
  );

  const outcome = calculateNightOutcome(
    venue,
    bookedBands,
    promos,
    design.sceneEvents,
    featuredGuest,
    design.featuredGuestBonus,
  );

  const lines: string[] = [
    `Simulation at ${venue.name}: ${outcome.attendance}/${outcome.capacity} attendance, ${outcome.profit >= 0 ? "+" : ""}${outcome.profit} projected profit.`,
    `Projected deltas -> Fame ${outcome.fameDelta >= 0 ? "+" : ""}${outcome.fameDelta}, Scene Cred ${outcome.sceneCredDelta >= 0 ? "+" : ""}${outcome.sceneCredDelta}, Fan Trust ${outcome.fanTrustDelta >= 0 ? "+" : ""}${outcome.fanTrustDelta}.`,
  ];

  if (outcome.featuredGuestName) {
    lines.push(
      outcome.featuredGuestHit
        ? `Featured Guest bonus applies: ${outcome.featuredGuestName}.`
        : `Featured Guest this slot is ${outcome.featuredGuestName} (not booked).`,
    );
  }

  if (outcome.sceneEvent) {
    lines.push(`Simulated scene event: ${outcome.sceneEvent.label}`);
  }

  return {
    showResult: {
      venueName: venue.name,
      attendance: outcome.attendance,
      capacity: outcome.capacity,
      revenue: outcome.revenue,
      costs: outcome.costs,
      profit: outcome.profit,
      featuredGuestName: outcome.featuredGuestName,
      featuredGuestHit: outcome.featuredGuestHit,
    },
    lines,
    featuredGuestOfWeek: featuredGuest?.stageName ?? null,
  };
}

export async function resetBookingPlayers(): Promise<number> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    WITH deleted AS (
      DELETE FROM booking_players
      RETURNING 1
    )
    SELECT COUNT(*)::int AS deleted_count FROM deleted;
  `) as { deleted_count: number }[];

  return rows[0]?.deleted_count ?? 0;
}
