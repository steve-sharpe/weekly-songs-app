import { ensureSchema, getSql } from "@/lib/db";

const DEFAULT_TICKER_TEXT =
  "NEW WEEKLY PLAYLIST • 4 RANDOM TRACKS • NO REPEATS UNTIL EVERY SONG PLAYS • POWERED BY GOOGLE DRIVE •";

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
