const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i);
  let val = line.slice(i + 1);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const KEEP_NAME = "love bar";
const KEEP_ID = "love-bar-dbfd9cc6";

async function count(table, col, id) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(col, id);
  if (error) return `err: ${error.message}`;
  return count ?? 0;
}

async function main() {
  const { data: venues, error } = await admin.from("venues").select("id, name").order("name");
  if (error) throw error;

  const toDelete = venues.filter(
    (v) => v.id !== KEEP_ID && v.name.toLowerCase().trim() !== KEEP_NAME,
  );

  console.log("Keeping:", venues.find((v) => v.id === KEEP_ID)?.name ?? KEEP_ID);
  console.log("Deleting:", toDelete.map((v) => `${v.name} (${v.id})`).join(", ") || "none");

  for (const v of toDelete) {
    const tables = [
      ["events", "venue_id"],
      ["promoter_venue_links", "venue_id"],
      ["promoter_offers", "venue_id"],
      ["venue_vip_packages", "venue_id"],
      ["venue_social_links", "venue_id"],
      ["venue_hours", "venue_id"],
      ["orders", "venue_id"],
      ["conversations", "venue_id"],
    ];
    const counts = {};
    for (const [table, col] of tables) {
      counts[table] = await count(table, col, v.id);
    }
    console.log(`\n${v.name} (${v.id}):`, counts);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
