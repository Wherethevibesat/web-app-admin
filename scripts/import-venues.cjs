/**
 * Bulk-import Houston venues with colossaloneinc+slug@gmail.com owner accounts.
 * Data: scripts/venue-import-data.json
 * Usage: node scripts/import-venues.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");
const OWNER_EMAIL_BASE = "colossaloneinc@gmail.com";

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

function ownerAliasEmail(slugKey) {
  const [local, domain] = OWNER_EMAIL_BASE.split("@");
  return `${local}+${slugKey}@${domain}`.toLowerCase();
}

function normalizeAddress(address) {
  return (address ?? "").trim().toLowerCase();
}

function venueIdForOwner(ownerId, slugKey) {
  const suffix = ownerId.replace(/-/g, "").slice(0, 8);
  return `${slugKey}-${suffix}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeAddress(address) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url, {
    headers: { "User-Agent": "WTVA-Admin-Venue-Import/1.0 (contact@wherethevibesat.com)" },
  });
  if (!res.ok) return { latitude: null, longitude: null };
  const data = await res.json();
  if (!data.length) return { latitude: null, longitude: null };
  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}

async function ensureVenueOwnerAccount(admin, email, displayName) {
  const normalized = email.trim().toLowerCase();
  const name = displayName.trim() || normalized.split("@")[0];

  const { data: existing } = await admin
    .from("users")
    .select("id, email")
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    await admin
      .from("users")
      .update({ role: "venueOwner", name, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: { role: "venueOwner", name },
    });
    return existing.id;
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { role: "venueOwner", name },
  });
  if (authError) throw authError;

  const userId = authData.user.id;
  await admin.from("users").upsert(
    {
      id: userId,
      email: normalized,
      name,
      role: "venueOwner",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return userId;
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const venues = JSON.parse(
    fs.readFileSync(path.join(__dirname, "venue-import-data.json"), "utf8"),
  );

  const { data: existingVenues } = await admin.from("venues").select("id, name, address");
  const existingNames = new Set((existingVenues ?? []).map((v) => v.name.toLowerCase()));
  const existingAddresses = new Set(
    (existingVenues ?? []).map((v) => normalizeAddress(v.address)).filter(Boolean),
  );

  const results = [];
  const errors = [];

  for (const entry of venues) {
    if (existingNames.has(entry.name.toLowerCase())) {
      results.push({ name: entry.name, status: "skipped", reason: "already exists" });
      continue;
    }
    if (entry.address && existingAddresses.has(normalizeAddress(entry.address))) {
      results.push({ name: entry.name, status: "skipped", reason: "address already exists" });
      continue;
    }

    try {
      const email = ownerAliasEmail(entry.slugKey);

      let latitude = entry.latitude ?? null;
      let longitude = entry.longitude ?? null;
      if (!latitude && entry.address) {
        await sleep(1100);
        const geo = await geocodeAddress(entry.address);
        latitude = geo.latitude;
        longitude = geo.longitude;
      }

      if (DRY_RUN) {
        results.push({
          name: entry.name,
          status: "dry-run",
          email,
          address: entry.address,
          neighborhood: entry.neighborhood,
          latitude,
          longitude,
        });
        continue;
      }

      const ownerId = await ensureVenueOwnerAccount(admin, email, entry.name);
      const venueId = venueIdForOwner(ownerId, entry.slugKey);
      const now = new Date().toISOString();

      const { error: venueError } = await admin.from("venues").insert({
        id: venueId,
        name: entry.name,
        venue_type: entry.venue_type ?? "Nightclub",
        address: entry.address ?? null,
        neighborhood: entry.neighborhood ?? "Other",
        description: null,
        image_url: null,
        phone: entry.phone ?? null,
        hours_label: "Open until 2:00 AM",
        subscription_tier: "silver",
        verified: false,
        verification_status: "none",
        featured: false,
        published: true,
        is_open: true,
        latitude,
        longitude,
        owner_id: ownerId,
        created_at: now,
        updated_at: now,
      });

      if (venueError) throw venueError;

      results.push({
        name: entry.name,
        status: "created",
        venueId,
        email,
        address: entry.address,
        neighborhood: entry.neighborhood,
      });
      existingNames.add(entry.name.toLowerCase());
      if (entry.address) existingAddresses.add(normalizeAddress(entry.address));
    } catch (err) {
      errors.push({ name: entry.name, error: err.message ?? String(err) });
    }
  }

  const outPath = path.join(__dirname, "import-venues-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ results, errors }, null, 2));

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`Done. ${created} created, ${skipped} skipped, ${errors.length} errors.`);
  if (DRY_RUN) {
    console.log("Dry run — no database writes.");
  } else {
    for (const r of results) {
      if (r.status === "created") {
        console.log(`+ ${r.name} → ${r.venueId} (${r.email})`);
      }
    }
    if (errors.length) console.error("Errors:", errors);
  }
  console.log(`Full log: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
