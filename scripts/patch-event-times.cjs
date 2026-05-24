/**
 * Patch Memorial Weekend event times in Supabase (by title).
 * Usage: node scripts/patch-event-times.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");
const TZ = "-05:00";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let val = line.slice(i + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[line.slice(0, i)] = val;
  }
  return env;
}

function toIso(date, time) {
  return `${date}T${time}:00${TZ}`;
}

function endIso(date, time) {
  const [h] = time.split(":").map(Number);
  if (h < 12) {
    const d = new Date(`${date}T12:00:00${TZ}`);
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().slice(0, 10);
    return `${next}T${time}:00${TZ}`;
  }
  return `${date}T${time}:00${TZ}`;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-memorial-events.json"), "utf8"),
  );

  const { data: events, error } = await admin.from("events").select("id, title, starts_at, ends_at");
  if (error) throw error;

  for (const entry of entries) {
    const row = (events ?? []).find((e) => e.title === entry.title);
    if (!row) {
      console.log(`Skip (not found): ${entry.title}`);
      continue;
    }

    const starts_at = toIso(entry.date, entry.startTime);
    const ends_at = endIso(entry.date, entry.endTime);
    const patch = { starts_at, ends_at, updated_at: new Date().toISOString() };

    console.log(`${entry.title}`);
    console.log(`  → ${entry.startTime}–${entry.endTime} (${starts_at} → ${ends_at})`);

    if (DRY_RUN) continue;

    const { error: updateError } = await admin.from("events").update(patch).eq("id", row.id);
    if (updateError) throw updateError;
  }

  console.log(DRY_RUN ? "Dry run complete." : "Event times updated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
