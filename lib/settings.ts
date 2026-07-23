import { ensureSchema, getSql } from "@/lib/db";

const DEFAULT_TICKER_TEXT =
  "NEW WEEKLY PLAYLIST • 4 RANDOM TRACKS • NO REPEATS UNTIL EVERY SONG PLAYS • POWERED BY GOOGLE DRIVE •";
const GUEST_BOOKING_SLOTS_KEY = "guest_booking_slots";
const DEFAULT_GUEST_BOOKING_WINDOW = 12;

export type GuestBookingSlot = {
  dateKey: string;
  dateLabel: string;
  featureGuestName: string;
  musicalGuestName: string;
};

type StoredGuestBookingSlot = {
  dateKey: string;
  featureGuestName: string;
  musicalGuestName: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date): string {
  return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-");
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getNextFridayAtSevenThirty(baseDate = new Date()): Date {
  const current = new Date(baseDate);
  const targetHour = 19;
  const targetMinute = 30;
  const dayOfWeek = current.getDay();
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;

  if (
    daysUntilFriday === 0 &&
    (current.getHours() > targetHour || (current.getHours() === targetHour && current.getMinutes() >= targetMinute))
  ) {
    daysUntilFriday = 7;
  }

  current.setHours(targetHour, targetMinute, 0, 0);
  current.setDate(current.getDate() + daysUntilFriday);
  return current;
}

function buildUpcomingGuestBookingSlots(count = DEFAULT_GUEST_BOOKING_WINDOW): GuestBookingSlot[] {
  const slots: GuestBookingSlot[] = [];
  const start = getNextFridayAtSevenThirty();

  for (let index = 0; index < count; index += 1) {
    const slotDate = new Date(start);
    slotDate.setDate(start.getDate() + index * 7);

    slots.push({
      dateKey: formatDateKey(slotDate),
      dateLabel: formatDateLabel(slotDate),
      featureGuestName: "",
      musicalGuestName: "",
    });
  }

  return slots;
}

function normalizeStoredGuestBookingSlots(value: unknown): StoredGuestBookingSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as Partial<StoredGuestBookingSlot>;
      const dateKey = typeof source.dateKey === "string" ? source.dateKey.trim() : "";

      if (!dateKey) {
        return null;
      }

      return {
        dateKey,
        featureGuestName:
          typeof source.featureGuestName === "string" ? source.featureGuestName.trim().slice(0, 120) : "",
        musicalGuestName:
          typeof source.musicalGuestName === "string" ? source.musicalGuestName.trim().slice(0, 120) : "",
      };
    })
    .filter((item): item is StoredGuestBookingSlot => item !== null);
}

function normalizeGuestBookingSlot(slot: GuestBookingSlot): GuestBookingSlot {
  return {
    dateKey: slot.dateKey.trim(),
    dateLabel: slot.dateLabel.trim(),
    featureGuestName: slot.featureGuestName.trim().slice(0, 120),
    musicalGuestName: slot.musicalGuestName.trim().slice(0, 120),
  };
}

export async function getTickerText(): Promise<string> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT value_text
    FROM app_settings
    WHERE key = 'ticker_text'
    LIMIT 1;
  `) as { value_text: string }[];

  return rows[0]?.value_text?.trim() || DEFAULT_TICKER_TEXT;
}

export async function setTickerText(value: string): Promise<string> {
  await ensureSchema();
  const sql = getSql();

  const normalized = value.trim() || DEFAULT_TICKER_TEXT;

  const rows = (await sql`
    INSERT INTO app_settings (key, value_text, updated_at)
    VALUES ('ticker_text', ${normalized}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value_text = EXCLUDED.value_text,
      updated_at = NOW()
    RETURNING value_text;
  `) as { value_text: string }[];

  return rows[0]?.value_text ?? normalized;
}

export async function getGuestBookingSlots(): Promise<GuestBookingSlot[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT value_text
    FROM app_settings
    WHERE key = ${GUEST_BOOKING_SLOTS_KEY}
    LIMIT 1;
  `) as { value_text: string }[];

  const storedRaw = rows[0]?.value_text?.trim();
  let storedSlots: StoredGuestBookingSlot[] = [];

  if (storedRaw) {
    try {
      storedSlots = normalizeStoredGuestBookingSlots(JSON.parse(storedRaw));
    } catch {
      storedSlots = [];
    }
  }

  const storedByDate = new Map(storedSlots.map((slot) => [slot.dateKey, slot]));

  return buildUpcomingGuestBookingSlots().map((slot) => {
    const saved = storedByDate.get(slot.dateKey);
    if (!saved) {
      return slot;
    }

    return {
      ...slot,
      featureGuestName: saved.featureGuestName,
      musicalGuestName: saved.musicalGuestName,
    };
  });
}

export async function setGuestBookingSlots(slots: GuestBookingSlot[]): Promise<GuestBookingSlot[]> {
  await ensureSchema();
  const sql = getSql();

  const normalizedSlots = slots.map(normalizeGuestBookingSlot).filter((slot) => slot.dateKey);
  const serialized = JSON.stringify(
    normalizedSlots.map((slot) => ({
      dateKey: slot.dateKey,
      featureGuestName: slot.featureGuestName,
      musicalGuestName: slot.musicalGuestName,
    })),
  );

  await sql`
    INSERT INTO app_settings (key, value_text, updated_at)
    VALUES (${GUEST_BOOKING_SLOTS_KEY}, ${serialized}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET
      value_text = EXCLUDED.value_text,
      updated_at = NOW();
  `;

  return getGuestBookingSlots();
}
