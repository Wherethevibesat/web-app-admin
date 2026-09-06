/**
 * Seed the Labor Day Weekend 2026 guide, venues, events, and flyer images.
 * Usage: node scripts/import-labor-day-guide.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");
const TZ = "-05:00";
const BUCKET = "venue-images";

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
  if (!slugKey) return null;
  return (
    venues.find((v) => v.id === slugKey) ||
    venues.find((v) => v.id.startsWith(`${slugKey}-`)) ||
    venues.find((v) => v.id.includes(slugKey)) ||
    null
  );
}

function contentTypeFor(file) {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function uploadFlyer(admin, fileName, bytes) {
  const storagePath = `guides/labor-day-2026/${fileName}`;
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: contentTypeFor(fileName),
  });
  if (error) throw error;
  return admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seed = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-labor-day-2026.json"), "utf8"),
  );
  const flyerDir = path.join(__dirname, "flyers", "labor-day-2026");

  const results = { venues: [], events: [], images: [], guide: null, errors: [] };

  const { data: existingVenues, error: venueError } = await admin
    .from("venues")
    .select("id, name, neighborhood, owner_id");
  if (venueError) throw venueError;
  const venues = [...(existingVenues ?? [])];

  for (const venue of seed.venues) {
    const found = findVenue(venues, venue.slugKey);
    if (found) {
      results.venues.push({ name: venue.name, status: "exists", id: found.id });
      if (!DRY_RUN) {
        await admin
          .from("venues")
          .update({
            website_url: venue.website_url || null,
            instagram_url: venue.instagram_url || null,
            address: venue.address,
            neighborhood: venue.neighborhood,
            updated_at: new Date().toISOString(),
          })
          .eq("id", found.id);
      }
      continue;
    }

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

    if (DRY_RUN) {
      results.venues.push({ name: venue.name, status: "dry-run-create" });
      venues.push({ id: venue.id, name: venue.name, neighborhood: venue.neighborhood });
      continue;
    }

    const { error } = await admin.from("venues").upsert(payload, { onConflict: "id" });
    if (error) {
      results.errors.push({ venue: venue.name, error: error.message });
      continue;
    }
    venues.push({ id: venue.id, name: venue.name, neighborhood: venue.neighborhood });
    results.venues.push({ name: venue.name, status: "created", id: venue.id });
  }

  function chicagoDay(iso) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  }

  const { data: existingEvents } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at, status")
    .neq("status", "cancelled");
  const existingKeys = new Map(
    (existingEvents ?? []).map((e) => [
      `${(e.title ?? "").toLowerCase()}|${e.venue_id ?? "none"}|${chicagoDay(e.starts_at)}`,
      e.id,
    ]),
  );

  const guideEventIds = [];

  for (const entry of seed.events) {
    const venue = findVenue(venues, entry.venueSlugKey);
    if (entry.venueSlugKey && !venue) {
      results.errors.push({ title: entry.title, error: `Venue not found: ${entry.venueSlugKey}` });
      continue;
    }

    const starts_at = toIso(entry.date, entry.startTime);
    const ends_at = endIso(entry.date, entry.endTime);
    const dedupeKey = `${entry.title.toLowerCase()}|${venue?.id ?? "none"}|${entry.date}`;

    let image_url = null;
    const flyerPath = path.join(flyerDir, entry.imageFile);
    if (fs.existsSync(flyerPath)) {
      if (DRY_RUN) {
        image_url = `(local ${entry.imageFile})`;
      } else {
        try {
          image_url = await uploadFlyer(admin, entry.imageFile, fs.readFileSync(flyerPath));
          results.images.push({ file: entry.imageFile, url: image_url });
        } catch (err) {
          results.errors.push({ title: entry.title, error: `Image upload: ${err.message}` });
        }
      }
    }

    const row = {
      venue_id: venue?.id ?? null,
      title: entry.title,
      description: entry.description ?? "",
      event_type: entry.event_type ?? "Night Party",
      neighborhood: entry.neighborhood ?? venue?.neighborhood ?? null,
      starts_at,
      ends_at,
      image_url,
      ticket_url: entry.ticket_url ?? null,
      status: "published",
      featured: true,
      homepage_featured: false,
      promoter_event_approval: "not_applicable",
      updated_at: new Date().toISOString(),
    };
    const rowWithoutTicket = { ...row };
    delete rowWithoutTicket.ticket_url;

    const existingId = existingKeys.get(dedupeKey);
    if (DRY_RUN) {
      results.events.push({
        title: entry.title,
        status: existingId ? "dry-run-update" : "dry-run-create",
        venue: venue?.name ?? "Invite only",
        starts_at,
      });
      continue;
    }

    try {
      if (existingId) {
        let { error } = await admin.from("events").update(row).eq("id", existingId);
        if (error && /ticket_url/.test(error.message || "")) {
          ({ error } = await admin.from("events").update(rowWithoutTicket).eq("id", existingId));
        }
        if (error) throw error;
        guideEventIds.push(existingId);
        results.events.push({ title: entry.title, status: "updated", eventId: existingId });
      } else {
        let { data, error } = await admin.from("events").insert(row).select("id").single();
        if (error && /ticket_url/.test(error.message || "")) {
          ({ data, error } = await admin.from("events").insert(rowWithoutTicket).select("id").single());
        }
        if (error) throw error;
        existingKeys.set(dedupeKey, data.id);
        guideEventIds.push(data.id);
        results.events.push({ title: entry.title, status: "created", eventId: data.id });
      }
    } catch (err) {
      results.errors.push({ title: entry.title, error: err.message ?? String(err) });
    }
  }

  if (!DRY_RUN) {
    try {
      const { data: existingGuide } = await admin
        .from("event_guides")
        .select("id")
        .eq("slug", seed.guide.slug)
        .maybeSingle();

      const guidePayload = {
        ...seed.guide,
        cover_image_url: results.images.find((img) => img.file === "all-white-ciel.jpg")?.url ?? null,
        updated_at: new Date().toISOString(),
      };

      let guideId = existingGuide?.id;
      if (guideId) {
        const { error } = await admin.from("event_guides").update(guidePayload).eq("id", guideId);
        if (error) throw error;
      } else {
        const { data, error } = await admin
          .from("event_guides")
          .insert(guidePayload)
          .select("id")
          .single();
        if (error) throw error;
        guideId = data.id;
      }

      await admin.from("event_guide_items").delete().eq("guide_id", guideId);
      if (guideEventIds.length) {
        const { error } = await admin.from("event_guide_items").insert(
          guideEventIds.map((eventId, index) => ({
            guide_id: guideId,
            event_id: eventId,
            sort_order: index,
          })),
        );
        if (error) throw error;
      }
      results.guide = { id: guideId, slug: seed.guide.slug, events: guideEventIds.length };
    } catch (err) {
      results.errors.push({
        title: "event_guides",
        error: `${err.message ?? String(err)} — run 052_event_guides.sql, then re-run this script.`,
      });
      results.guide = { status: "skipped", reason: "migration needed" };
    }
  } else {
    results.guide = { status: "dry-run", events: seed.events.length };
  }

  const outPath = path.join(__dirname, "import-labor-day-guide-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log(`Log: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
