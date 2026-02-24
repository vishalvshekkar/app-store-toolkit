import { z } from "zod";

export const ReadableFieldEnum = z.enum([
  "name",
  "subtitle",
  "keywords",
  "description",
  "promotional_text",
  "release_notes",
  "iap_display_name",
  "iap_description",
]);

export const IterationSourceEnum = z.enum([
  "ai_generated",
  "user_edited",
  "pulled_from_asc",
  "translated",
]);

export const StoreReadMetadataSchema = z.object({
  locale: z.string().describe("Locale code (e.g., en-US, ja, de-DE)"),
  field: ReadableFieldEnum.describe("Metadata field to read"),
  platform: z.string().optional().describe("Platform (ios, macos) — required for version-level fields"),
  version: z.string().optional().describe("Version string — required for release_notes"),
  product_id: z.string().optional().describe("IAP product ID — required for IAP fields"),
});

export const StoreWriteMetadataSchema = z.object({
  locale: z.string().describe("Locale code (e.g., en-US, ja, de-DE)"),
  field: ReadableFieldEnum.describe("Metadata field to write"),
  platform: z.string().optional().describe("Platform (ios, macos) — required for version-level fields"),
  version: z.string().optional().describe("Version string — required for release_notes"),
  product_id: z.string().optional().describe("IAP product ID — required for IAP fields"),
  content: z.string().describe("The content to write"),
  source: IterationSourceEnum.describe("Source of this content"),
  context: z.string().describe("Context/reason for this iteration"),
});

export const StoreValidateSchema = z.object({
  locale: z.string().optional().describe("Locale to validate (all if omitted)"),
  platform: z.string().optional().describe("Platform to validate (all if omitted)"),
});

export const StoreListSchema = z.object({
  type: z
    .enum(["metadata", "locales", "history", "iap", "release_notes"])
    .describe("What to list"),
  locale: z.string().optional().describe("Locale to list for (defaults to primary)"),
  platform: z.string().optional().describe("Platform to list for"),
  field: ReadableFieldEnum.optional().describe("Field for history listing"),
  product_id: z.string().optional().describe("IAP product ID for history"),
  version: z.string().optional().describe("Version for release_notes history"),
});

export const StoreReadConfigSchema = z.object({});

export const StoreWriteConfigSchema = z.object({
  bundle_id: z.string().optional(),
  app_id: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  primary_locale: z.string().optional(),
  locales: z.array(z.string()).optional(),
  voice: z
    .object({
      tone: z.enum([
        "professional",
        "casual",
        "playful",
        "technical",
        "minimal",
        "witty",
        "custom",
      ]),
      style_notes: z.string().optional(),
      target_audience: z.string().optional(),
    })
    .optional(),
  changelog: z
    .object({
      source: z.enum(["git", "manual", "both"]),
      conventional_commits: z.boolean(),
    })
    .optional(),
});

export const StoreWriteLocalConfigSchema = z.object({
  key_id: z.string().describe("App Store Connect API Key ID"),
  issuer_id: z.string().describe("App Store Connect Issuer ID"),
  p8_key_path: z.string().describe("Absolute path to .p8 private key file"),
});
