import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import type { ListingConfig } from "./types.js";

const LISTING_FILE = "listing.json";

function getListingPath(): string {
  return join(getAppstoreDir(), LISTING_FILE);
}

/** Read .appstore/listing.json, or null if it doesn't exist */
export async function readListing(): Promise<ListingConfig | null> {
  const path = getListingPath();
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as ListingConfig;
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

/** Write .appstore/listing.json (creates the .appstore dir if needed) */
export async function writeListing(cfg: ListingConfig): Promise<void> {
  await ensureAppstoreDir();
  await writeFile(getListingPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

/** A sane default for a new free-tier US-only iOS app */
export function defaultListingConfig(): ListingConfig {
  return {
    categories: { primary: "PRODUCTIVITY" },
    ageRating: { answers: [] },
    pricing: { defaultTier: 0, perTerritory: [] },
    availability: { territories: ["US"] },
    encryption: { usesEncryption: false, exemptions: [] },
  };
}
