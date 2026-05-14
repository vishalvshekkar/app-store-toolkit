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

export const AscSetCategoriesSchema = z.object({
  app_info_id: z.string().describe("The editable appInfo resource ID"),
  primary: z.string().describe("Primary category enum (e.g., PRODUCTIVITY)"),
  secondary: z.string().optional().describe("Optional secondary category"),
});

export const AscSetAgeRatingSchema = z.object({
  declaration_id: z.string().describe("The age rating declaration resource ID"),
  answers: z
    .array(
      z.object({
        questionId: z.string().describe("Apple question id (UPPER_SNAKE_CASE)"),
        level: z.string().describe("Answer level for this question"),
      })
    )
    .describe("Full set of answers to push"),
});

export const AscSetPricingSchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  default_tier: z.number().int().describe("Apple price tier id used as USA base"),
  per_territory: z
    .array(
      z.object({
        territory: z.string().describe("ISO 3166-1 alpha-2 territory code"),
        price_tier: z.number().int(),
      })
    )
    .default([])
    .describe("Optional per-territory tier overrides"),
});

export const AscSetAvailabilitySchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  territories: z
    .array(z.string())
    .describe("ISO 3166-1 alpha-2 territory codes the app should be available in"),
});

export const AscSetReviewInfoSchema = z.object({
  review_detail_id: z.string().describe("The version's appStoreReviewDetail resource ID"),
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  demo: z.object({
    required: z.boolean(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  notes: z.string(),
});

export const AscSetPrivacyResponsesSchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  responses: z
    .object({
      collectsData: z.boolean(),
      tracking: z.object({
        enabled: z.boolean(),
        domains: z.array(z.string()),
      }),
      dataTypes: z.array(
        z.object({
          type: z.string(),
          linkedToUser: z.boolean(),
          usedForTracking: z.boolean(),
          purposes: z.array(z.string()),
        })
      ),
    })
    .describe("Full privacy responses; replaces existing ASC declarations"),
});
