import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readAssetsLock,
  writeAssetsLock,
  emptyAssetsLock,
} from "../assets-lock.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "asset-lock-"));
  process.chdir(tempDir);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("assets-lock store", () => {
  it("readAssetsLock returns null when the file does not exist", async () => {
    const lock = await readAssetsLock("en-US", "ios");
    expect(lock).toBeNull();
  });

  it("writeAssetsLock then readAssetsLock round-trips", async () => {
    const lock = emptyAssetsLock();
    lock.screenshots["iphone-6.7"] = [
      {
        file: "01-home.png",
        sha256: "abc",
        asc_id: "ai_1",
        asc_checksum_md5: "md5_1",
        width: 1290,
        height: 2796,
        uploaded_at: "2026-05-15T14:00:00Z",
      },
    ];
    await writeAssetsLock("en-US", "ios", lock);
    const read = await readAssetsLock("en-US", "ios");
    expect(read).toEqual(lock);
  });

  it("readAssetsLock throws with file path on invalid JSON", async () => {
    const path = join(tempDir, ".appstore", "metadata", "en-US", "ios", "assets.lock.json");
    await mkdir(join(tempDir, ".appstore", "metadata", "en-US", "ios"), { recursive: true });
    await writeFile(path, "{ not json", "utf-8");
    await expect(readAssetsLock("en-US", "ios")).rejects.toThrow(
      /assets\.lock\.json.*is not valid JSON/
    );
  });

  it("writeAssetsLock creates the directory if missing", async () => {
    await writeAssetsLock("de-DE", "ios", emptyAssetsLock());
    const path = join(tempDir, ".appstore", "metadata", "de-DE", "ios", "assets.lock.json");
    const raw = await readFile(path, "utf-8");
    expect(JSON.parse(raw).schema_version).toBe(1);
  });
});
