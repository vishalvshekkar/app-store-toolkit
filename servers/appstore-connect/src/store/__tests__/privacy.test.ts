import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPrivacy, writePrivacy, defaultPrivacyResponses } from "../privacy.js";
import type { PrivacyResponses } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-privacy-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("privacy store", () => {
  it("returns null when privacy.json does not exist", async () => {
    expect(await readPrivacy()).toBeNull();
  });

  it("writes and reads back a privacy config", async () => {
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "CRASH_DATA", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    };
    await writePrivacy(cfg);
    const round = await readPrivacy();
    expect(round).toEqual(cfg);
  });

  it("rejects an invalid data field at write time", async () => {
    const bad = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "MADE_UP_FIELD", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    } as unknown as PrivacyResponses;
    await expect(writePrivacy(bad)).rejects.toThrow(/MADE_UP_FIELD/);
  });

  it("rejects a non-empty dataTypes when collectsData is false", async () => {
    const bad: PrivacyResponses = {
      collectsData: false,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "CRASH_DATA", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    };
    await expect(writePrivacy(bad)).rejects.toThrow(/collectsData/);
  });

  it("defaultPrivacyResponses() returns a 'collects nothing' baseline", () => {
    const d = defaultPrivacyResponses();
    expect(d.collectsData).toBe(false);
    expect(d.dataTypes).toEqual([]);
    expect(d.tracking.enabled).toBe(false);
  });

  it("rejects tracking.enabled=false with non-empty domains", async () => {
    const bad: PrivacyResponses = {
      collectsData: false,
      tracking: { enabled: false, domains: ["analytics.example.com"] },
      dataTypes: [],
    };
    await expect(writePrivacy(bad)).rejects.toThrow(/tracking/);
  });

  it("rejects a declared dataType with empty purposes", async () => {
    const bad: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "CRASH_DATA", linkedToUser: false, usedForTracking: false, purposes: [] },
      ],
    };
    await expect(writePrivacy(bad)).rejects.toThrow(/purpose/);
  });
});
