import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import type { ShipState } from "./types.js";

const SHIP_STATE_FILE = "ship-state.json";

function getShipStatePath(): string {
  return join(getAppstoreDir(), SHIP_STATE_FILE);
}

export async function readShipState(): Promise<ShipState | null> {
  const path = getShipStatePath();
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as ShipState;
  } catch (err) {
    throw new Error(`${path} (ship-state.json) is not valid JSON: ${(err as Error).message}`);
  }
}

export async function writeShipState(state: ShipState): Promise<void> {
  await ensureAppstoreDir();
  await writeFile(getShipStatePath(), JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export async function clearShipState(): Promise<void> {
  try {
    await unlink(getShipStatePath());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function initialShipState(version: string): ShipState {
  return {
    schema_version: 1,
    version,
    started_at: new Date().toISOString(),
    current_phase: "audit",
    completed_phases: [],
    audit_findings_ref: null,
    waivers: [],
  };
}
