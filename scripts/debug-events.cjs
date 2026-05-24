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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[line.slice(0, i)] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const now = new Date().toISOString();
  console.log("Now (UTC):", now);

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data: all, error: adminErr } = await admin
    .from("events")
    .select("id, title, venue_id, status, starts_at, ends_at, promoter_event_approval")
    .order("starts_at");
  console.log("\n=== Admin (all events) ===");
  if (adminErr) console.error(adminErr);
  else console.log(JSON.stringify(all, null, 2));

  const { data: pub, error: pubErr } = await anon
    .from("events")
    .select("id, title, venue_id, status, starts_at, ends_at")
    .eq("status", "published")
    .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`);
  console.log("\n=== Anon (published active/upcoming) ===");
  if (pubErr) console.error(pubErr);
  else console.log(JSON.stringify(pub, null, 2), "count:", pub?.length ?? 0);

  const { data: withVenue, error: joinErr } = await anon
    .from("events")
    .select(
      "id, title, starts_at, venue:venues(id, name, published)",
    )
    .eq("status", "published")
    .gte("starts_at", now);
  console.log("\n=== Anon with venue join ===");
  if (joinErr) console.error(joinErr);
  else console.log(JSON.stringify(withVenue, null, 2));
}

main().catch(console.error);
