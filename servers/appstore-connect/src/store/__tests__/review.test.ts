import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readReview, writeReview, defaultReviewInfo } from "../review.js";
import type { ReviewInfo } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-review-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("review store", () => {
  it("returns null when review.json does not exist", async () => {
    expect(await readReview()).toBeNull();
  });

  it("writes and reads back a review info", async () => {
    const cfg: ReviewInfo = {
      contact: { firstName: "Vishal", lastName: "S", email: "v@example.com", phone: "+15555550100" },
      demo: { required: false },
      notes: "No special instructions.",
    };
    await writeReview(cfg);
    const round = await readReview();
    expect(round).toEqual(cfg);
  });

  it("rejects writes with demo.required=true but missing username/password", async () => {
    const bad: ReviewInfo = {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: true },
      notes: "",
    };
    await expect(writeReview(bad)).rejects.toThrow(/demo/);
  });

  it("defaultReviewInfo returns an empty-but-valid baseline", () => {
    const d = defaultReviewInfo();
    expect(d.demo.required).toBe(false);
    expect(d.contact.email).toBe("");
  });
});
