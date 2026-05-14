import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readListing, writeListing, defaultListingConfig } from "../listing.js";
import type { ListingConfig } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-listing-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("listing store", () => {
  it("returns null when listing.json does not exist", async () => {
    expect(await readListing()).toBeNull();
  });

  it("writes and reads back a listing config", async () => {
    const cfg: ListingConfig = {
      categories: { primary: "PRODUCTIVITY", secondary: "UTILITIES" },
      ageRating: { answers: [{ questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" }] },
      pricing: { defaultTier: 0, perTerritory: [] },
      availability: { territories: ["US", "GB", "DE"] },
      encryption: { usesEncryption: false, exemptions: [] },
    };
    await writeListing(cfg);
    const round = await readListing();
    expect(round).toEqual(cfg);
  });

  it("defaultListingConfig() returns a free-app US-only sane default", () => {
    const d = defaultListingConfig();
    expect(d.pricing.defaultTier).toBe(0);
    expect(d.availability.territories).toContain("US");
    expect(d.encryption.usesEncryption).toBe(false);
  });
});
