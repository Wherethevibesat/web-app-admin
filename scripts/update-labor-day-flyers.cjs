/**
 * Upload official Labor Day flyers and update matching published events.
 * Usage: node scripts/update-labor-day-flyers.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const TZ = "-05:00";
const CACHE = "v=20260905b";

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

function chicagoDay(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function toIso(date, time) {
  return `${date}T${time}:00${TZ}`;
}

function endIso(date, time) {
  const [h] = time.split(":").map(Number);
  if (h < 12) {
    const d = new Date(`${date}T12:00:00${TZ}`);
    d.setDate(d.getDate() + 1);
    return `${d.toISOString().slice(0, 10)}T${time}:00${TZ}`;
  }
  return `${date}T${time}:00${TZ}`;
}

function findVenue(venues, slugKey) {
  if (!slugKey) return null;
  return (
    venues.find((v) => v.id === slugKey) ||
    venues.find((v) => v.id.startsWith(`${slugKey}-`)) ||
    venues.find((v) => v.id.includes(slugKey)) ||
    null
  );
}

function titleMatches(eventTitle, seedTitle) {
  const a = (eventTitle || "").toLowerCase();
  const b = seedTitle.toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const tokens = b.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  return tokens.length > 0 && tokens.every((token) => a.includes(token));
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-labor-day-2026.json"), "utf8"));
  const flyerDir = path.join(__dirname, "flyers", "labor-day-2026");
  const targets = [
    "F.R.E.S.H Saturdays",
    "Chapman Sundays — Labor Day Weekend",
    "Supreme Sundays",
    "Night Cap Sundays at STYX + STONE",
    "The Epilogue at Velvet Rail",
  ];

  const { data: existingVenues, error: venueError } = await admin.from("venues").select("id, name, neighborhood");
  if (venueError) throw venueError;
  const venues = [...(existingVenues ?? [])];

  for (const venue of seed.venues) {
    if (findVenue(venues, venue.slugKey)) continue;
    const payload = {
      id: venue.id,
      name: venue.name,
      venue_type: venue.venue_type,
      address: venue.address,
      neighborhood: venue.neighborhood,
      phone: venue.phone || null,
      website_url: venue.website_url || null,
      instagram_url: venue.instagram_url || null,
      published: true,
      featured: false,
      verified: false,
      is_open: true,
      hours_label: "See event times",
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("venues").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    venues.push({ id: venue.id, name: venue.name, neighborhood: venue.neighborhood });
    console.log(`Created venue ${venue.name}`);
  }

  const { data: existingEvents, error: eventsError } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at, status, featured")
    .gte("starts_at", "2026-09-04T00:00:00-05:00")
    .lte("starts_at", "2026-09-08T06:00:00-05:00");
  if (eventsError) throw eventsError;

  for (const entry of seed.events.filter((event) => targets.includes(event.title))) {
    const venue = findVenue(venues, entry.venueSlugKey);
    const flyerPath = path.join(flyerDir, entry.imageFile);
    const bytes = fs.readFileSync(flyerPath);
    const storagePath = `guides/labor-day-2026/${entry.imageFile}`;
    const { error: uploadError } = await admin.storage.from("venue-images").upload(storagePath, bytes, {
      upsert: true,
      contentType: "image/jpeg",
    });
    if (uploadError) throw uploadError;
    const image_url = `${admin.storage.from("venue-images").getPublicUrl(storagePath).data.publicUrl}?${CACHE}`;

    const matches = (existingEvents ?? []).filter(
      (event) => titleMatches(event.title, entry.title) && chicagoDay(event.starts_at) === entry.date,
    );
    matches.sort((a, b) => {
      const rank = (event) => (event.status === "published" ? 2 : 0) + (event.featured ? 1 : 0);
      return rank(b) - rank(a);
    });

    const row = {
      venue_id: venue?.id ?? null,
      title: entry.title,
      description: entry.description ?? "",
      event_type: entry.event_type ?? "Night Party",
      neighborhood: venue?.neighborhood ?? null,
      starts_at: toIso(entry.date, entry.startTime),
      ends_at: endIso(entry.date, entry.endTime),
      image_url,
      ticket_url: entry.ticket_url ?? null,
      status: "published",
      featured: true,
      updated_at: new Date().toISOString(),
    };
    const rowWithoutTicket = { ...row };
    delete rowWithoutTicket.ticket_url;

    if (matches[0]) {
      let { error } = await admin.from("events").update(row).eq("id", matches[0].id);
      if (error && /ticket_url/.test(error.message || "")) {
        ({ error } = await admin.from("events").update(rowWithoutTicket).eq("id", matches[0].id));
      }
      if (error) throw error;
      for (const extra of matches.slice(1)) {
        await admin
          .from("events")
          .update({ featured: false, status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", extra.id);
      }
      console.log(`Updated ${entry.title} (${matches[0].id})`);
    } else {
      let { data, error } = await admin.from("events").insert(row).select("id").single();
      if (error && /ticket_url/.test(error.message || "")) {
        ({ data, error } = await admin.from("events").insert(rowWithoutTicket).select("id").single());
      }
      if (error) throw error;
      console.log(`Created ${entry.title} (${data.id})`);
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
