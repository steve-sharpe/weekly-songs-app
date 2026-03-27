import { ensureSchema, getSql } from "@/lib/db";
import { type BookingVenueDesign } from "@/lib/game-design";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ADVENTURE_DESIGN_SETTING_KEY = "adventure_game_design_v1";

const DEFAULT_BUDGET = 50;
const DEFAULT_HYPE = 0;
const DEFAULT_CHAOS = 0;

export type AdventureEffects = {
  budget: number;
  hype: number;
  chaos: number;
};

export type AdventureDifficulty = {
  minProblemRounds: number;
  maxProblemRounds: number;
  basePressureMultiplier: number;
  pressureStepPerRound: number;
  maxPressureMultiplier: number;
  hypeBonusThreshold: number;
  chaosBonusThreshold: number;
};

export type AdventureVenue = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

export type AdventureBand = {
  id: string;
  name: string;
  genre: string;
  description: string;
  image: string;
  caption: string;
  specialEvent: string;
  effects: AdventureEffects;
  enabled: boolean;
};

export type AdventureStageDesign = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

export type AdventurePromotion = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

export type AdventureExtraStageOption = {
  id: string;
  name: string;
  description: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
  enabled: boolean;
};

export type AdventureExtraStage = {
  id: string;
  title: string;
  prompt: string;
  description: string;
  enabled: boolean;
  options: AdventureExtraStageOption[];
};

export type AdventureProblemChoice = {
  id: string;
  text: string;
  image: string;
  caption: string;
  effects: AdventureEffects;
};

export type AdventureProblemEvent = {
  id: string;
  title: string;
  description: string;
  image: string;
  caption: string;
  enabled: boolean;
  choices: AdventureProblemChoice[];
};

export type AdventureEnding = {
  id: string;
  title: string;
  summary: string;
  image: string;
  caption: string;
  minHype: number;
  maxHype: number;
  minChaos: number;
  maxChaos: number;
  minBudget: number;
  maxBudget: number;
  priority: number;
};

export type AdventureDesignConfig = {
  gameTitle: string;
  cityName: string;
  introLine: string;
  introImage: string;
  introCaption: string;
  startingBudget: number;
  startingHype: number;
  startingChaos: number;
  difficulty: AdventureDifficulty;
  venues: AdventureVenue[];
  bands: AdventureBand[];
  stageDesigns: AdventureStageDesign[];
  promotionMethods: AdventurePromotion[];
  extraStages: AdventureExtraStage[];
  problemEvents: AdventureProblemEvent[];
  endings: AdventureEnding[];
};

type AdventureTrackBandRow = {
  artist_name: string;
  track_count: number;
  genre: string | null;
  photo_url: string | null;
};

const FALLBACK_SPREADSHEET_VENUES: BookingVenueDesign[] = [
  {
    id: "venue-01",
    name: "Jag Soundhouse",
    photoUrl: "",
    capacity: 1600,
    baseRent: 600,
    prestige: 5,
    genreAffinity: { rock: 0.14, pop: 0.12, alt: 0.1 },
    enabled: true,
  },
  {
    id: "venue-02",
    name: "The Majestic",
    photoUrl: "",
    capacity: 300,
    baseRent: 200,
    prestige: 4,
    genreAffinity: { alt: 0.15, indie: 0.12, rock: 0.08 },
    enabled: true,
  },
  {
    id: "venue-03",
    name: "The Rockhouse",
    photoUrl: "",
    capacity: 150,
    baseRent: 150,
    prestige: 4,
    genreAffinity: { rock: 0.16, punk: 0.12, indie: 0.08 },
    enabled: true,
  },
  {
    id: "venue-04",
    name: "The Ship Inn",
    photoUrl: "",
    capacity: 100,
    baseRent: 120,
    prestige: 3,
    genreAffinity: { indie: 0.14, pop: 0.1, folk: 0.06 },
    enabled: true,
  },
  {
    id: "venue-05",
    name: "The Black Sheep",
    photoUrl: "",
    capacity: 100,
    baseRent: 80,
    prestige: 2,
    genreAffinity: { punk: 0.14, garage: 0.1, rock: 0.08 },
    enabled: true,
  },
  {
    id: "venue-06",
    name: "The Hulk Caesar Show",
    photoUrl: "",
    capacity: 25,
    baseRent: 15,
    prestige: 1,
    genreAffinity: { punk: 0.16, rock: 0.12, indie: 0.04 },
    enabled: true,
  },
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

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

function normalizeDecimal(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
}

function toSlug(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return slug || fallback;
}

function toAdventureBandFromTrackRow(row: AdventureTrackBandRow, index: number): AdventureBand {
  const trackCount = Number(row.track_count) || 1;
  const artistName = normalizeText(row.artist_name, `Band ${index + 1}`, 80);
  const genre = normalizeText(row.genre ?? "rock", "rock", 40);

  return {
    id: toSlug(artistName, `song-band-${index + 1}`),
    name: artistName,
    genre,
    description: `${artistName} brings ${genre.toLowerCase()} energy with crowd draw ${clamp(45 + trackCount * 14, 45, 220)}.`,
    image: normalizeText(row.photo_url ?? "", "", 1500000),
    caption: `${artistName} is about to make George Street very loud.`,
    specialEvent: "",
    effects: {
      budget: 20,
      hype: clamp(14 + trackCount * 3, 14, 45),
      chaos: clamp(3 + Math.floor(trackCount / 2), 3, 20),
    },
    enabled: true,
  };
}

function toAdventureVenueFromBookingVenue(
  venue: BookingVenueDesign,
  index: number,
): AdventureVenue {
  const venueName = normalizeText(venue.name, `Venue ${index + 1}`, 80);

  return {
    id: normalizeText(venue.id, toSlug(venueName, `venue-${index + 1}`), 48),
    name: venueName,
    description: `${venueName} seats about ${venue.capacity} and carries prestige ${venue.prestige}.`,
    capacity: clamp(venue.capacity, 20, 10000),
    image: normalizeText(venue.photoUrl ?? "", "", 1500000),
    caption: `${venueName} opens its doors for your big night.`,
    effects: {
      budget: clamp(Math.round(35 - venue.baseRent / 6 + venue.capacity / 80), -30, 25),
      hype: clamp(Math.round(venue.prestige * 4 + venue.capacity / 140 - 3), -8, 22),
      chaos: clamp(Math.round(venue.capacity / 120 - venue.prestige * 2), -10, 20),
    },
    enabled: venue.enabled !== false,
  };
}

function parseSpreadsheetCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseSpreadsheetVenueRows(csvText: string): BookingVenueDesign[] {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((line, index) => {
    const [id, name, capacity, baseRent, prestige, enabled] = parseSpreadsheetCsvLine(line);

    return {
      id: normalizeText(id, `venue-${index + 1}`, 48),
      name: normalizeText(name, `Venue ${index + 1}`, 80),
      photoUrl: "",
      capacity: normalizeNumber(capacity, 180, 40, 6000),
      baseRent: normalizeNumber(baseRent, 80, 0, 5000),
      prestige: normalizeNumber(prestige, 2, 1, 8),
      genreAffinity: {},
      enabled: enabled.toLowerCase() !== "false",
    } satisfies BookingVenueDesign;
  });
}

async function getSpreadsheetTemplateVenues(): Promise<BookingVenueDesign[]> {
  try {
    const filePath = join(process.cwd(), "docs", "csv-templates", "venues-ranked-best-to-worst.csv");
    const csv = await readFile(filePath, "utf8");
    const parsed = parseSpreadsheetVenueRows(csv);
    return parsed.length ? parsed : FALLBACK_SPREADSHEET_VENUES;
  } catch {
    return FALLBACK_SPREADSHEET_VENUES;
  }
}

function mergeSpreadsheetVenuesWithSelection(
  spreadsheetVenues: AdventureVenue[],
  configuredVenues: AdventureVenue[],
): AdventureVenue[] {
  const configuredById = new Map(configuredVenues.map((venue) => [venue.id, venue]));

  return spreadsheetVenues.map((venue) => {
    const configured = configuredById.get(venue.id);
    if (!configured) {
      return venue;
    }

    return {
      ...venue,
      enabled: configured.enabled !== false,
      effects: configured.effects,
      description: configured.description || venue.description,
      caption: configured.caption || venue.caption,
    };
  });
}

export async function getAdventureBandsFromSongs(): Promise<AdventureBand[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    WITH artist_source AS (
      SELECT
        LOWER(TRIM(artist_name)) AS artist_key,
        TRIM(artist_name) AS artist_name,
        NULLIF(TRIM(genre), '') AS genre,
        NULLIF(TRIM(photo_url), '') AS photo_url,
        created_time,
        id
      FROM tracks
      WHERE is_active = TRUE
        AND artist_name IS NOT NULL
        AND TRIM(artist_name) <> ''
    ),
    artist_rollup AS (
      SELECT
        artist_key,
        COUNT(*)::int AS track_count
      FROM artist_source
      GROUP BY artist_key
    ),
    latest_artist_name AS (
      SELECT DISTINCT ON (artist_key)
        artist_key,
        artist_name
      FROM artist_source
      ORDER BY artist_key, created_time DESC NULLS LAST, id DESC
    ),
    latest_genre AS (
      SELECT DISTINCT ON (artist_key)
        artist_key,
        genre
      FROM artist_source
      WHERE genre IS NOT NULL
      ORDER BY artist_key, created_time DESC NULLS LAST, id DESC
    ),
    latest_photo AS (
      SELECT DISTINCT ON (artist_key)
        artist_key,
        photo_url
      FROM artist_source
      WHERE photo_url IS NOT NULL
      ORDER BY artist_key, created_time DESC NULLS LAST, id DESC
    )
    SELECT
      latest_artist_name.artist_name,
      artist_rollup.track_count,
      latest_genre.genre,
      latest_photo.photo_url
    FROM artist_rollup
    JOIN latest_artist_name
      ON latest_artist_name.artist_key = artist_rollup.artist_key
    LEFT JOIN latest_genre
      ON latest_genre.artist_key = artist_rollup.artist_key
    LEFT JOIN latest_photo
      ON latest_photo.artist_key = artist_rollup.artist_key
    ORDER BY LOWER(latest_artist_name.artist_name) ASC
    LIMIT 180;
  `) as AdventureTrackBandRow[];

  return rows.map((row, index) => toAdventureBandFromTrackRow(row, index));
}

function mergeSongBandsWithSelection(
  songBands: AdventureBand[],
  configuredBands: AdventureBand[],
): AdventureBand[] {
  const configuredById = new Map(configuredBands.map((band) => [band.id, band]));

  return songBands.map((band) => {
    const configured = configuredById.get(band.id);
    if (!configured) {
      return band;
    }

    return {
      ...band,
      enabled: configured.enabled !== false,
      specialEvent: configured.specialEvent,
      effects: configured.effects,
      description: configured.description || band.description,
      caption: configured.caption || band.caption,
    };
  });
}

export async function getAdventureDesignWithSongBands(): Promise<AdventureDesignConfig> {
  const [design, songBands, bookingSourceVenues] = await Promise.all([
    getAdventureDesign(),
    getAdventureBandsFromSongs(),
    getSpreadsheetTemplateVenues(),
  ]);

  const spreadsheetVenues = bookingSourceVenues.map((venue, index) =>
    toAdventureVenueFromBookingVenue(venue, index),
  );

  let runtimeDesign = design;

  if (songBands.length) {
    runtimeDesign = {
      ...runtimeDesign,
      bands: mergeSongBandsWithSelection(songBands, runtimeDesign.bands),
    };
  }

  if (spreadsheetVenues.length) {
    runtimeDesign = {
      ...runtimeDesign,
      venues: mergeSpreadsheetVenuesWithSelection(spreadsheetVenues, runtimeDesign.venues),
    };
  }

  return runtimeDesign;
}

function normalizeEffects(input: unknown): AdventureEffects {
  const source = input && typeof input === "object" ? (input as Partial<AdventureEffects>) : {};

  return {
    budget: normalizeNumber(source.budget, 0, -200, 200),
    hype: normalizeNumber(source.hype, 0, -200, 200),
    chaos: normalizeNumber(source.chaos, 0, -200, 200),
  };
}

function normalizeDifficulty(input: unknown): AdventureDifficulty {
  const source = input && typeof input === "object" ? (input as Partial<AdventureDifficulty>) : {};

  const minProblemRounds = normalizeNumber(source.minProblemRounds, 2, 1, 8);
  const maxProblemRoundsRaw = normalizeNumber(source.maxProblemRounds, 5, 1, 12);
  const maxProblemRounds = Math.max(minProblemRounds, maxProblemRoundsRaw);

  return {
    minProblemRounds,
    maxProblemRounds,
    basePressureMultiplier: normalizeDecimal(source.basePressureMultiplier, 1, 0.5, 3),
    pressureStepPerRound: normalizeDecimal(source.pressureStepPerRound, 0.2, 0, 1),
    maxPressureMultiplier: normalizeDecimal(source.maxPressureMultiplier, 2, 0.5, 4),
    hypeBonusThreshold: normalizeNumber(source.hypeBonusThreshold, 60, -200, 200),
    chaosBonusThreshold: normalizeNumber(source.chaosBonusThreshold, 45, -200, 200),
  };
}

function normalizeVenue(input: unknown, index: number): AdventureVenue {
  const source = input && typeof input === "object" ? (input as Partial<AdventureVenue>) : {};
  const name = normalizeText(source.name, `Venue ${index + 1}`, 80);

  return {
    id: normalizeText(source.id, toSlug(name, `venue-${index + 1}`), 48),
    name,
    description: normalizeText(source.description, "A local spot with character.", 220),
    capacity: normalizeNumber(source.capacity, 120, 20, 10000),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "A big decision for tonight's show.", 280),
    effects: normalizeEffects(source.effects),
    enabled: source.enabled !== false,
  };
}

function normalizeBand(input: unknown, index: number): AdventureBand {
  const source = input && typeof input === "object" ? (input as Partial<AdventureBand>) : {};
  const name = normalizeText(source.name, `Band ${index + 1}`, 80);

  return {
    id: normalizeText(source.id, toSlug(name, `band-${index + 1}`), 48),
    name,
    genre: normalizeText(source.genre, "rock", 40),
    description: normalizeText(source.description, "They can lift the room, or break it.", 220),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "The crowd reacts immediately.", 280),
    specialEvent: normalizeText(source.specialEvent, "", 80),
    effects: normalizeEffects(source.effects),
    enabled: source.enabled !== false,
  };
}

function normalizeStageDesign(input: unknown, index: number): AdventureStageDesign {
  const source =
    input && typeof input === "object" ? (input as Partial<AdventureStageDesign>) : {};
  const name = normalizeText(source.name, `Stage Design ${index + 1}`, 80);

  return {
    id: normalizeText(source.id, toSlug(name, `stage-${index + 1}`), 48),
    name,
    description: normalizeText(source.description, "Visual choices with consequences.", 220),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "The room gets a fresh look.", 280),
    effects: normalizeEffects(source.effects),
    enabled: source.enabled !== false,
  };
}

function normalizePromotion(input: unknown, index: number): AdventurePromotion {
  const source = input && typeof input === "object" ? (input as Partial<AdventurePromotion>) : {};
  const name = normalizeText(source.name, `Promotion ${index + 1}`, 80);

  return {
    id: normalizeText(source.id, toSlug(name, `promo-${index + 1}`), 48),
    name,
    description: normalizeText(source.description, "Get people talking before doors open.", 220),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "Your plan starts spreading fast.", 280),
    effects: normalizeEffects(source.effects),
    enabled: source.enabled !== false,
  };
}

function normalizeExtraStageOption(input: unknown, index: number): AdventureExtraStageOption {
  const source =
    input && typeof input === "object" ? (input as Partial<AdventureExtraStageOption>) : {};
  const name = normalizeText(source.name, `Option ${index + 1}`, 90);

  return {
    id: normalizeText(source.id, toSlug(name, `extra-option-${index + 1}`), 48),
    name,
    description: normalizeText(source.description, "A bold move with real consequences.", 240),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "The room reacts to your choice.", 280),
    effects: normalizeEffects(source.effects),
    enabled: source.enabled !== false,
  };
}

function normalizeExtraStage(input: unknown, index: number): AdventureExtraStage {
  const source = input && typeof input === "object" ? (input as Partial<AdventureExtraStage>) : {};
  const title = normalizeText(source.title, `Extra Stage ${index + 1}`, 100);

  const options = Array.isArray(source.options)
    ? source.options.slice(0, 12).map((option, optionIndex) => normalizeExtraStageOption(option, optionIndex))
    : [];

  return {
    id: normalizeText(source.id, toSlug(title, `extra-stage-${index + 1}`), 48),
    title,
    prompt: normalizeText(source.prompt, "Pick one path.", 220),
    description: normalizeText(source.description, "An extra branch in your concert story.", 260),
    enabled: source.enabled !== false,
    options: options.length >= 2 ? options : [
      {
        id: "safe-choice",
        name: "Play It Safe",
        description: "Reliable option that keeps the night stable.",
        image: "",
        caption: "You choose consistency over chaos.",
        effects: { budget: -4, hype: 6, chaos: -2 },
        enabled: true,
      },
      {
        id: "wild-choice",
        name: "Take A Wild Swing",
        description: "High-risk move for a memorable payoff.",
        image: "",
        caption: "The room gasps, then leans in.",
        effects: { budget: -8, hype: 14, chaos: 10 },
        enabled: true,
      },
    ],
  };
}

function normalizeProblemChoice(input: unknown, index: number): AdventureProblemChoice {
  const source =
    input && typeof input === "object" ? (input as Partial<AdventureProblemChoice>) : {};
  const text = normalizeText(source.text, `Choice ${index + 1}`, 120);

  return {
    id: normalizeText(source.id, toSlug(text, `choice-${index + 1}`), 48),
    text,
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "You commit to the bit.", 280),
    effects: normalizeEffects(source.effects),
  };
}

function normalizeProblemEvent(input: unknown, index: number): AdventureProblemEvent {
  const source = input && typeof input === "object" ? (input as Partial<AdventureProblemEvent>) : {};
  const title = normalizeText(source.title, `Problem Event ${index + 1}`, 120);

  const choices = Array.isArray(source.choices)
    ? source.choices.slice(0, 8).map((choice, choiceIndex) => normalizeProblemChoice(choice, choiceIndex))
    : [];

  return {
    id: normalizeText(source.id, toSlug(title, `problem-${index + 1}`), 48),
    title,
    description: normalizeText(source.description, "Something ridiculous happens before showtime.", 260),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "The room collectively says: this can still work.", 280),
    enabled: source.enabled !== false,
    choices:
      choices.length >= 2
        ? choices
        : [
            {
              id: "delay-show",
              text: "Delay the show and blame the weather map.",
              image: "",
              caption: "Fans grumble, but you buy time.",
              effects: { budget: 0, hype: -8, chaos: 10 },
            },
            {
              id: "free-snacks",
              text: "Offer free snacks and keep the crowd smiling.",
              image: "",
              caption: "The audience forgives almost everything for snacks.",
              effects: { budget: -10, hype: 8, chaos: -4 },
            },
          ],
  };
}

function normalizeEnding(input: unknown, index: number): AdventureEnding {
  const source = input && typeof input === "object" ? (input as Partial<AdventureEnding>) : {};

  return {
    id: normalizeText(source.id, `ending-${index + 1}`, 48),
    title: normalizeText(source.title, `Ending ${index + 1}`, 80),
    summary: normalizeText(source.summary, "The night becomes local legend material.", 320),
    image: normalizeText(source.image, "", 1500000),
    caption: normalizeText(source.caption, "You survived another promoter night.", 280),
    minHype: normalizeNumber(source.minHype, -999, -999, 999),
    maxHype: normalizeNumber(source.maxHype, 999, -999, 999),
    minChaos: normalizeNumber(source.minChaos, -999, -999, 999),
    maxChaos: normalizeNumber(source.maxChaos, 999, -999, 999),
    minBudget: normalizeNumber(source.minBudget, -999, -999, 999),
    maxBudget: normalizeNumber(source.maxBudget, 999, -999, 999),
    priority: normalizeNumber(source.priority, index + 1, 1, 999),
  };
}

const DEFAULT_ENDINGS: AdventureEnding[] = [
  {
    id: "legendary-success",
    title: "Legendary Success",
    summary:
      "Your show at {venueName} featuring {bandNames} becomes legendary. People talk about it for years.",
    image: "",
    caption: "The encore lasts longer than the ferry line.",
    minHype: 80,
    maxHype: 999,
    minChaos: -999,
    maxChaos: 39,
    minBudget: -999,
    maxBudget: 999,
    priority: 1,
  },
  {
    id: "great-show",
    title: "Great Show",
    summary: "You pull off a strong night and the city wants your next event immediately.",
    image: "",
    caption: "The crowd leaves smiling and slightly hoarse.",
    minHype: 50,
    maxHype: 999,
    minChaos: -999,
    maxChaos: 59,
    minBudget: -999,
    maxBudget: 999,
    priority: 2,
  },
  {
    id: "total-disaster",
    title: "Total Disaster",
    summary: "The show at {venueName} descends into total chaos before the second song.",
    image: "",
    caption: "At least everyone got a story out of it.",
    minHype: -999,
    maxHype: 999,
    minChaos: 80,
    maxChaos: 999,
    minBudget: -999,
    maxBudget: 999,
    priority: 3,
  },
  {
    id: "nobody-shows",
    title: "Nobody Shows Up",
    summary: "You booked the room, but hype never arrived. It's just you and the sound tech.",
    image: "",
    caption: "Even the fog machine seems disappointed.",
    minHype: -999,
    maxHype: 19,
    minChaos: -999,
    maxChaos: 999,
    minBudget: -999,
    maxBudget: 999,
    priority: 4,
  },
  {
    id: "chaotic-but-fun",
    title: "Chaotic But Fun",
    summary: "The night is wildly messy, somehow lovable, and definitely unforgettable.",
    image: "",
    caption: "You call it a success-adjacent experience.",
    minHype: -999,
    maxHype: 999,
    minChaos: -999,
    maxChaos: 999,
    minBudget: -999,
    maxBudget: 999,
    priority: 99,
  },
];

const DEFAULT_DESIGN: AdventureDesignConfig = {
  gameTitle: "George Street Promoter Adventure",
  cityName: "St. John's",
  introLine:
    "You are a local promoter with one goal: run a hilarious, high-energy concert that people won't forget.",
  introImage: "",
  introCaption: "Every great night starts with an overconfident plan.",
  startingBudget: DEFAULT_BUDGET,
  startingHype: DEFAULT_HYPE,
  startingChaos: DEFAULT_CHAOS,
  difficulty: {
    minProblemRounds: 2,
    maxProblemRounds: 5,
    basePressureMultiplier: 1,
    pressureStepPerRound: 0.2,
    maxPressureMultiplier: 2,
    hypeBonusThreshold: 60,
    chaosBonusThreshold: 45,
  },
  venues: [
    {
      id: "downtown-dive",
      name: "Downtown Dive Bar",
      description: "Sticky floors, huge personality, and surprisingly decent acoustics.",
      capacity: 120,
      image: "",
      caption: "The stage is tiny, but the stories are massive.",
      effects: { budget: 20, hype: -5, chaos: 10 },
      enabled: true,
    },
  ],
  bands: [
    {
      id: "screech-owls",
      name: "The Screech Owls",
      genre: "punk",
      description: "Fast, loud, and one shoe is optional.",
      image: "",
      caption: "The drummer counts in before everyone else is ready.",
      specialEvent: "stageDiveDemand",
      effects: { budget: 0, hype: 25, chaos: 20 },
      enabled: true,
    },
    {
      id: "fog-collective",
      name: "Fog Bank Collective",
      genre: "indie",
      description: "Dreamy hooks and suspiciously large pedalboards.",
      image: "",
      caption: "Their soundcheck somehow becomes a mini-set.",
      specialEvent: "",
      effects: { budget: 0, hype: 16, chaos: 6 },
      enabled: true,
    },
  ],
  stageDesigns: [
    {
      id: "simple-lights",
      name: "Simple Lights",
      description: "Safe, clean, and unlikely to set anything off.",
      image: "",
      caption: "Basic setup, maximum reliability.",
      effects: { budget: -5, hype: 5, chaos: 0 },
      enabled: true,
    },
    {
      id: "fog-machine-madness",
      name: "Fog Machine Madness",
      description: "Atmosphere so thick even your own crew gets lost.",
      image: "",
      caption: "The vibes are excellent, visibility is optional.",
      effects: { budget: -10, hype: 15, chaos: 20 },
      enabled: true,
    },
  ],
  promotionMethods: [
    {
      id: "posters-downtown",
      name: "Posters Downtown",
      description: "Classic flyering and strategic tape placement.",
      image: "",
      caption: "The poles have never looked better.",
      effects: { budget: -5, hype: 10, chaos: 5 },
      enabled: true,
    },
    {
      id: "social-blitz",
      name: "Social Media Blitz",
      description: "Short videos, loud captions, and zero sleep.",
      image: "",
      caption: "Your phone battery may never recover.",
      effects: { budget: -10, hype: 25, chaos: 5 },
      enabled: true,
    },
  ],
  extraStages: [],
  problemEvents: [
    {
      id: "band-van-breakdown",
      title: "Band Van Breakdown",
      description: "The headliner texts: van trouble outside Clarenville.",
      image: "",
      caption: "It is suddenly a logistics puzzle with drum cases.",
      enabled: true,
      choices: [
        {
          id: "delay-show",
          text: "Delay the show and keep everyone updated.",
          image: "",
          caption: "You buy time with charm and announcements.",
          effects: { budget: 0, hype: -10, chaos: 10 },
        },
        {
          id: "replacement-band",
          text: "Find a replacement band from your contacts.",
          image: "",
          caption: "A local favorite arrives in fifteen dramatic minutes.",
          effects: { budget: 0, hype: 5, chaos: 20 },
        },
        {
          id: "free-drinks",
          text: "Offer free drinks while everyone waits.",
          image: "",
          caption: "Crowd mood recovers, your wallet does not.",
          effects: { budget: -15, hype: 10, chaos: 0 },
        },
      ],
    },
  ],
  endings: DEFAULT_ENDINGS,
};

export function normalizeAdventureDesign(input: unknown): AdventureDesignConfig {
  const source = input && typeof input === "object" ? (input as Partial<AdventureDesignConfig>) : {};

  const venues = Array.isArray(source.venues)
    ? source.venues.slice(0, 40).map((venue, index) => normalizeVenue(venue, index))
    : [];

  const bands = Array.isArray(source.bands)
    ? source.bands.slice(0, 50).map((band, index) => normalizeBand(band, index))
    : [];

  const stageDesigns = Array.isArray(source.stageDesigns)
    ? source.stageDesigns.slice(0, 30).map((item, index) => normalizeStageDesign(item, index))
    : [];

  const promotionMethods = Array.isArray(source.promotionMethods)
    ? source.promotionMethods.slice(0, 30).map((item, index) => normalizePromotion(item, index))
    : [];

  const extraStages = Array.isArray(source.extraStages)
    ? source.extraStages.slice(0, 20).map((item, index) => normalizeExtraStage(item, index))
    : [];

  const problemEvents = Array.isArray(source.problemEvents)
    ? source.problemEvents.slice(0, 40).map((item, index) => normalizeProblemEvent(item, index))
    : [];

  const endings = Array.isArray(source.endings)
    ? source.endings.slice(0, 30).map((ending, index) => normalizeEnding(ending, index))
    : [];

  return {
    gameTitle: normalizeText(source.gameTitle, DEFAULT_DESIGN.gameTitle, 80),
    cityName: normalizeText(source.cityName, DEFAULT_DESIGN.cityName, 64),
    introLine: normalizeText(source.introLine, DEFAULT_DESIGN.introLine, 320),
    introImage: normalizeText(source.introImage, DEFAULT_DESIGN.introImage, 1500000),
    introCaption: normalizeText(source.introCaption, DEFAULT_DESIGN.introCaption, 280),
    startingBudget: normalizeNumber(source.startingBudget, DEFAULT_BUDGET, -500, 500),
    startingHype: normalizeNumber(source.startingHype, DEFAULT_HYPE, -200, 200),
    startingChaos: normalizeNumber(source.startingChaos, DEFAULT_CHAOS, -200, 200),
    difficulty: normalizeDifficulty(source.difficulty),
    venues,
    bands,
    stageDesigns: stageDesigns.length
      ? stageDesigns
      : DEFAULT_DESIGN.stageDesigns.map((item) => ({ ...item })),
    promotionMethods: promotionMethods.length
      ? promotionMethods
      : DEFAULT_DESIGN.promotionMethods.map((item) => ({ ...item })),
    extraStages,
    problemEvents: problemEvents.length
      ? problemEvents
      : DEFAULT_DESIGN.problemEvents.map((event) => ({ ...event })),
    endings: (endings.length ? endings : DEFAULT_ENDINGS).sort((a, b) => a.priority - b.priority),
  };
}

export function chooseAdventureEnding(
  design: AdventureDesignConfig,
  stats: AdventureEffects,
): AdventureEnding {
  const sorted = [...design.endings].sort((a, b) => a.priority - b.priority);

  const matched = sorted.find((ending) => {
    const hypeOk = stats.hype >= ending.minHype && stats.hype <= ending.maxHype;
    const chaosOk = stats.chaos >= ending.minChaos && stats.chaos <= ending.maxChaos;
    const budgetOk = stats.budget >= ending.minBudget && stats.budget <= ending.maxBudget;
    return hypeOk && chaosOk && budgetOk;
  });

  return matched ?? DEFAULT_ENDINGS[DEFAULT_ENDINGS.length - 1];
}

export async function getAdventureDesign(): Promise<AdventureDesignConfig> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT value_text
    FROM app_settings
    WHERE key = ${ADVENTURE_DESIGN_SETTING_KEY}
    LIMIT 1;
  `) as { value_text: string }[];

  const raw = rows[0]?.value_text;
  if (!raw) {
    return normalizeAdventureDesign(DEFAULT_DESIGN);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeAdventureDesign(parsed);
  } catch {
    return normalizeAdventureDesign(DEFAULT_DESIGN);
  }
}

export async function saveAdventureDesign(input: unknown): Promise<AdventureDesignConfig> {
  await ensureSchema();
  const sql = getSql();

  const normalized = normalizeAdventureDesign(input);
  const serialized = JSON.stringify(normalized);

  await sql`
    INSERT INTO app_settings (key, value_text)
    VALUES (${ADVENTURE_DESIGN_SETTING_KEY}, ${serialized})
    ON CONFLICT (key)
    DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = NOW();
  `;

  return normalized;
}
