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

const KEEP_IDS = new Set(["love-bar-dbfd9cc6"]);

async function main() {
  const { data: venues, error: listError } = await admin.from("venues").select("id, name").order("name");
  if (listError) throw listError;

  const toDelete = venues.filter((v) => !KEEP_IDS.has(v.id));
  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  console.log(
    "Deleting:",
    toDelete.map((v) => `${v.name} (${v.id})`).join(", "),
  );

  const ids = toDelete.map((v) => v.id);
  const { error: deleteError } = await admin.from("venues").delete().in("id", ids);
  if (deleteError) throw deleteError;

  const { data: remaining, error: verifyError } = await admin
    .from("venues")
    .select("id, name, neighborhood, published")
    .order("name");
  if (verifyError) throw verifyError;

  console.log("\nRemaining venues:");
  console.log(JSON.stringify(remaining, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
