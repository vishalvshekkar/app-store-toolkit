# MCP Tools Reference

This document lists all 51 typed tools exposed by the bundled MCP server. These are the low-level primitives that skills (`/app-store-toolkit:setup`, `/app-store-toolkit:push`, etc.) call through the MCP protocol. Most users never invoke them directly—this reference is for transparency, debugging, and contributors.

For the user-facing layer, see [commands.md](./commands.md). For data schemas, see [file-schemas.md](./file-schemas.md).

## Summary

| Category | Count | Examples |
|----------|-------|----------|
| ASC API readers | 11 | `asc_get_app`, `asc_get_version`, `asc_list_builds` |
| ASC API mutators (M1) | 11 | `asc_set_categories`, `asc_update_version_localization` |
| ASC API assets (M2) | 4 | `asc_upload_screenshot`, `asc_delete_app_preview` |
| ASC API release (M3) | 4 | `asc_create_version`, `asc_submit_for_review` |
| Local store readers/writers | 16 | `store_read_metadata`, `store_write_config` |
| Utility (local-only) | 3 | `assets_validate_dimensions`, `audit_prepare_cross_surface` |
| **Total** | **51** | |

---

## ASC API Readers

### asc_get_app

Find an app in App Store Connect by its bundle identifier.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bundle_id` | string | yes | The app's bundle identifier (e.g., `com.example.app`) |

**Returns:** JSON object with `id`, `name`, `bundleId`, `primaryLocale`

**ASC endpoint:** GET `/v1/apps?filter[bundleId]={bundleId}`

**Used by:** `/app-store-toolkit:setup`, ASO generation skills

---

### asc_get_app_info

Fetch app-level localizations (name, subtitle) from App Store Connect.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `locale` | string | no | Filter results to a single locale |

**Returns:** JSON object with `appInfoId` and array of localizations (id, locale, name, subtitle)

**ASC endpoint:** GET `/v1/appInfos?filter[app]={appId}` + GET `/v1/appInfos/{id}/appInfoLocalizations`

**Used by:** Pull workflow, validation

---

### asc_get_version

Fetch the latest editable App Store version for a given platform.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `platform` | string | yes | Platform: `IOS`, `MAC_OS`, `TV_OS`, or `VISION_OS` |

**Returns:** JSON object with `id`, `platform`, `versionString`, `state`

**ASC endpoint:** GET `/v1/appStoreVersions?filter[app]={appId}&filter[platform]={platform}`

**Used by:** Push workflow, release tools

---

### asc_get_version_localizations

Fetch version localizations (description, keywords, promotional text, release notes).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version_id` | string | yes | The app store version ID |
| `locale` | string | no | Filter results to a single locale |

**Returns:** Array of localizations with id, locale, description, keywords, promotionalText, whatsNew

**ASC endpoint:** GET `/v1/appStoreVersions/{id}/appStoreVersionLocalizations`

**Used by:** Pull workflow, comparison tools

---

### asc_get_iaps

List in-app purchases for an app.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |

**Returns:** Array of IAPs with id, name, productId, type, state

**ASC endpoint:** GET `/v1/inAppPurchases?filter[app]={appId}`

**Used by:** IAP generation, pull workflow

---

### asc_get_iap_localizations

Fetch localizations for a specific in-app purchase.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `iap_id` | string | yes | The IAP resource ID |
| `locale` | string | no | Filter results to a single locale |

**Returns:** Array of IAP localizations with id, locale, name, description

**ASC endpoint:** GET `/v1/inAppPurchases/{id}/inAppPurchaseLocalizations`

**Used by:** Pull workflow, IAP management

---

### asc_get_reviews

Fetch customer reviews for an app.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `sort` | string | no | Sort order: `-createdDate` (newest), `createdDate` (oldest), `-rating`, `rating` |
| `limit` | number | no | Max reviews to return; default 20 |

**Returns:** Array of reviews with id, rating, title, body, reviewer, date, territory

**ASC endpoint:** GET `/v1/customerReviews?filter[app]={appId}`

**Used by:** Review management skill

---

### asc_list_screenshots

List screenshots in an appScreenshotSet.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `set_id` | string | yes | The appScreenshotSet resource ID |

**Returns:** Array of screenshot objects with id, fileName, sourceFileChecksum, state

**ASC endpoint:** GET `/v1/appScreenshotSets/{id}/appScreenshots`

**Used by:** Asset management, screenshot deletion

---

### asc_list_app_previews

List app previews in an appPreviewSet.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `set_id` | string | yes | The appPreviewSet resource ID |

**Returns:** Array of preview objects with id, fileName, sourceFileChecksum, state

**ASC endpoint:** GET `/v1/appPreviewSets/{id}/appPreviews`

**Used by:** Asset management, preview deletion

---

### asc_list_builds

List TestFlight builds for an app with processing state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |

**Returns:** Array of builds with id, versionString, buildNumber, uploadedDate, processingState, usesNonExemptEncryption

**ASC endpoint:** GET `/v1/builds?filter[app]={appId}`

**Used by:** Build attachment, release workflow

---

### asc_get_submission_state

Read the current appStoreState of a version (one-shot, no polling).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version_id` | string | yes | The version ID |

**Returns:** JSON object with version_id and state (e.g., `READY_FOR_SALE`, `IN_REVIEW`, `REJECTED`)

**ASC endpoint:** GET `/v1/appStoreVersions/{id}`

**History:** None (read-only)

**Used by:** Monitoring, /ship workflow

---

## ASC API Mutators (M1)

### asc_update_app_info

Update app-level localization (name, subtitle, privacy policy URL).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localization_id` | string | yes | The app info localization ID |
| `name` | string | no | New app name (≤30 chars) |
| `subtitle` | string | no | New app subtitle (≤30 chars) |
| `privacyPolicyUrl` | string | no | Privacy policy URL for this locale |

**Returns:** JSON object with success, id, name, subtitle, privacyPolicyUrl

**ASC endpoint:** PATCH `/v1/appInfoLocalizations/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`, ASO generation

---

### asc_set_categories

Set primary and optional secondary App Store category.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_info_id` | string | yes | The editable appInfo resource ID |
| `primary` | string | yes | Primary category enum (e.g., `PRODUCTIVITY`) |
| `secondary` | string | no | Optional secondary category |

**Returns:** JSON object with success, id, primaryCategory, secondaryCategory

**ASC endpoint:** PATCH `/v1/appInfos/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_set_age_rating

Set age rating answers on the editable appInfo's age rating declaration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `declaration_id` | string | yes | The age rating declaration resource ID |
| `answers` | array | yes | Array of `{questionId: string, level: string}` objects |

**Returns:** JSON object with success and id

**ASC endpoint:** PATCH `/v1/ageRatingDeclarations/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_set_pricing

Set the app's price schedule (USA base tier + optional per-territory overrides).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `default_tier` | number | yes | Apple price tier ID used as USA base |
| `per_territory` | array | no | Array of `{territory: string, price_tier: number}` objects |

**Returns:** JSON object with success and id

**ASC endpoint:** POST `/v1/appPriceSchedules` or PATCH existing

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_set_availability

Set the territories the app is available in.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `territories` | array | yes | Array of ISO 3166-1 alpha-2 territory codes |

**Returns:** JSON object with success and id

**ASC endpoint:** PATCH `/v1/appAvailabilities/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_set_privacy_responses

Replace the app's App Privacy declarations with the supplied responses.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `responses` | object | yes | Full PrivacyResponses object with collectsData, tracking, dataTypes |

**Returns:** JSON object with success, app_id, replaced

**ASC endpoint:** PATCH `/v1/appDataUsages/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`, privacy generation skill

---

### asc_set_review_info

Set App Review information (contact, demo credentials, notes).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `review_detail_id` | string | yes | The version's appStoreReviewDetail resource ID |
| `contact` | object | yes | `{firstName, lastName, email, phone}` |
| `demo` | object | yes | `{required: bool, username?: string, password?: string}` |
| `notes` | string | yes | App Review notes |

**Returns:** JSON object with success and id

**ASC endpoint:** PATCH `/v1/appStoreReviewDetails/{id}`

**History stream:** `pushes` (password redacted in history)

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_set_encryption_compliance

Set encryption compliance answer on a build.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `build_id` | string | yes | The build resource ID |
| `uses_encryption` | boolean | yes | Whether the build uses non-exempt encryption |
| `exemptions` | array | no | Optional export-compliance code(s) |

**Returns:** JSON object with success and id

**ASC endpoint:** PATCH `/v1/builds/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`

---

### asc_update_version_localization

Update version localization (description, keywords, promo, release notes, marketing/support URLs).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localization_id` | string | yes | The version localization ID |
| `description` | string | no | New description (≤4000 chars) |
| `keywords` | string | no | New keywords (≤100 chars) |
| `promotionalText` | string | no | New promotional text (≤170 chars) |
| `whatsNew` | string | no | New What's New text (≤4000 chars) |
| `marketingUrl` | string | no | Marketing URL for this locale |
| `supportUrl` | string | no | Support URL for this locale |

**Returns:** JSON object with success, id, locale

**ASC endpoint:** PATCH `/v1/appStoreVersionLocalizations/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`, ASO generation

---

### asc_update_iap_localization

Update an in-app purchase localization (name, description).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localization_id` | string | yes | The IAP localization ID |
| `name` | string | no | New display name (≤30 chars) |
| `description` | string | no | New description (≤45 chars) |

**Returns:** JSON object with success, id, name, description

**ASC endpoint:** PATCH `/v1/inAppPurchaseLocalizations/{id}`

**History stream:** `pushes`

**Added in:** M1

**Used by:** `/app-store-toolkit:push`, IAP generation

---

### asc_post_review_response

Post a response to a customer review.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `review_id` | string | yes | The customer review ID |
| `response_body` | string | yes | The response text |

**Returns:** JSON object with success, id, responseBody, state

**ASC endpoint:** POST `/v1/customerReviews/{id}/responses`

**History stream:** `pushes`

**Added in:** M1

**Used by:** Review management skill

---

## ASC API Assets (M2)

### asc_upload_screenshot

Upload a PNG screenshot to ASC via reserve → PUT → commit and update the lock.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `set_id` | string | yes | The appScreenshotSet resource ID |
| `file_path` | string | yes | Absolute or repo-relative path to the PNG file |
| `locale` | string | yes | Locale code (used for the lock entry) |
| `platform` | string | yes | Platform like `ios` (used for the lock entry) |
| `device` | string | yes | Human-readable device key (e.g., `iphone-6.7`) |

**Returns:** JSON object with uploaded, asc_id, file, sha256

**ASC flow:** Reserve → PUT (with signed URLs) → Commit

**History stream:** `pushes`

**Validation:** Verifies PNG dimensions against device spec; fails if not in expected sizes

**Added in:** M2

**Used by:** Asset upload workflow

---

### asc_upload_app_preview

Upload an MP4 App Preview to ASC and update the lock.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `set_id` | string | yes | The appPreviewSet resource ID |
| `file_path` | string | yes | Absolute or repo-relative path to the MP4 file |
| `locale` | string | yes | Locale code |
| `platform` | string | yes | Platform like `ios` |
| `device` | string | yes | Device key (e.g., `iphone-6.7`) |
| `cover_frame_seconds` | number | no | Cover frame timestamp in seconds |

**Returns:** JSON object with uploaded, asc_id, file, sha256

**ASC flow:** Reserve → PUT → Commit (with optional cover frame timecode)

**History stream:** `pushes`

**Validation:** Verifies MP4 dimensions against device spec

**Added in:** M2

**Used by:** Preview upload workflow

---

### asc_delete_screenshot

Delete a screenshot from ASC and null the matching lock entry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | string | yes | The appScreenshot resource ID |
| `locale` | string | yes | Locale (to update the lock) |
| `platform` | string | yes | Platform (to update the lock) |
| `device` | string | yes | Device (to update the lock) |

**Returns:** Plain text confirmation message

**ASC endpoint:** DELETE `/v1/appScreenshots/{id}`

**History stream:** `pushes`

**Added in:** M2

**Used by:** Asset cleanup workflow

---

### asc_delete_app_preview

Delete an app preview from ASC and null the matching lock entry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | string | yes | The appPreview resource ID |
| `locale` | string | yes | Locale (to update the lock) |
| `platform` | string | yes | Platform (to update the lock) |
| `device` | string | yes | Device (to update the lock) |

**Returns:** Plain text confirmation message

**ASC endpoint:** DELETE `/v1/appPreviews/{id}`

**History stream:** `pushes`

**Added in:** M2

**Used by:** Asset cleanup workflow

---

## ASC API Release (M3)

### asc_create_version

Create a new editable App Store version (for v1.1+ releases).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `version_string` | string | yes | Semantic version like `1.1.0` |
| `platform` | string | no | Platform: `IOS` (default), `MAC_OS`, `TV_OS` |

**Returns:** JSON object with id, versionString, platform, appStoreState

**ASC endpoint:** POST `/v1/appStoreVersions`

**History stream:** `pushes`

**Added in:** M3

**Used by:** Release workflow, `/ship`

---

### asc_attach_build

Attach a TestFlight build to an editable App Store version.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version_id` | string | yes | The editable version's ID |
| `build_id` | string | yes | The build's ID (must be VALID state) |

**Returns:** Plain text confirmation message

**ASC endpoint:** PATCH `/v1/appStoreVersions/{id}` (set build relationship)

**History stream:** `pushes`

**Added in:** M3

**Used by:** Release workflow, build attachment step

---

### asc_set_release_strategy

Set the release strategy on an editable version.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version_id` | string | yes | The editable version's ID |
| `strategy` | object | yes | Discriminated union: `{type: "AFTER_APPROVAL"}`, `{type: "MANUAL"}`, `{type: "SCHEDULED", earliestReleaseDate: string}`, or `{type: "PHASED"}` |

**Returns:** Plain text confirmation message

**ASC endpoint:** PATCH `/v1/appStoreVersions/{id}`

**History stream:** `pushes`

**Added in:** M3

**Used by:** Release workflow, strategy selection

---

### asc_submit_for_review

Submit a version for App Review. With `dry_run=true`, performs readiness checks without calling ASC.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_id` | string | yes | The app's App Store Connect ID |
| `version_id` | string | yes | The version ID to submit |
| `dry_run` | boolean | no | If true, run readiness checks only; default false |

**Returns:** 
- **dry_run=true:** JSON with `ready` (bool), `blockers` (array), `would_submit` (object)
- **dry_run=false:** JSON with `submitted` (bool) and submission details

**Readiness checks (dry_run):**
- Build attached and in VALID state
- Encryption compliance set
- Privacy responses published
- App Review info complete (contact, notes)
- Categories set

**ASC endpoint:** POST `/v1/appStoreVersionSubmissions`

**History stream:** `submissions` (on real submit)

**Added in:** M3

**Used by:** Release workflow, `/ship`

---

## Store Tools (Local)

### store_read_config

Read the current app-store-toolkit configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** JSON object with bundle_id, app_id, platforms, primary_locale, locales, voice, changelog

**File:** `.appstore/config.json` (committed)

**Used by:** All skills (introspection)

---

### store_write_config

Write or update the app-store-toolkit configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bundle_id` | string | no | App bundle identifier |
| `app_id` | string | no | App Store Connect app ID |
| `platforms` | array | no | List of platforms (`IOS`, `MAC_OS`, etc.) |
| `primary_locale` | string | no | Default locale (e.g., `en-US`) |
| `locales` | array | no | List of supported locales |
| `voice` | object | no | Voice config: `{tone, style_notes?, target_audience?}` |
| `changelog` | object | no | Changelog config: `{source: "git"|"manual"|"both", conventional_commits: bool}` |

**Returns:** JSON object with success and updated config

**File:** `.appstore/config.json`

**Used by:** `/app-store-toolkit:setup`

---

### store_write_local_config

Write the local (gitignored) config with API credentials.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key_id` | string | yes | App Store Connect API Key ID |
| `issuer_id` | string | yes | App Store Connect Issuer ID |
| `p8_key_path` | string | yes | Absolute path to .p8 private key file |

**Returns:** JSON with success and message

**File:** `.appstore/config.local.json` (gitignored)

**Used by:** `/app-store-toolkit:setup`

---

### store_read_metadata

Read a metadata field from the local store with full iteration history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale code (e.g., `en-US`, `ja`, `de-DE`) |
| `field` | enum | yes | One of: `name`, `subtitle`, `keywords`, `description`, `promotional_text`, `release_notes`, `iap_display_name`, `iap_description` |
| `platform` | string | no | Platform (`ios`, `macos`)—required for version-level fields |
| `version` | string | no | Version string—required for `release_notes` |
| `product_id` | string | no | IAP product ID—required for IAP fields |

**Returns:** JSON with `latest_content` and `history` (array of iterations)

**Files:** `.appstore/metadata/{locale}/{field}` or per-platform subdirs

**Used by:** Diff, audit, validation

---

### store_write_metadata

Write content to a metadata field, appending a new iteration to the history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale code |
| `field` | enum | yes | Metadata field name |
| `content` | string | yes | The content to write |
| `source` | enum | yes | One of: `ai_generated`, `user_edited`, `pulled_from_asc`, `translated` |
| `context` | string | yes | Context/reason for this iteration |
| `platform` | string | no | Required for version-level fields |
| `version` | string | no | Required for release_notes |
| `product_id` | string | no | Required for IAP fields |

**Returns:** JSON with success, iteration_id, content, total_iterations

**Files:** `.appstore/metadata/...` (appended to history)

**Used by:** ASO generation, localization, user editing

---

### store_validate

Validate metadata fields against Apple character limits.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | no | Restrict validation to one locale (all if omitted) |
| `platform` | string | no | Restrict validation to one platform (all if omitted) |

**Returns:** Formatted validation report with counts, field-by-field results, and warnings

**Char limits checked:**
- name: 30, subtitle: 30
- keywords: 100, promotional_text: 170
- description: 4000, release_notes: 4000
- iap_display_name: 30, iap_description: 45

**Used by:** Validation skill, before push

---

### store_list

List metadata, descriptions, changelogs, IAPs, locales, or release notes from the local store.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | yes | One of: `metadata`, `locales`, `history`, `iap`, `release_notes` |
| `locale` | string | no | Locale to list (defaults to primary) |
| `platform` | string | no | Platform to list |
| `field` | enum | no | Required for `history` listing |
| `product_id` | string | no | Required for IAP history |
| `version` | string | no | Required for release_notes history |

**Returns:** JSON object with requested data (varies by type)

**Used by:** Dashboard, audit, iteration review

---

### store_read_listing

Read the local listing config (categories, age rating, pricing, availability, encryption defaults).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** JSON with listing object (categories, ageRating, pricing, availability, encryption)

**File:** `.appstore/listing.json`

**Used by:** Listing inspection, push workflow

---

### store_write_listing

Write the local listing config.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listing` | object | yes | Full ListingConfig object |

**Returns:** JSON with success

**File:** `.appstore/listing.json`

**Used by:** Setup, listing mutation

---

### store_read_privacy

Read the local App Privacy responses.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** JSON with privacy object (collectsData, tracking, dataTypes array)

**File:** `.appstore/privacy.json`

**Used by:** Privacy inspection, push workflow

---

### store_write_privacy

Write the local App Privacy responses (validates against the taxonomy).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `responses` | object | yes | Full PrivacyResponses object |

**Returns:** JSON with success

**File:** `.appstore/privacy.json`

**Validates:** Data types against Apple's official taxonomy; ensures ≥1 purpose per data type

**Used by:** Privacy generation skill, setup

---

### store_read_review

Read the local App Review information.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** JSON with review object (contact, demo, notes)

**File:** `.appstore/review.json`

**Used by:** Review inspection, push workflow

---

### store_write_review

Write the local App Review information (validates demo username/password if required).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `review` | object | yes | Full ReviewInfo object with contact, demo, notes |

**Returns:** JSON with success

**File:** `.appstore/review.json`

**Validates:** If demo is marked required, username and password must be present

**Used by:** Setup, review mutation

---

### store_read_assets_lock

Read `.appstore/metadata/{locale}/{platform}/assets.lock.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale code |
| `platform` | string | yes | Platform (`ios`, etc.) |

**Returns:** JSON with AssetsLock object (screenshots, previews by device, with metadata)

**File:** `.appstore/metadata/{locale}/{platform}/assets.lock.json`

**Used by:** Asset management, cleanup

---

### store_write_assets_lock

Write `.appstore/metadata/{locale}/{platform}/assets.lock.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale code |
| `platform` | string | yes | Platform |
| `lock` | object | yes | Full AssetsLock object to write |

**Returns:** Plain text confirmation message

**File:** `.appstore/metadata/{locale}/{platform}/assets.lock.json`

**Used by:** Asset upload, cleanup

---

### store_read_ship_state

Read `.appstore/ship-state.json` (gitignored transient state).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** JSON with ShipState object or message if not present

**File:** `.appstore/ship-state.json` (gitignored)

**Used by:** Release workflow resume

---

### store_write_ship_state

Write `.appstore/ship-state.json` (gitignored).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | object | yes | Full ShipState object |

**Returns:** Plain text confirmation message

**File:** `.appstore/ship-state.json` (gitignored)

**Used by:** Release workflow checkpoints

---

### store_clear_ship_state

Delete `.appstore/ship-state.json` (called on successful `/app-store-toolkit:ship` completion).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (none) | — | — | — |

**Returns:** Plain text confirmation message

**File:** Deletes `.appstore/ship-state.json`

**Used by:** Release workflow completion

---

## Utility Tools (Local-Only)

### assets_validate_dimensions

Scan `.appstore/assets/` and validate each file against the dimension catalog.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | no | Restrict to one locale (all if omitted) |
| `platform` | string | no | Restrict to one platform (default: `ios`) |

**Returns:** JSON with `results` array (per-file) and `summary` (total, ok, failed)

**Per-result fields:** file, expected (array of dimensions), actual (dimensions or null), ok (bool), reason

**Used by:** Asset validation workflow, readiness checks

---

### assets_render_template

Render screenshots from `.appstore/templates/` HTML using Puppeteer (installs on first call).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale to render for (e.g., `en-US`) |
| `platform` | string | yes | Platform (`ios`) |
| `device` | string | yes | Device key (e.g., `iphone-6.7`) |

**Returns:** JSON with `rendered` array of output PNG paths

**Template file:** `.appstore/templates/screenshot-{device}.html`

**Input:** `.appstore/metadata/{locale}/{platform}/assets.json` (screenshot entries)

**Output:** `.appstore/assets/{platform}/{locale}/{device}/screenshots/` (PNG files)

**Dependency:** Installs Puppeteer on first call; requires Node.js toolchain

**Used by:** Screenshot generation workflow

---

### audit_prepare_cross_surface

Build the vision-audit prompt spec for a locale (pure function over the local store).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `locale` | string | yes | Locale code (e.g., `en-US`) |
| `platform` | string | yes | Platform (`ios`) |

**Returns:** JSON with app name, icon URL, screenshots, previews, and text descriptions formatted for vision analysis

**Used by:** Cross-surface audit skill (vision-based QA)

---

## History Tracking

Every mutating `asc_*` tool automatically appends to `.appstore/history/pushes.jsonl` with:
- timestamp
- tool name
- target (resource IDs)
- payload (what was sent)
- result (`success` or `error`)
- error message (if failed)

Special streams:
- **submissions**: `asc_submit_for_review` (M3)
- **audits**: Reserved for future audit trail (M3+)

Query with: `git log -p .appstore/history/` to see all mutations over time.

---

## Related Documentation

- **[commands.md](./commands.md)** — User-facing slash commands (the layer above these tools)
- **[file-schemas.md](./file-schemas.md)** — Data structures (.appstore/ JSON files)
- **[architecture.md](../concepts/architecture.md)** — High-level design and data flow
- **[api-reference.md](./mcp-tools.md)** — App Store Connect API details
