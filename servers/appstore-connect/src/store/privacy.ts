import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import { DataFieldSchema, PurposeSchema } from "../data/privacy-taxonomy.js";
import type { PrivacyResponses } from "./types.js";

const PRIVACY_FILE = "privacy.json";

const DeclaredDataTypeSchema = z.object({
  type: DataFieldSchema,
  linkedToUser: z.boolean(),
  usedForTracking: z.boolean(),
  purposes: z.array(PurposeSchema).min(1, "at least one purpose required per declared dataType"),
});

const PrivacyResponsesSchema = z
  .object({
    collectsData: z.boolean(),
    tracking: z.object({
      enabled: z.boolean(),
      domains: z.array(z.string()),
    }),
    dataTypes: z.array(DeclaredDataTypeSchema),
  })
  .superRefine((val, ctx) => {
    if (!val.collectsData && val.dataTypes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "collectsData is false but dataTypes is non-empty — set collectsData true or empty the list",
      });
    }
    if (!val.tracking.enabled && val.tracking.domains.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "tracking.enabled is false but domains is non-empty — set enabled true or clear the domains list",
      });
    }
  });

function getPrivacyPath(): string {
  return join(getAppstoreDir(), PRIVACY_FILE);
}

/** Read .appstore/privacy.json, or null if missing */
export async function readPrivacy(): Promise<PrivacyResponses | null> {
  const path = getPrivacyPath();
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as PrivacyResponses;
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

/** Write .appstore/privacy.json after schema validation */
export async function writePrivacy(cfg: PrivacyResponses): Promise<void> {
  PrivacyResponsesSchema.parse(cfg); // throws on invalid taxonomy/state
  await ensureAppstoreDir();
  await writeFile(getPrivacyPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

/** A "collects nothing" baseline — appropriate for many indie apps */
export function defaultPrivacyResponses(): PrivacyResponses {
  return {
    collectsData: false,
    tracking: { enabled: false, domains: [] },
    dataTypes: [],
  };
}
