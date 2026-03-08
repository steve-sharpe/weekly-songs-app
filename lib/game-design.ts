import { ensureSchema, getSql } from "@/lib/db";

const GAME_DESIGN_SETTING_KEY = "game_design_v1";

const MAX_RIVALS = 48;
const DEFAULT_CITY_NAME = "St. John's";
const DEFAULT_TITLE_GOAL = "Biggest Rock Star in St. John's";
const DEFAULT_INTRO_LINE =
  "George Street is buzzing tonight. Build your legend through local bookings.";
const DEFAULT_JAM_OFF_LINE =
  "Each show is a battle for turnout, scene cred, and headline status.";

export type GameRivalDesign = {
  id: string;
  stageName: string;
  hometown: string;
  genre: string;
  signatureMove: string;
  attack: number;
  defense: number;
  stamina: number;
  xpReward: number;
  goldReward: number;
  enabled: boolean;
};

export type GameDesignConfig = {
  cityName: string;
  titleGoal: string;
  introLine: string;
  jamOffLine: string;
  rivals: GameRivalDesign[];
  bands: BookingBandDesign[];
  venues: BookingVenueDesign[];
  promoPackages: BookingPromoPackage[];
  sceneEvents: SceneEventDesign[];
  featuredGuestBonus: FeaturedGuestBonusSettings;
  seasonSettings: SeasonSettings;
};

export type SceneEventDesign = {
  id: string;
  label: string;
  chance: number;
  moneyDelta: number;
  fameDelta: number;
  sceneCredDelta: number;
  fanTrustDelta: number;
  enabled: boolean;
};

export type FeaturedGuestBonusSettings = {
  enabled: boolean;
  moneyBonus: number;
  fameBonus: number;
  sceneCredBonus: number;
  fanTrustBonus: number;
};

export type SeasonSettings = {
  weeksPerSeason: number;
  daysPerWeek: number;
  winThresholdFame: number;
  winThresholdSceneCred: number;
  winThresholdFanTrust: number;
};

export type MusicalGuestSuggestion = {
  artistName: string;
  trackCount: number;
};

export type BookingBandDesign = {
  id: string;
  stageName: string;
  genre: string;
  draw: number;
  fee: number;
  reliability: number;
  crowdEnergy: number;
  enabled: boolean;
};

export type BookingVenueDesign = {
  id: string;
  name: string;
  capacity: number;
  baseRent: number;
  prestige: number;
  genreAffinity: Record<string, number>;
  enabled: boolean;
};

export type BookingPromoPackage = {
  id: string;
  label: string;
  cost: number;
  attendanceBoost: number;
};

export type BookingGameOptions = {
  bands: BookingBandDesign[];
  venues: BookingVenueDesign[];
  promoPackages: BookingPromoPackage[];
};

const DEFAULT_SCENE_EVENTS: SceneEventDesign[] = [
  {
    id: "local-blogger-hype",
    label: "A local blogger hypes your lineup before doors open.",
    chance: 0.16,
    moneyDelta: 0,
    fameDelta: 2,
    sceneCredDelta: 0,
    fanTrustDelta: 0,
    enabled: true,
  },
  {
    id: "stormy-weather",
    label: "Stormy weather keeps some fans at home.",
    chance: 0.12,
    moneyDelta: -15,
    fameDelta: 0,
    sceneCredDelta: 0,
    fanTrustDelta: -1,
    enabled: true,
  },
  {
    id: "show-shoutout",
    label: "A guest shoutout on The Hulk Caesar Show boosts your scene cred.",
    chance: 0.1,
    moneyDelta: 0,
    fameDelta: 1,
    sceneCredDelta: 3,
    fanTrustDelta: 0,
    enabled: true,
  },
  {
    id: "sound-tech-issue",
    label: "Unexpected sound tech issue adds extra costs.",
    chance: 0.1,
    moneyDelta: -20,
    fameDelta: 0,
    sceneCredDelta: 0,
    fanTrustDelta: 0,
    enabled: true,
  },
  {
    id: "dance-floor-buzz",
    label: "A packed dance floor drives merch and concession buzz.",
    chance: 0.14,
    moneyDelta: 18,
    fameDelta: 0,
    sceneCredDelta: 0,
    fanTrustDelta: 2,
    enabled: true,
  },
];

const DEFAULT_FEATURED_GUEST_BONUS: FeaturedGuestBonusSettings = {
  enabled: true,
  moneyBonus: 20,
  fameBonus: 2,
  sceneCredBonus: 2,
  fanTrustBonus: 1,
};

const DEFAULT_SEASON_SETTINGS: SeasonSettings = {
  weeksPerSeason: 4,
  daysPerWeek: 5,
  winThresholdFame: 90,
  winThresholdSceneCred: 25,
  winThresholdFanTrust: 55,
};

const DEFAULT_RIVALS: GameRivalDesign[] = [
  {
    id: "the-harbour-howl",
    stageName: "The Harbour Howl",
    hometown: "Downtown",
    genre: "Garage Rock",
    signatureMove: "Signal Flare Solo",
    attack: 8,
    defense: 5,
    stamina: 28,
    xpReward: 14,
    goldReward: 11,
    enabled: true,
  },
  {
    id: "east-end-echo",
    stageName: "East End Echo",
    hometown: "East End",
    genre: "Alt Pop",
    signatureMove: "Feedback Bloom",
    attack: 7,
    defense: 6,
    stamina: 30,
    xpReward: 15,
    goldReward: 10,
    enabled: true,
  },
  {
    id: "battery-boys",
    stageName: "Battery Boys",
    hometown: "Signal Hill",
    genre: "Punk",
    signatureMove: "Breakwater Blitz",
    attack: 9,
    defense: 4,
    stamina: 26,
    xpReward: 16,
    goldReward: 12,
    enabled: true,
  },
  {
    id: "quidi-vibe",
    stageName: "Quidi Vibe",
    hometown: "Quidi Vidi",
    genre: "Indie Rock",
    signatureMove: "Fogbank Crescendo",
    attack: 8,
    defense: 7,
    stamina: 31,
    xpReward: 17,
    goldReward: 13,
    enabled: true,
  },
];

const DEFAULT_BOOKING_VENUES: BookingVenueDesign[] = [
  {
    id: "alley-room",
    name: "Alley Room",
    capacity: 80,
    baseRent: 30,
    prestige: 1,
    genreAffinity: { punk: 0.2, rock: 0.15 },
    enabled: true,
  },
  {
    id: "harbour-hall",
    name: "Harbour Hall",
    capacity: 180,
    baseRent: 70,
    prestige: 2,
    genreAffinity: { rock: 0.18, indie: 0.12 },
    enabled: true,
  },
  {
    id: "downtown-electric",
    name: "Downtown Electric",
    capacity: 260,
    baseRent: 110,
    prestige: 3,
    genreAffinity: { alt: 0.2, pop: 0.1, indie: 0.1 },
    enabled: true,
  },
  {
    id: "quidi-stage",
    name: "Quidi Stage",
    capacity: 420,
    baseRent: 180,
    prestige: 4,
    genreAffinity: { rock: 0.15, folk: 0.12, indie: 0.15 },
    enabled: true,
  },
  {
    id: "signal-dome",
    name: "Signal Dome",
    capacity: 520,
    baseRent: 220,
    prestige: 5,
    genreAffinity: { rock: 0.12, pop: 0.12, alt: 0.12 },
    enabled: true,
  },
];

const DEFAULT_PROMO_PACKAGES: BookingPromoPackage[] = [
  { id: "posters", label: "Posters", cost: 10, attendanceBoost: 0.06 },
  { id: "social-boost", label: "Social Boost", cost: 20, attendanceBoost: 0.12 },
  { id: "radio", label: "Radio Shoutout", cost: 35, attendanceBoost: 0.18 },
  { id: "street-team", label: "Street Team", cost: 50, attendanceBoost: 0.24 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return fallback;
  }

  return cleaned.slice(0, maxLength);
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

function normalizeDecimal(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

function toRivalId(stageName: string, index: number): string {
  const slug = stageName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return slug || `rival-${index + 1}`;
}

function normalizeRival(input: unknown, index: number): GameRivalDesign {
  const source = input && typeof input === "object" ? (input as Partial<GameRivalDesign>) : {};

  const stageName = normalizeText(source.stageName, `Guest ${index + 1}`, 64);
  const hometown = normalizeText(source.hometown, "St. John's", 64);
  const genre = normalizeText(source.genre, "Rock", 48);
  const signatureMove = normalizeText(source.signatureMove, "Amp Surge", 72);

  return {
    id: normalizeText(source.id, toRivalId(stageName, index), 48),
    stageName,
    hometown,
    genre,
    signatureMove,
    attack: normalizeNumber(source.attack, 8, 3, 40),
    defense: normalizeNumber(source.defense, 5, 1, 40),
    stamina: normalizeNumber(source.stamina, 28, 12, 180),
    xpReward: normalizeNumber(source.xpReward, 14, 2, 400),
    goldReward: normalizeNumber(source.goldReward, 10, 0, 400),
    enabled: source.enabled !== false,
  };
}

function normalizeRivals(input: unknown): GameRivalDesign[] {
  if (!Array.isArray(input)) {
    return DEFAULT_RIVALS;
  }

  const rivals = input.slice(0, MAX_RIVALS).map((rival, index) => normalizeRival(rival, index));
  if (!rivals.length) {
    return DEFAULT_RIVALS;
  }

  const used = new Set<string>();
  return rivals.map((rival, index) => {
    let candidate = rival.id || toRivalId(rival.stageName, index);
    if (used.has(candidate)) {
      candidate = `${candidate}-${index + 1}`;
    }
    used.add(candidate);

    return {
      ...rival,
      id: candidate,
    };
  });
}

export function normalizeGameDesign(input: unknown): GameDesignConfig {
  const source = input && typeof input === "object" ? (input as Partial<GameDesignConfig>) : {};

  const venuesFromInput = normalizeVenuesFromUnknown((source as { venues?: unknown }).venues);
  const promosFromInput = normalizePromosFromUnknown(
    (source as { promoPackages?: unknown }).promoPackages,
  );
  const bandsFromInput = normalizeBandsFromUnknown((source as { bands?: unknown }).bands);
  const sceneEventsFromInput = normalizeSceneEventsFromUnknown(
    (source as { sceneEvents?: unknown }).sceneEvents,
  );
  const featuredGuestBonus = normalizeFeaturedGuestBonus(
    (source as { featuredGuestBonus?: unknown }).featuredGuestBonus,
  );
  const seasonSettings = normalizeSeasonSettings(
    (source as { seasonSettings?: unknown }).seasonSettings,
  );

  const fallbackVenues = DEFAULT_BOOKING_VENUES.map((venue) => ({
    ...venue,
    genreAffinity: { ...venue.genreAffinity },
  }));
  const fallbackPromos = DEFAULT_PROMO_PACKAGES.map((promo) => ({ ...promo }));

  return {
    cityName: normalizeText(source.cityName, DEFAULT_CITY_NAME, 64),
    titleGoal: normalizeText(source.titleGoal, DEFAULT_TITLE_GOAL, 80),
    introLine: normalizeText(source.introLine, DEFAULT_INTRO_LINE, 220),
    jamOffLine: normalizeText(source.jamOffLine, DEFAULT_JAM_OFF_LINE, 220),
    rivals: normalizeRivals(source.rivals),
    bands: bandsFromInput,
    venues: venuesFromInput.length ? venuesFromInput : fallbackVenues,
    promoPackages: promosFromInput.length ? promosFromInput : fallbackPromos,
    sceneEvents: sceneEventsFromInput,
    featuredGuestBonus,
    seasonSettings,
  };
}

function defaultDesign(): GameDesignConfig {
  return normalizeGameDesign({});
}

export async function getGameDesign(): Promise<GameDesignConfig> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT value_text
    FROM app_settings
    WHERE key = ${GAME_DESIGN_SETTING_KEY}
    LIMIT 1;
  `) as { value_text: string }[];

  const raw = rows[0]?.value_text;
  if (!raw) {
    return defaultDesign();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeGameDesign(parsed);
  } catch {
    return defaultDesign();
  }
}

export async function saveGameDesign(input: unknown): Promise<GameDesignConfig> {
  await ensureSchema();
  const sql = getSql();

  const normalized = normalizeGameDesign(input);

  await sql`
    INSERT INTO app_settings (key, value_text, updated_at)
    VALUES (${GAME_DESIGN_SETTING_KEY}, ${JSON.stringify(normalized)}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value_text = EXCLUDED.value_text,
      updated_at = NOW();
  `;

  return normalized;
}

export async function getMusicalGuestSuggestions(): Promise<MusicalGuestSuggestion[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT
      TRIM(artist_name) AS artist_name,
      COUNT(*)::int AS track_count
    FROM tracks
    WHERE is_active = TRUE
      AND artist_name IS NOT NULL
      AND TRIM(artist_name) <> ''
    GROUP BY TRIM(artist_name)
    ORDER BY COUNT(*) DESC, TRIM(artist_name) ASC
    LIMIT 120;
  `) as { artist_name: string; track_count: number }[];

  return rows.map((row) => ({
    artistName: row.artist_name,
    trackCount: row.track_count,
  }));
}

function normalizeGenreKey(value: string): string {
  return value.trim().toLowerCase();
}

function genreToAffinityKey(genre: string): string {
  return normalizeGenreKey(genre.split(/\s+/)[0] ?? genre);
}

function getBandsFromRivals(design: GameDesignConfig): BookingBandDesign[] {
  return design.rivals.map((rival, index) => ({
    id: rival.id || `band-${index + 1}`,
    stageName: rival.stageName,
    genre: rival.genre,
    draw: clamp(20 + rival.attack * 6 + rival.defense * 2, 20, 140),
    fee: clamp(20 + rival.xpReward * 2, 20, 220),
    reliability: clamp(58 + rival.defense * 4, 55, 95),
    crowdEnergy: clamp(45 + rival.attack * 4, 40, 100),
    enabled: rival.enabled,
  }));
}

function normalizeBandsFromUnknown(input: unknown): BookingBandDesign[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawBand, index) => {
      const band = rawBand && typeof rawBand === "object" ? (rawBand as Partial<BookingBandDesign>) : {};

      const stageName = normalizeText(band.stageName, `Band ${index + 1}`, 64);

      return {
        id: normalizeText(band.id, toRivalId(stageName, index), 48),
        stageName,
        genre: normalizeText(band.genre, "Rock", 48),
        draw: normalizeNumber(band.draw, 60, 20, 220),
        fee: normalizeNumber(band.fee, 70, 10, 400),
        reliability: normalizeNumber(band.reliability, 72, 40, 99),
        crowdEnergy: normalizeNumber(band.crowdEnergy, 65, 20, 100),
        enabled: band.enabled !== false,
      } satisfies BookingBandDesign;
    })
    .filter((band) => band.stageName.trim().length > 0);
}

function normalizeVenuesFromUnknown(input: unknown): BookingVenueDesign[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawVenue, index) => {
      const venue = rawVenue && typeof rawVenue === "object" ? (rawVenue as Partial<BookingVenueDesign>) : {};
      const name = normalizeText(venue.name, `Venue ${index + 1}`, 72);

      return {
        id: normalizeText(venue.id, toRivalId(name, index), 48),
        name,
        capacity: normalizeNumber(venue.capacity, 180, 40, 2000),
        baseRent: normalizeNumber(venue.baseRent, 80, 0, 1200),
        prestige: normalizeNumber(venue.prestige, 2, 1, 8),
        genreAffinity:
          venue.genreAffinity && typeof venue.genreAffinity === "object"
            ? Object.fromEntries(
                Object.entries(venue.genreAffinity)
                  .filter(([key, value]) => key && Number.isFinite(Number(value)))
                  .map(([key, value]) => [normalizeGenreKey(key), clamp(Number(value), -0.4, 0.6)]),
              )
            : {},
        enabled: venue.enabled !== false,
      } satisfies BookingVenueDesign;
    })
    .filter((venue) => venue.name.trim().length > 0);
}

function normalizePromosFromUnknown(input: unknown): BookingPromoPackage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawPromo, index) => {
      const promo = rawPromo && typeof rawPromo === "object" ? (rawPromo as Partial<BookingPromoPackage>) : {};
      const label = normalizeText(promo.label, `Promo ${index + 1}`, 48);

      return {
        id: normalizeText(promo.id, toRivalId(label, index), 48),
        label,
        cost: normalizeNumber(promo.cost, 20, 0, 1000),
        attendanceBoost: clamp(Number(promo.attendanceBoost ?? 0.1), 0, 0.8),
      } satisfies BookingPromoPackage;
    })
    .filter((promo) => promo.label.trim().length > 0);
}

function normalizeSceneEventsFromUnknown(input: unknown): SceneEventDesign[] {
  if (!Array.isArray(input)) {
    return DEFAULT_SCENE_EVENTS.map((event) => ({ ...event }));
  }

  const normalized = input
    .map((rawEvent, index) => {
      const event = rawEvent && typeof rawEvent === "object" ? (rawEvent as Partial<SceneEventDesign>) : {};
      const label = normalizeText(event.label, `Scene event ${index + 1}`, 180);

      return {
        id: normalizeText(event.id, toRivalId(label, index), 48),
        label,
        chance: normalizeDecimal(event.chance, 0.1, 0, 1),
        moneyDelta: normalizeNumber(event.moneyDelta, 0, -500, 500),
        fameDelta: normalizeNumber(event.fameDelta, 0, -20, 20),
        sceneCredDelta: normalizeNumber(event.sceneCredDelta, 0, -20, 20),
        fanTrustDelta: normalizeNumber(event.fanTrustDelta, 0, -20, 20),
        enabled: event.enabled !== false,
      } satisfies SceneEventDesign;
    })
    .filter((event) => event.label.trim().length > 0);

  return normalized.length ? normalized : DEFAULT_SCENE_EVENTS.map((event) => ({ ...event }));
}

function normalizeFeaturedGuestBonus(input: unknown): FeaturedGuestBonusSettings {
  const source = input && typeof input === "object" ? (input as Partial<FeaturedGuestBonusSettings>) : {};

  return {
    enabled: source.enabled !== false,
    moneyBonus: normalizeNumber(source.moneyBonus, DEFAULT_FEATURED_GUEST_BONUS.moneyBonus, -300, 300),
    fameBonus: normalizeNumber(source.fameBonus, DEFAULT_FEATURED_GUEST_BONUS.fameBonus, -20, 20),
    sceneCredBonus: normalizeNumber(source.sceneCredBonus, DEFAULT_FEATURED_GUEST_BONUS.sceneCredBonus, -20, 20),
    fanTrustBonus: normalizeNumber(source.fanTrustBonus, DEFAULT_FEATURED_GUEST_BONUS.fanTrustBonus, -20, 20),
  };
}

function normalizeSeasonSettings(input: unknown): SeasonSettings {
  const source = input && typeof input === "object" ? (input as Partial<SeasonSettings>) : {};

  return {
    weeksPerSeason: normalizeNumber(source.weeksPerSeason, DEFAULT_SEASON_SETTINGS.weeksPerSeason, 1, 12),
    daysPerWeek: normalizeNumber(source.daysPerWeek, DEFAULT_SEASON_SETTINGS.daysPerWeek, 1, 7),
    winThresholdFame: normalizeNumber(source.winThresholdFame, DEFAULT_SEASON_SETTINGS.winThresholdFame, 0, 250),
    winThresholdSceneCred: normalizeNumber(source.winThresholdSceneCred, DEFAULT_SEASON_SETTINGS.winThresholdSceneCred, 0, 120),
    winThresholdFanTrust: normalizeNumber(source.winThresholdFanTrust, DEFAULT_SEASON_SETTINGS.winThresholdFanTrust, 0, 100),
  };
}

export function getBookingGameOptions(design: GameDesignConfig): BookingGameOptions {
  const configuredBands = design.bands.filter((band) => band.enabled);
  const configuredVenues = design.venues.filter((venue) => venue.enabled);
  const configuredPromos = design.promoPackages;

  const fallbackBands = getBandsFromRivals(design);

  const bands = configuredBands.length ? configuredBands : fallbackBands;

  const fallbackVenues = DEFAULT_BOOKING_VENUES.filter((venue) => venue.enabled).map((venue) => ({
    ...venue,
    genreAffinity: { ...venue.genreAffinity },
  }));

  const fallbackPromos = DEFAULT_PROMO_PACKAGES.map((promo) => ({ ...promo }));

  return {
    bands: bands.length ? bands : fallbackBands,
    venues: configuredVenues.length ? configuredVenues : fallbackVenues,
    promoPackages: configuredPromos.length ? configuredPromos : fallbackPromos,
  };
}

export function getGenreFitForVenue(venue: BookingVenueDesign, genre: string): number {
  const key = genreToAffinityKey(genre);
  return clamp(venue.genreAffinity[key] ?? 0, -0.3, 0.4);
}
