/**
 * Seed recurring weekly event series tied to imported Houston venues.
 * Data: scripts/seed-weekly-events.json
 * Usage: node scripts/import-weekly-events.cjs [--dry-run]
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

function generateOccurrences(entry) {
  const rows = [];
  let cursor = new Date(`${entry.firstDate}T12:00:00${TZ}`);
  const until = new Date(`${entry.untilDate}T23:59:59${TZ}`);
  let index = 0;

  while (cursor <= until) {
    if (cursor.getDay() === entry.weekday) {
      const isoDate = cursor.toISOString().slice(0, 10);
      rows.push({
        occurrence_index: index,
        starts_at: toIso(isoDate, entry.startTime),
        ends_at: endIso(isoDate, entry.endTime),
      });
      index += 1;
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  return rows;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-weekly-events.json"), "utf8"),
  );

  const { data: venues, error: venueError } = await admin
    .from("venues")
    .select("id, name, neighborhood");
  if (venueError) throw venueError;

  const { data: existingSeries, error: seriesFetchError } = await admin
    .from("event_series")
    .select("id, title, venue_id");
  if (seriesFetchError) throw seriesFetchError;

  const existingKeys = new Set(
    (existingSeries ?? []).map((s) => `${(s.title ?? "").toLowerCase()}|${s.venue_id ?? ""}`),
  );

  const results = [];
  const errors = [];

  for (const entry of entries) {
    const venue = findVenue(venues ?? [], entry.venueSlugKey);
    if (!venue) {
      errors.push({ title: entry.title, error: `Venue not found: ${entry.venueSlugKey}` });
      continue;
    }

    const seriesKey = `${entry.title.toLowerCase()}|${venue.id}`;
    if (existingKeys.has(seriesKey)) {
      results.push({ title: entry.title, venue: venue.name, status: "skipped", reason: "series already exists" });
      continue;
    }

    const occurrences = generateOccurrences(entry);
    const seriesRow = {
      venue_id: venue.id,
      title: entry.title,
      description: entry.description ?? "",
      event_type: entry.event_type ?? "Other",
      neighborhood: venue.neighborhood ?? null,
      image_url: null,
      status: "published",
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      results.push({
        title: entry.title,
        venue: venue.name,
        status: "dry-run",
        starts_at: occurrences[0]?.starts_at ?? null,
        until_date: entry.untilDate,
        count: occurrences.length,
      });
      continue;
    }

    try {
      const { data: series, error: insertSeriesError } = await admin
        .from("event_series")
        .insert(seriesRow)
        .select("id")
        .single();
      if (insertSeriesError) throw insertSeriesError;

      const recurrenceRule = {
        series_id: series.id,
        freq: "weekly",
        interval_weeks: 1,
        by_weekday: [entry.weekday],
        until_date: entry.untilDate,
      };
      const { error: recurrenceError } = await admin
        .from("event_recurrence_rules")
        .insert(recurrenceRule);
      if (recurrenceError) throw recurrenceError;

      const now = new Date().toISOString();
      const eventRows = occurrences.map((occ) => ({
        venue_id: venue.id,
        series_id: series.id,
        occurrence_index: occ.occurrence_index,
        title: entry.title,
        description: entry.description ?? "",
        event_type: entry.event_type ?? "Other",
        neighborhood: venue.neighborhood ?? null,
        starts_at: occ.starts_at,
        ends_at: occ.ends_at,
        image_url: null,
        status: "published",
        featured: false,
        promoter_event_approval: "not_applicable",
        updated_at: now,
      }));

      const { error: eventsError } = await admin.from("events").insert(eventRows);
      if (eventsError) throw eventsError;

      existingKeys.add(seriesKey);
      results.push({
        title: entry.title,
        venue: venue.name,
        status: "created",
        seriesId: series.id,
        starts_at: occurrences[0]?.starts_at ?? null,
        until_date: entry.untilDate,
        count: eventRows.length,
      });
    } catch (err) {
      errors.push({ title: entry.title, error: err.message ?? String(err) });
    }
  }

  const outPath = path.join(__dirname, "import-weekly-events-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ results, errors }, null, 2));

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`Done. ${created} series created, ${skipped} skipped, ${errors.length} errors.`);
  if (DRY_RUN) console.log("Dry run - no database writes.");
  for (const r of results) {
    console.log(`- ${r.title} @ ${r.venue} [${r.status}] (${r.count ?? 0} occurrences)`);
  }
  if (errors.length) console.error("Errors:", errors);
  console.log(`Log: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
