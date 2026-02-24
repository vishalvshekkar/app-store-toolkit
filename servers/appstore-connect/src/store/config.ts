import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AppConfig, LocalConfig } from "./types.js";

const APPSTORE_DIR = ".appstore";
const CONFIG_FILE = "config.json";
const LOCAL_CONFIG_FILE = "config.local.json";
const METADATA_DIR = "metadata";
const GITIGNORE_FILE = ".gitignore";

/** Get the .appstore directory path relative to cwd */
export function getAppstoreDir(): string {
  return join(process.cwd(), APPSTORE_DIR);
}

/** Get the metadata directory path */
export function getMetadataDir(): string {
  return join(getAppstoreDir(), METADATA_DIR);
}

/** Ensure the .appstore directory structure exists */
export async function ensureAppstoreDir(): Promise<void> {
  const appstoreDir = getAppstoreDir();
  const metadataDir = getMetadataDir();

  if (!existsSync(appstoreDir)) {
    await mkdir(appstoreDir, { recursive: true });
  }
  if (!existsSync(metadataDir)) {
    await mkdir(metadataDir, { recursive: true });
  }

  // Ensure .gitignore exists in .appstore/
  const gitignorePath = join(appstoreDir, GITIGNORE_FILE);
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, "config.local.json\n", "utf-8");
  }
}

/** Read the main config */
export async function readConfig(): Promise<AppConfig | null> {
  const configPath = join(getAppstoreDir(), CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

/** Write the main config */
export async function writeConfig(config: AppConfig): Promise<void> {
  await ensureAppstoreDir();
  const configPath = join(getAppstoreDir(), CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Read the local (secret) config */
export async function readLocalConfig(): Promise<LocalConfig | null> {
  const configPath = join(getAppstoreDir(), LOCAL_CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw) as LocalConfig;
}

/** Write the local (secret) config */
export async function writeLocalConfig(config: LocalConfig): Promise<void> {
  await ensureAppstoreDir();
  const configPath = join(getAppstoreDir(), LOCAL_CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Ensure locale directory structure exists */
export async function ensureLocaleDir(
  locale: string,
  platform?: string
): Promise<string> {
  const metadataDir = getMetadataDir();
  let dir = join(metadataDir, locale);
  if (platform) {
    dir = join(dir, platform.toLowerCase());
  }
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

/** Ensure release_notes directory exists */
export async function ensureReleaseNotesDir(
  locale: string,
  platform: string
): Promise<string> {
  const platformDir = await ensureLocaleDir(locale, platform);
  const releaseNotesDir = join(platformDir, "release_notes");
  if (!existsSync(releaseNotesDir)) {
    await mkdir(releaseNotesDir, { recursive: true });
  }
  return releaseNotesDir;
}

/** Ensure IAP directory exists */
export async function ensureIAPDir(locale: string): Promise<string> {
  const localeDir = await ensureLocaleDir(locale);
  const iapDir = join(localeDir, "iap");
  if (!existsSync(iapDir)) {
    await mkdir(iapDir, { recursive: true });
  }
  return iapDir;
}

/** Read the locales list */
export async function readLocales(): Promise<string[]> {
  const localesPath = join(getMetadataDir(), "_locales.json");
  if (!existsSync(localesPath)) return [];
  const raw = await readFile(localesPath, "utf-8");
  return JSON.parse(raw) as string[];
}

/** Write the locales list */
export async function writeLocales(locales: string[]): Promise<void> {
  await ensureAppstoreDir();
  const localesPath = join(getMetadataDir(), "_locales.json");
  await writeFile(localesPath, JSON.stringify(locales, null, 2) + "\n", "utf-8");
}
