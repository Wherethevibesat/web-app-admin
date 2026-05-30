/**
 * Fetch venue cover images from official websites (og:image / twitter:image),
 * upload to Supabase storage, and update venues.image_url + website_url.
 *
 * Usage:
 *   node scripts/fetch-venue-images.cjs [--dry-run] [--limit=5] [--venue-id=chapman-kirby-xxx]
 *
 * Does NOT scrape Google Images (licensing). Uses scripts/venue-website-map.json only.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
const venueIdArg = process.argv.find((a) => a.startsWith("--venue-id="));
const VENUE_ID_FILTER = venueIdArg ? venueIdArg.split("=")[1] : null;

const BUCKET = "venue-images";
const USER_AGENT = "WTVA-Venue-Image-Bot/1.0 (+https://wherethevibesat.com; contact@wherethevibesat.com)";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function venueSlugFromId(id) {
  return id.replace(/-[a-f0-9]{8}$/i, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeImageUrl(url) {
  if (url.includes("wixstatic.com") && url.includes("/v1/fill/")) {
    return url.replace(/\/v1\/fill\/[^/]+/, "/v1/fit/w_2500,h_1330,al_c");
  }
  return url;
}

function isLikelyLogo(url) {
  const lower = url.toLowerCase();
  return (
    /logo|favicon|icon|sprite|badge|avatar|phone\.png|\.svg(\?|$)/.test(lower) ||
    lower.includes("yourcdn.com/path-to") ||
    /w_\d+,h_\d+/.test(lower) &&
      (() => {
        const m = lower.match(/w_(\d+),h_(\d+)/);
        if (!m) return false;
        return parseInt(m[1], 10) < 300 || parseInt(m[2], 10) < 200;
      })()
  );
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaImage(html, pageUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(decodeHtmlEntities(match[1].trim()), pageUrl).href;
      } catch {
        continue;
      }
    }
  }

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdBlocks) {
    for (const block of jsonLdBlocks) {
      const inner = block.replace(/<\/?script[^>]*>/gi, "").trim();
      try {
        const parsed = JSON.parse(inner);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          const image = node?.image ?? node?.logo;
          if (typeof image === "string") {
            return new URL(image, pageUrl).href;
          }
          if (Array.isArray(image) && typeof image[0] === "string") {
            return new URL(image[0], pageUrl).href;
          }
          if (image?.url) {
            return new URL(image.url, pageUrl).href;
          }
        }
      } catch {
        /* ignore invalid JSON-LD */
      }
    }
  }

  const imgCandidates = [];
  for (const match of html.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const srcMatch = tag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) continue;
    const src = decodeHtmlEntities(srcMatch[1].trim());
    if (!src || src.startsWith("data:")) continue;
    const lower = src.toLowerCase();
    if (lower.includes("logo") || lower.includes("icon") || lower.includes("sprite")) continue;
    let score = 0;
    if (/hero|banner|header|cover|featured|gallery|slide|background/i.test(tag)) score += 3;
    if (/wp-content\/uploads/i.test(lower)) score += 2;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(lower)) score += 1;
    imgCandidates.push({ src, score });
  }
  imgCandidates.sort((a, b) => b.score - a.score);
  if (imgCandidates[0]?.score > 0) {
    try {
      return new URL(imgCandidates[0].src, pageUrl).href;
    } catch {
      /* fall through */
    }
  }

  return null;
}

function extFromContentType(contentType, imageUrl) {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  const fromUrl = imageUrl.split("?")[0].split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(fromUrl ?? "")) {
    return fromUrl === "jpeg" ? "jpg" : fromUrl;
  }
  return "jpg";
}

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`Website HTTP ${res.status}`);
  const html = await res.text();
  return { html, finalUrl: res.url };
}

async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
  });
  if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !ALLOWED_TYPES.has(contentType.split(";")[0].trim().toLowerCase())) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 30 * 1024) throw new Error("Image too small (likely logo/thumbnail)");
  if (buffer.length > 5 * 1024 * 1024) throw new Error("Image exceeds 5 MB");
  return { buffer, contentType: contentType.split(";")[0].trim().toLowerCase() || "image/jpeg" };
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const websiteMap = JSON.parse(
    fs.readFileSync(path.join(__dirname, "venue-website-map.json"), "utf8"),
  );

  let query = admin
    .from("venues")
    .select("id, name, image_url, website_url")
    .order("name");

  if (VENUE_ID_FILTER) {
    query = query.eq("id", VENUE_ID_FILTER);
  } else {
    query = query.is("image_url", null);
  }

  const { data: venues, error } = await query;
  if (error) throw error;

  const targets = (venues ?? []).slice(0, LIMIT ?? undefined);
  const results = [];
  const skipped = [];

  for (const venue of targets) {
    const slug = venueSlugFromId(venue.id);
    const websiteUrl = venue.website_url ?? websiteMap[slug] ?? null;

    if (!websiteUrl) {
      skipped.push({ id: venue.id, name: venue.name, reason: "no website in map" });
      continue;
    }

    try {
      await sleep(800);
      const { html, finalUrl } = await fetchPage(websiteUrl);
      const imageUrlRaw = extractMetaImage(html, finalUrl);
      if (!imageUrlRaw) {
        skipped.push({ id: venue.id, name: venue.name, reason: "no image on site", websiteUrl: finalUrl });
        continue;
      }
      const imageUrl = normalizeImageUrl(imageUrlRaw);
      if (isLikelyLogo(imageUrl)) {
        skipped.push({
          id: venue.id,
          name: venue.name,
          reason: "only logo/thumbnail found",
          websiteUrl: finalUrl,
          imageUrl,
        });
        continue;
      }

      if (DRY_RUN) {
        results.push({
          id: venue.id,
          name: venue.name,
          status: "dry-run",
          websiteUrl: finalUrl,
          imageUrl,
        });
        continue;
      }

      await sleep(400);
      const { buffer, contentType } = await downloadImage(imageUrl);
      const ext = extFromContentType(contentType, imageUrl);
      const storagePath = `system/venues/${venue.id}/cover_${Date.now()}.${ext}`;

      const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
        upsert: true,
        contentType,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await admin
        .from("venues")
        .update({
          image_url: publicUrl,
          website_url: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", venue.id);
      if (updateError) throw new Error(updateError.message);

      results.push({
        id: venue.id,
        name: venue.name,
        status: "updated",
        websiteUrl: finalUrl,
        imageUrl: publicUrl,
      });
    } catch (err) {
      skipped.push({
        id: venue.id,
        name: venue.name,
        reason: err.message ?? String(err),
        websiteUrl,
      });
    }
  }

  const outPath = path.join(__dirname, "fetch-venue-images-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ results, skipped }, null, 2));

  const updated = results.filter((r) => r.status === "updated").length;
  console.log(`Done. ${updated} updated, ${skipped.length} skipped/failed, ${results.length} processed.`);
  if (DRY_RUN) console.log("Dry run — no uploads or DB writes.");
  for (const r of results) {
    console.log(`${r.status === "updated" ? "✓" : "·"} ${r.name} → ${r.imageUrl}`);
  }
  if (skipped.length) {
    console.log("\nSkipped/failed:");
    for (const s of skipped) console.log(`- ${s.name}: ${s.reason}`);
  }
  console.log(`Full log: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
