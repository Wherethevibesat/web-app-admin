import fs from "fs";
import path from "path";

let cached: Record<string, string> | null = null;

/** Read .env.local when Next.js has not injected server vars (common in local dev). */
export function getEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  if (!cached) {
    cached = {};
    try {
      const filePath = path.join(process.cwd(), ".env.local");
      const text = fs.readFileSync(filePath, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        cached[key] = value;
      }
    } catch {
      cached = {};
    }
  }

  return cached[name];
}
