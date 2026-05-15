import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readShipState,
  writeShipState,
  clearShipState,
  initialShipState,
} from "../ship-state.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "ship-state-"));
  process.chdir(tempDir);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("ship-state store", () => {
  it("readShipState returns null when no state file exists", async () => {
    expect(await readShipState()).toBeNull();
  });

  it("write then read round-trips", async () => {
    const state = initialShipState("1.0.0");
    state.completed_phases = ["audit", "push-metadata"];
    state.current_phase = "push-listing";
    await writeShipState(state);
    expect(await readShipState()).toEqual(state);
  });

  it("clearShipState removes the file", async () => {
    await writeShipState(initialShipState("1.0.0"));
    await clearShipState();
    expect(await readShipState()).toBeNull();
  });

  it("clearShipState is a no-op when no state file exists", async () => {
    await expect(clearShipState()).resolves.toBeUndefined();
  });

  it("initialShipState returns a sensible starting state", () => {
    const s = initialShipState("1.2.0");
    expect(s.schema_version).toBe(1);
    expect(s.version).toBe("1.2.0");
    expect(s.current_phase).toBe("audit");
    expect(s.completed_phases).toEqual([]);
    expect(s.waivers).toEqual([]);
    expect(s.audit_findings_ref).toBeNull();
    expect(new Date(s.started_at).toString()).not.toBe("Invalid Date");
  });
});
