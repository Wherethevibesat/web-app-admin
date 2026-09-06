/**
 * Unfeature duplicate Labor Day weekend listings, keeping the best flyer/copy.
 * Usage: node scripts/cleanup-labor-day-dupes.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let val = line.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[line.slice(0, i)] = val;
  }
  return env;
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/labor day( weekend)?/g, " ")
    .replace(/exclusive|edition/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dayKey(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function score(event) {
  const image = event.image_url || "";
  const title = (event.title || "").toLowerCase();
  let n = 0;
  if (image.includes("labor-day-2026")) n += 50;
  if (image.includes("bar-5015-sunday")) n += 20;
  if (title.includes("labor day")) n += 10;
  if (image && !image.includes("placeholder")) n += 5;
  return n;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at, image_url, featured")
    .eq("status", "published")
    .eq("featured", true)
    .gte("starts_at", "2026-09-04T00:00:00-05:00")
    .lte("starts_at", "2026-09-08T06:00:00-05:00");
  if (error) throw error;

  const groups = new Map();
  for (const event of data ?? []) {
    const key = `${event.venue_id || "none"}|${dayKey(event.starts_at)}|${normalizeTitle(event.title)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const keep = [];
  const drop = [];
  for (const events of groups.values()) {
    events.sort((a, b) => score(b) - score(a));
    keep.push(events[0]);
    drop.push(...events.slice(1));
  }

  for (const event of drop) {
    const { error: updateError } = await admin
      .from("events")
      .update({ featured: false, status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", event.id);
    if (updateError) throw updateError;
  }

  console.log(`Kept ${keep.length} Labor Day listings, cancelled ${drop.length} duplicates.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
