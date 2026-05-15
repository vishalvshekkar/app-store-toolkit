---
name: app-store-toolkit:push
description: Push local metadata, listing config, App Privacy responses, App Review info, and per-locale URLs to App Store Connect; every mutation is appended to .appstore/history/pushes.jsonl
arguments:
  - name: locale
    description: "Specific locale to push (pushes all changed locales if omitted)"
    required: false
  - name: field
    description: "Specific field to push (pushes all changed fields if omitted)"
    required: false
  - name: force
    description: "Skip diff preview and push immediately"
    required: false
user_invocable: true
---

# /app-store-toolkit:push

You are pushing local metadata to App Store Connect. This modifies live App Store data.

## Steps

### 1. Load Configuration

Call `store_read_config` to get app_id, locales, and platforms.

If no config or no app_id, tell the user to run `/app-store-toolkit:setup` or `/app-store-toolkit:pull` first.

### 2. Validate Before Push

Call `store_validate` to check all fields against character limits.

If ANY field exceeds its limit, **stop and warn the user**. Do not push invalid data.
Suggest running `/app-store-toolkit:validate` and fixing issues first.

### 3. Compute Changes

For each locale and platform, compare local latest content with what's currently on App Store Connect:

1. Call `asc_get_app_info` for app-level fields (name, subtitle)
2. Call `asc_get_version` then `asc_get_version_localizations` for version-level fields
3. Compare each field's local latest content with the remote value
4. Build a list of changes (fields where local != remote)

If `$ARGUMENTS` includes a specific locale or field filter, only include those.

### 4. Preview Changes

Unless `$ARGUMENTS` includes "force", show a preview table:

```
Changes to push to App Store Connect:
═════════════════════════════════════════════════════════
Field              | Locale | Platform | Change
─────────────────────────────────────────────────────────
name               | en-US  | —        | "Old Name" → "New Name"
description        | en-US  | ios      | Updated (2341 → 2567 chars)
keywords           | en-US  | —        | Updated (87 → 95 chars)
promotional_text   | ja     | ios      | New (was empty)
═════════════════════════════════════════════════════════
Total: 4 changes across 2 locales
```

**Ask the user to confirm** before proceeding. This is a critical step — pushing updates live App Store data.

### 5. Push Changes

For each change:

**App-level fields (name, subtitle):**
- Use `asc_update_app_info` with the localization ID and new values

**Version-level fields (description, keywords, promo, what's new):**
- Use `asc_update_version_localization` with the localization ID and new values

**IAP fields:**
- Use `asc_update_iap_localization` with the localization ID and new values

Report progress as each field is pushed.

### 6. Report Results

```
Push complete:
═══════════════════
  4 fields pushed successfully
  0 errors

  name (en-US): pushed
  description (en-US, ios): pushed
  keywords (en-US): pushed
  promotional_text (ja, ios): pushed
```

### 7. Suggest Next Steps

- "Run `/app-store-toolkit:status` to verify sync state"
- "Run `/app-store-toolkit:pull` to confirm remote matches local"

## Suggested next

- `/app-store-toolkit:status` — confirm all fields are in sync with App Store Connect
- `/app-store-toolkit:audit` — run a full submission readiness check once everything is pushed
- See also: docs/workflows/shipping-a-release.md

## Pushing listing config (categories, age rating, pricing, availability, encryption)

Read `.appstore/listing.json` via `store_read_listing`. If the file doesn't exist, skip this stage with a note: "No listing.json found — run /app-store-toolkit:setup or create it manually."

Then for each section that needs pushing (offer the user a multi-select if running interactively):

### Categories
Look up `app_info_id` (the editable appInfo's id) via `asc_get_app_info` if not already cached. Then call:
```
asc_set_categories({
  app_info_id: "<id>",
  primary: listing.categories.primary,
  secondary: listing.categories.secondary,
})
```

### Age rating
Look up the `ageRatingDeclaration` id from the editable `appInfo` (Apple exposes it as a relationship). Then:
```
asc_set_age_rating({
  declaration_id: "<id>",
  answers: listing.ageRating.answers,
})
```

### Pricing
```
asc_set_pricing({
  app_id: "<id>",
  default_tier: listing.pricing.defaultTier,
  per_territory: listing.pricing.perTerritory.map(p => ({ territory: p.territory, price_tier: p.priceTier })),
})
```

### Availability
```
asc_set_availability({
  app_id: "<id>",
  territories: listing.availability.territories,
})
```

### Encryption (if a build is attached)
Get `build_id` from the version. Then:
```
asc_set_encryption_compliance({
  build_id: "<id>",
  uses_encryption: listing.encryption.usesEncryption,
  exemptions: listing.encryption.exemptions,
})
```

## Pushing App Privacy

Read `.appstore/privacy.json` via `store_read_privacy`. If absent, skip with note. Else:
```
asc_set_privacy_responses({ app_id: "<id>", responses: privacy })
```

## Pushing App Review information

Read `.appstore/review.json` via `store_read_review`. If absent, skip. Else look up the `reviewDetailId` from the version's `appStoreReviewDetail` relationship and call:
```
asc_set_review_info({
  review_detail_id: "<id>",
  contact: review.contact,
  demo: review.demo,
  notes: review.notes,
})
```

## Pushing per-locale URL fields

When pushing each locale's content via `asc_update_version_localization`, include `marketingUrl` and `supportUrl` if present in the local metadata. When pushing each locale's `asc_update_app_info`, include `privacyPolicyUrl` if present.

## Pushing assets (screenshots and App Preview videos)

If `.appstore/assets/{platform}/` exists, also run the asset push phase. Skip with `--no-assets`. Force re-upload with `--force`.

### Steps for each locale + platform + device

1. For each `*.png` in `.appstore/assets/{platform}/{locale}/{device}/screenshots/` (sorted by basename):
   a. Compute `local_sha = sha256(file bytes)`.
   b. Call `store_read_assets_lock` for `{locale, platform}`.
   c. Find the matching `lock_entry` by `file` name within `screenshots[device]`.
   d. If `lock_entry` exists AND `lock_entry.sha256 === local_sha` AND `lock_entry.asc_id !== null`:
      - Mark `unchanged`, skip upload.
   e. Else:
      - Discover the appScreenshotSet ID for this locale+platform+device. (Use `asc_get_version_localizations` and follow the relationship to the appScreenshotSets endpoint. For v1 the version locale's appScreenshotSets list contains exactly one set per device; pick the one whose `screenshotDisplayType` maps to the device's `ascDisplayTarget`.)
      - Call `asc_upload_screenshot({ set_id, file_path, locale, platform, device })`.
      - If `result.isError`, accumulate `{file, code, message, remediation}` into a failures list.
      - Else, count as `uploaded`.
2. Repeat for previews: for each `*.mp4` in `.appstore/assets/{platform}/{locale}/{device}/previews/`:
   - Same logic, but read `cover_frame_seconds` from `assets.json` and pass it to `asc_upload_app_preview`.

### Summary output

```
Asset push summary:
═════════════════════════
  143 unchanged, 1 changed, 0 failed
```

If any failures, surface the per-file structured errors with their `remediation` text.
