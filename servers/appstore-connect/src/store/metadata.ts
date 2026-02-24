import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  FieldWithHistory,
  Iteration,
  IterationSource,
  AppInfoData,
  VersionData,
  ReleaseNotesData,
  IAPData,
} from "./types.js";
import {
  getMetadataDir,
  ensureLocaleDir,
  ensureReleaseNotesDir,
  ensureIAPDir,
} from "./config.js";

/** Create an empty FieldWithHistory */
export function emptyField(): FieldWithHistory {
  return { latest: 0, iterations: [] };
}

/** Get the latest content from a FieldWithHistory */
export function getLatestContent(field: FieldWithHistory): string | null {
  if (field.latest === 0 || field.iterations.length === 0) return null;
  const iteration = field.iterations.find((i) => i.id === field.latest);
  return iteration?.content ?? null;
}

/** Append a new iteration to a FieldWithHistory */
export function appendIteration(
  field: FieldWithHistory,
  content: string,
  source: IterationSource,
  context: string
): FieldWithHistory {
  const nextId =
    field.iterations.length > 0
      ? Math.max(...field.iterations.map((i) => i.id)) + 1
      : 1;

  const iteration: Iteration = {
    id: nextId,
    timestamp: new Date().toISOString(),
    content,
    source,
    context,
  };

  return {
    latest: nextId,
    iterations: [...field.iterations, iteration],
  };
}

// --- App Info (app-level: name, subtitle, keywords) ---

function appInfoPath(locale: string): string {
  return join(getMetadataDir(), locale, "app_info.json");
}

export async function readAppInfo(locale: string): Promise<AppInfoData> {
  const path = appInfoPath(locale);
  if (!existsSync(path)) {
    return {
      name: emptyField(),
      subtitle: emptyField(),
      keywords: emptyField(),
    };
  }
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as AppInfoData;
}

export async function writeAppInfo(
  locale: string,
  data: AppInfoData
): Promise<void> {
  await ensureLocaleDir(locale);
  const path = appInfoPath(locale);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// --- Version Data (per-platform: description, promotional_text) ---

function versionDataPath(locale: string, platform: string, field: string): string {
  return join(getMetadataDir(), locale, platform.toLowerCase(), `${field}.json`);
}

export async function readVersionField(
  locale: string,
  platform: string,
  field: "description" | "promotional_text"
): Promise<FieldWithHistory> {
  const path = versionDataPath(locale, platform, field);
  if (!existsSync(path)) return emptyField();
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as FieldWithHistory;
}

export async function writeVersionField(
  locale: string,
  platform: string,
  field: "description" | "promotional_text",
  data: FieldWithHistory
): Promise<void> {
  await ensureLocaleDir(locale, platform);
  const path = versionDataPath(locale, platform, field);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// --- Release Notes ---

function releaseNotesPath(
  locale: string,
  platform: string,
  version: string
): string {
  return join(
    getMetadataDir(),
    locale,
    platform.toLowerCase(),
    "release_notes",
    `${version}.json`
  );
}

export async function readReleaseNotes(
  locale: string,
  platform: string,
  version: string
): Promise<ReleaseNotesData | null> {
  const path = releaseNotesPath(locale, platform, version);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as ReleaseNotesData;
}

export async function writeReleaseNotes(
  locale: string,
  platform: string,
  data: ReleaseNotesData
): Promise<void> {
  await ensureReleaseNotesDir(locale, platform);
  const path = releaseNotesPath(locale, platform, data.version);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** List all release note versions for a locale/platform */
export async function listReleaseNoteVersions(
  locale: string,
  platform: string
): Promise<string[]> {
  const dir = join(
    getMetadataDir(),
    locale,
    platform.toLowerCase(),
    "release_notes"
  );
  if (!existsSync(dir)) return [];
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();
}

// --- IAP ---

function iapPath(locale: string, productId: string): string {
  return join(getMetadataDir(), locale, "iap", `${productId}.json`);
}

export async function readIAP(
  locale: string,
  productId: string
): Promise<IAPData | null> {
  const path = iapPath(locale, productId);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as IAPData;
}

export async function writeIAP(
  locale: string,
  data: IAPData
): Promise<void> {
  await ensureIAPDir(locale);
  const path = iapPath(locale, data.product_id);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** List all IAP product IDs for a locale */
export async function listIAPs(locale: string): Promise<string[]> {
  const dir = join(getMetadataDir(), locale, "iap");
  if (!existsSync(dir)) return [];
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

// --- Generic metadata read/write by field name ---

export type ReadableField =
  | "name"
  | "subtitle"
  | "keywords"
  | "description"
  | "promotional_text"
  | "release_notes"
  | "iap_display_name"
  | "iap_description";

export interface ReadMetadataParams {
  locale: string;
  field: ReadableField;
  platform?: string;
  version?: string;
  product_id?: string;
}

export async function readMetadataField(
  params: ReadMetadataParams
): Promise<FieldWithHistory> {
  const { locale, field, platform, version, product_id } = params;

  switch (field) {
    case "name":
    case "subtitle":
    case "keywords": {
      const appInfo = await readAppInfo(locale);
      return appInfo[field];
    }
    case "description":
    case "promotional_text": {
      if (!platform) throw new Error(`Platform required for ${field}`);
      return readVersionField(locale, platform, field);
    }
    case "release_notes": {
      if (!platform) throw new Error("Platform required for release_notes");
      if (!version) throw new Error("Version required for release_notes");
      const rn = await readReleaseNotes(locale, platform, version);
      return rn?.notes ?? emptyField();
    }
    case "iap_display_name":
    case "iap_description": {
      if (!product_id) throw new Error("product_id required for IAP fields");
      const iap = await readIAP(locale, product_id);
      if (!iap) return emptyField();
      return field === "iap_display_name" ? iap.display_name : iap.description;
    }
    default:
      throw new Error(`Unknown field: ${field}`);
  }
}

export interface WriteMetadataParams {
  locale: string;
  field: ReadableField;
  platform?: string;
  version?: string;
  product_id?: string;
  content: string;
  source: IterationSource;
  context: string;
}

export async function writeMetadataField(
  params: WriteMetadataParams
): Promise<FieldWithHistory> {
  const { locale, field, platform, version, product_id, content, source, context } =
    params;

  switch (field) {
    case "name":
    case "subtitle":
    case "keywords": {
      const appInfo = await readAppInfo(locale);
      appInfo[field] = appendIteration(appInfo[field], content, source, context);
      await writeAppInfo(locale, appInfo);
      return appInfo[field];
    }
    case "description":
    case "promotional_text": {
      if (!platform) throw new Error(`Platform required for ${field}`);
      const existing = await readVersionField(locale, platform, field);
      const updated = appendIteration(existing, content, source, context);
      await writeVersionField(locale, platform, field, updated);
      return updated;
    }
    case "release_notes": {
      if (!platform) throw new Error("Platform required for release_notes");
      if (!version) throw new Error("Version required for release_notes");
      const existing = await readReleaseNotes(locale, platform, version);
      const notes = existing?.notes ?? emptyField();
      const updated = appendIteration(notes, content, source, context);
      await writeReleaseNotes(locale, platform, {
        version,
        notes: updated,
      });
      return updated;
    }
    case "iap_display_name":
    case "iap_description": {
      if (!product_id) throw new Error("product_id required for IAP fields");
      const existing = await readIAP(locale, product_id);
      const iap: IAPData = existing ?? {
        product_id,
        display_name: emptyField(),
        description: emptyField(),
      };
      const targetField = field === "iap_display_name" ? "display_name" : "description";
      iap[targetField] = appendIteration(iap[targetField], content, source, context);
      await writeIAP(locale, iap);
      return iap[targetField];
    }
    default:
      throw new Error(`Unknown field: ${field}`);
  }
}
