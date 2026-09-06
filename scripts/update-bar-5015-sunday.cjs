/**
 * Apply the official Bar 5015 Sunday Funday flyer and 4pm–1am details.
 * Usage: node scripts/update-bar-5015-sunday.cjs
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

function chicagoDay(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const flyerPath = path.join(__dirname, "flyers", "labor-day-2026", "bar-5015-sunday.jpg");
  const bytes = fs.readFileSync(flyerPath);
  const storagePath = "guides/labor-day-2026/bar-5015-sunday.jpg";
  const { error: uploadError } = await admin.storage.from("venue-images").upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (uploadError) throw uploadError;
  const image_url = `${admin.storage.from("venue-images").getPublicUrl(storagePath).data.publicUrl}?v=20260905`;

  const { data, error } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at, status, featured")
    .ilike("title", "%sunday funday%bar 5015%");
  if (error) throw error;

  const matches = (data ?? []).filter((event) => chicagoDay(event.starts_at) === "2026-09-06");
  if (!matches.length) throw new Error("No Bar 5015 Sunday Funday event found for Sept 6.");

  matches.sort((a, b) => {
    const rank = (event) => (event.status === "published" ? 2 : 0) + (event.featured ? 1 : 0);
    return rank(b) - rank(a);
  });

  const keep = matches[0];
  const extras = matches.slice(1);

  const { error: updateError } = await admin
    .from("events")
    .update({
      title: "Sunday Funday at Bar 5015 — Labor Day Edition",
      description:
        "Sunday Funday at Bar 5015. All roads lead to Almeda. 4pm–1am, no cover. DJs Shante, Auditory, Q Holic, and Wreck. 5015 Almeda Road.",
      event_type: "Day Party",
      starts_at: "2026-09-06T16:00:00-05:00",
      ends_at: "2026-09-07T01:00:00-05:00",
      image_url,
      status: "published",
      featured: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", keep.id);
  if (updateError) throw updateError;

  for (const event of extras) {
    const { error: cancelError } = await admin
      .from("events")
      .update({ featured: false, status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", event.id);
    if (cancelError) throw cancelError;
  }

  console.log(`Updated ${keep.id} to 4pm–1am with official flyer. Cancelled ${extras.length} extras.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
