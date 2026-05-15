---
name: app-store-toolkit:pull
description: Fetch metadata, listing config, App Privacy, App Review info, and per-locale URLs from App Store Connect into the local store
arguments:
  - name: locale
    description: "Specific locale to pull (pulls all configured locales if omitted)"
    required: false
  - name: platform
    description: "Specific platform to pull (pulls all configured platforms if omitted)"
    required: false
user_invocable: true
---

# /app-store-toolkit:pull

You are pulling metadata from App Store Connect into the local `.appstore/` store.

## Steps

### 1. Load Configuration

Call `store_read_config` to get app_id, configured locales, and platforms.

If no config exists, tell the user to run `/app-store-toolkit:setup` first.
If no app_id is set, first resolve it:
- Call `asc_get_app` with the configured bundle_id
- Save the returned app_id to config with `store_write_config`

### 2. Pull App-Level Info (name, subtitle)

For each configured locale (or the specified locale):
1. Call `asc_get_app_info` with the app_id and locale filter
2. For each returned localization, save name and subtitle using `store_write_metadata` with:
   - `source`: `"pulled_from_asc"`
   - `context`: `"Pulled from App Store Connect"`

### 3. Pull Version-Level Data (description, keywords, promo, what's new)

For each configured platform (or the specified platform):
1. Call `asc_get_version` to get the latest version
2. Call `asc_get_version_localizations` with the version ID
3. For each locale, save:
   - description → `store_write_metadata` with field `"description"`
   - keywords → `store_write_metadata` with field `"keywords"` (saved at app-level in our store)
   - promotionalText → `store_write_metadata` with field `"promotional_text"`
   - whatsNew → `store_write_metadata` with field `"release_notes"` (use the version string)

Use `source: "pulled_from_asc"` for all.

### 4. Pull IAPs (if any)

1. Call `asc_get_iaps` with the app_id
2. For each IAP, call `asc_get_iap_localizations`
3. Save display_name and description for each locale

### 5. Report Results

Show a summary of what was pulled:
```
Pulled from App Store Connect:
═══════════════════════════════
Locales: en-US, ja, de-DE
Platform: IOS (v2.1.0)

  en-US:
    name: "My App" (14 chars)
    subtitle: "Do cool things" (14 chars)
    keywords: "productivity,tasks..." (87 chars)
    description: 2341 chars
    promotional_text: 42 chars
    release_notes (v2.1.0): 847 chars

  ja:
    name: "マイアプリ" (5 chars)
    ...

IAPs pulled: 2 (premium_monthly, premium_yearly)
```

### 6. Suggest Next Steps

- "Run `/app-store-toolkit:list metadata` to see all pulled data"
- "Run `/app-store-toolkit:aso` to generate improved metadata"
- "Run `/app-store-toolkit:validate` to check character limits"

## Pulling listing config

For each section, read from ASC and merge into a `ListingConfig` object, then write via `store_write_listing`.

- **Categories**: read `appInfos[].attributes.{primaryCategory, secondaryCategory}`.
- **Age rating**: read `appInfos[].relationships.ageRatingDeclaration → attributes.{...}` and convert each camelCase attribute back to UPPER_SNAKE question id (`violenceCartoonOrFantasy → VIOLENCE_CARTOON_OR_FANTASY`).
- **Pricing**: read the latest `appPriceSchedules` with `included=manualPrices` and reconstruct `{ defaultTier, perTerritory }`.
- **Availability**: read `appAvailabilities → availableTerritories` and convert alpha-3 → alpha-2.
- **Encryption**: read the editable build's `usesNonExemptEncryption` and `exportComplianceCode`.

Note: pulling pricing and availability requires API calls not yet wrapped (they're write-side in M1). For pull, hand-roll with `asc_get_*` style helpers as needed; the wrappers can be added in a follow-on. For M1 it's acceptable to pull only categories, age rating, encryption — and document that pricing/availability pull is a known gap.

## Pulling App Privacy

Call `GET /v1/apps/{appId}/dataUsages` (no wrapper exists yet — make the call inline using the existing `ascRequest` if needed, or skip with a note for M1). Reconstruct a `PrivacyResponses` object and write via `store_write_privacy`.

## Pulling App Review information

Read `appStoreReviewDetails` for the editable version. Map the attributes back into a `ReviewInfo` object and write via `store_write_review`.

## Pulling URL fields

For each locale, read `marketingUrl` and `supportUrl` from `appStoreVersionLocalizations` and `privacyPolicyUrl` from `appInfoLocalizations`. Write them into the per-locale metadata file alongside the existing fields.
