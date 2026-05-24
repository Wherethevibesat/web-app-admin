/**
 * Seed published events tied to imported Houston venues.
 * Data: scripts/seed-memorial-events.json
 * Usage: node scripts/import-events.cjs [--dry-run]
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

function findVenue(venues, slugKey) {
  const match = venues.find((v) => v.id.startsWith(`${slugKey}-`) || v.id === slugKey);
  if (match) return match;
  return venues.find((v) => v.id.includes(slugKey));
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-memorial-events.json"), "utf8"),
  );

  const { data: venues, error: venueError } = await admin
    .from("venues")
    .select("id, name, neighborhood, owner_id");
  if (venueError) throw venueError;

  const { data: existingEvents } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at");
  const existingKeys = new Set(
    (existingEvents ?? []).map(
      (e) => `${(e.title ?? "").toLowerCase()}|${e.venue_id}|${(e.starts_at ?? "").slice(0, 10)}`,
    ),
  );

  const results = [];
  const errors = [];

  for (const entry of entries) {
    const venue = findVenue(venues ?? [], entry.venueSlugKey);
    if (!venue) {
      errors.push({ title: entry.title, error: `Venue not found: ${entry.venueSlugKey}` });
      continue;
    }

    const starts_at = toIso(entry.date, entry.startTime);
    const ends_at = endIso(entry.date, entry.endTime);
    const dedupeKey = `${entry.title.toLowerCase()}|${venue.id}|${entry.date}`;
    if (existingKeys.has(dedupeKey)) {
      results.push({ title: entry.title, status: "skipped", reason: "already exists", venue: venue.name });
      continue;
    }

    const row = {
      venue_id: venue.id,
      title: entry.title,
      description: entry.description ?? "",
      event_type: entry.event_type ?? "Night Party",
      neighborhood: venue.neighborhood ?? null,
      starts_at,
      ends_at,
      image_url: null,
      status: "published",
      featured: false,
      promoter_event_approval: "not_applicable",
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      results.push({
        title: entry.title,
        status: "dry-run",
        venue: venue.name,
        venue_id: venue.id,
        starts_at,
        ends_at,
      });
      continue;
    }

    try {
      const { data, error } = await admin.from("events").insert(row).select("id").single();
      if (error) throw error;
      existingKeys.add(dedupeKey);
      results.push({
        title: entry.title,
        status: "created",
        eventId: data.id,
        venue: venue.name,
        starts_at,
      });
    } catch (err) {
      errors.push({ title: entry.title, error: err.message ?? String(err) });
    }
  }

  const outPath = path.join(__dirname, "import-events-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ results, errors, skippedNoVenue: [
    {
      title: "Crawfish & Verde Food Festival",
      date: "2026-05-24",
      reason: "No venue in source list — add manually when venue is known",
    },
    {
      title: "Gladys Knight & Patti LaBelle",
      date: "2026-09-20",
      reason: "Concert/show with no venue in source list",
    },
  ] }, null, 2));

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`Done. ${created} created, ${skipped} skipped, ${errors.length} errors.`);
  if (DRY_RUN) console.log("Dry run — no database writes.");
  for (const r of results) {
    if (r.status === "created" || r.status === "dry-run") {
      console.log(`+ ${r.title} @ ${r.venue} (${r.starts_at ?? r.eventId ?? "preview"})`);
    }
  }
  if (errors.length) console.error("Errors:", errors);
  console.log("Note: Crawfish & Verde Food Festival and Gladys Knight show were skipped (no venue).");
  console.log(`Log: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
