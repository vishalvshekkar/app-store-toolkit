import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { getAppstoreDir } from "./config.js";
import type { AssetsLock } from "./types.js";

function getLockPath(locale: string, platform: string): string {
  return join(getAppstoreDir(), "metadata", locale, platform, "assets.lock.json");
}

export async function readAssetsLock(
  locale: string,
  platform: string
): Promise<AssetsLock | null> {
  const path = getLockPath(locale, platform);
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as AssetsLock;
  } catch (err) {
    throw new Error(
      `${path} (assets.lock.json) is not valid JSON: ${(err as Error).message}`
    );
  }
}

export async function writeAssetsLock(
  locale: string,
  platform: string,
  lock: AssetsLock
): Promise<void> {
  const path = getLockPath(locale, platform);
  if (!existsSync(dirname(path))) {
    await mkdir(dirname(path), { recursive: true });
  }
  await writeFile(path, JSON.stringify(lock, null, 2) + "\n", "utf-8");
}

export function emptyAssetsLock(): AssetsLock {
  return { schema_version: 1, screenshots: {}, previews: {} };
}
