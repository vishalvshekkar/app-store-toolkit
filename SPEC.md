# app-store-toolkit Technical Specification

Detailed technical reference for all design decisions, data formats, and API integration details.

## Authentication Model

### Account-Wide API Keys
App Store Connect API keys are team/account-wide, created in App Store Connect > Users and Access > Integrations > Team Keys. Each key has a role (Admin, App Manager, Developer, etc.). The key downloads as a `.p8` file containing an ES256 private key.

**Recommended role:** App Manager — manages metadata without Admin privileges.

### JWT Token Flow
1. Sign JWT with ES256 algorithm using `.p8` private key
2. JWT payload: `iss` (Issuer ID), `iat` (current time), `exp` (iat + 20 min), `aud` ("appstoreconnect-v1")
3. JWT header: `alg: "ES256"`, `kid` (Key ID), `typ: "JWT"`
4. Token cached in memory, refreshed at 10-minute mark (before 20-min expiry)
5. All API requests include `Authorization: Bearer {token}` header

### App Scoping
Auth is account-wide, but all operations are filtered by configured `app_id` (resolved from bundle ID during setup). This prevents cross-app accidents. The `app_id` is stored in `config.json` after first resolution.

### Config Split
- `.appstore/config.json` — committed to git: bundle_id, app_id, platforms, locales, voice
- `.appstore/config.local.json` — gitignored: key_id, issuer_id, p8_key_path

---

## Multi-Platform Handling

### How App Store Connect Works
- One app record per bundle ID (same Apple ID, SKU)
- Each platform (IOS, MAC_OS, TV_OS, VISION_OS) has separate `appStoreVersion` resources
- **App-level fields** (name, subtitle) are shared across all platforms
- **Version-level fields** (description, promotional text, What's New, keywords) are per-platform per-locale
- API: `GET /v1/apps/{id}/appStoreVersions?filter[platform]=IOS`

### Our Approach
- Auto-detect platforms during setup via API
- Store platform-specific content in `{locale}/{platform}/` subdirectories
- App-level content (name, subtitle, keywords) at `{locale}/app_info.json` (shared)
- Single-platform apps just have one platform folder

---

## Data Store Format

### Directory Structure
```
.appstore/
├── config.json                          # Shared config (committed)
├── config.local.json                    # Secrets (gitignored)
├── .gitignore                           # Contains: config.local.json
└── metadata/
    ├── _locales.json                    # ["en-US", "ja", "de-DE"]
    ├── en-US/
    │   ├── app_info.json                # { name, subtitle, keywords } (FieldWithHistory each)
    │   ├── ios/
    │   │   ├── description.json         # FieldWithHistory
    │   │   ├── promotional_text.json    # FieldWithHistory
    │   │   └── release_notes/
    │   │       ├── 2.1.0.json           # { version, notes: FieldWithHistory }
    │   │       └── 2.0.0.json
    │   ├── macos/                       # Only if multi-platform
    │   │   └── (same structure)
    │   └── iap/
    │       ├── premium_monthly.json     # { product_id, display_name, description } (FieldWithHistory each)
    │       └── premium_yearly.json
    ├── ja/
    │   └── (same structure)
    └── de-DE/
        └── (same structure)
```

### FieldWithHistory Schema
```json
{
  "latest": 3,
  "iterations": [
    {
      "id": 1,
      "timestamp": "2026-02-24T10:00:00Z",
      "content": "First draft of description...",
      "source": "ai_generated",
      "context": "Generated from README + user instructions"
    },
    {
      "id": 2,
      "timestamp": "2026-02-24T11:00:00Z",
      "content": "Revised description...",
      "source": "user_edited",
      "context": "Shortened first paragraph"
    },
    {
      "id": 3,
      "timestamp": "2026-02-24T12:00:00Z",
      "content": "Pulled from App Store Connect",
      "source": "pulled_from_asc",
      "context": "Sync pull"
    }
  ]
}
```

- `latest` points to the iteration ID used for sync/display
- `source` enum: `ai_generated`, `user_edited`, `pulled_from_asc`, `translated`
- History is append-only, never deleted
- `store_write_metadata` MCP tool always appends a new iteration and updates `latest`

### config.json Schema
```json
{
  "bundle_id": "com.company.app",
  "app_id": "123456789",
  "platforms": ["IOS", "MACOS"],
  "primary_locale": "en-US",
  "locales": ["en-US", "ja", "de-DE", "es-MX"],
  "voice": {
    "tone": "professional",
    "style_notes": "Clear, concise, productivity-focused. No jargon.",
    "target_audience": "Business professionals aged 25-45"
  },
  "changelog": {
    "source": "git",
    "conventional_commits": true
  }
}
```

### config.local.json Schema
```json
{
  "key_id": "ABC123DEFG",
  "issuer_id": "12345678-1234-1234-1234-123456789012",
  "p8_key_path": "/absolute/path/to/AuthKey_ABC123DEFG.p8"
}
```

---

## Voice & Tone System

### Presets
| Preset | Description |
|--------|-------------|
| Professional | Clear, polished, business-appropriate language |
| Casual | Friendly, conversational, approachable tone |
| Playful | Fun, energetic, creative word choices |
| Technical | Precise, feature-focused, detailed descriptions |
| Minimal | Short, direct, zero fluff |
| Witty | Clever wordplay, engaging personality |
| Custom | User-defined style_notes and target_audience |

### Usage
- Stored in `config.json` under `voice` key
- Injected into every generation prompt (ASO, changelog, IAP, localization)
- Custom allows freeform `style_notes` (e.g., "Use active voice, avoid buzzwords") and `target_audience` (e.g., "Developers aged 25-40")

---

## Changelog Mechanics

### Version Range Detection (priority order)
1. **User specifies range:** `/app-store-toolkit:changelog v1.0..v2.0`
2. **Git tags:** `git tag --sort=-version:refname` → latest two tags as range
3. **Existing release_notes:** Latest version file → prompt for new version
4. **Fallback:** Ask user for version and changes

### Git-Based Changelog
- Parse `git log {old}..{new} --oneline` for conventional commits
- Group by type: `feat:` → Features, `fix:` → Bug Fixes, `chore:/refactor:/docs:` → Improvements
- Generate user-friendly release notes in configured voice (4000 char max)
- Supports non-conventional commits via AI summarization

---

## Validation

### Character Limits
| Field | Limit | Level |
|---|---|---|
| App Name | 30 | App-level |
| Subtitle | 30 | App-level |
| Keywords | 100 | Version-level |
| Promotional Text | 170 | Version-level |
| Description | 4000 | Version-level |
| What's New (Release Notes) | 4000 | Version-level |
| IAP Display Name | 30 | IAP-level |
| IAP Description | 45 | IAP-level |

### Validation Flow
1. Every AI generation → validate immediately
2. If exceeded → auto-regenerate with explicit char constraint (include exact limit in prompt)
3. Up to 2 retries
4. If still exceeded → warn user with exact character counts
5. Unicode-aware counting (string length, not byte length)

### Hook-Based Validation
- PostToolUse hook triggers on Write|Edit to `.appstore/metadata/**`
- Runs `scripts/validate-metadata.sh` to check modified files
- Outputs warnings if any field exceeds limits

---

## Context Gathering for Generation

Sources ranked by priority:
1. **User instructions** (highest) — whatever the user says in the command invocation
2. **Existing metadata** — current listing content from local store or App Store Connect
3. **CLAUDE.md** in the user's project — app description, coding guidelines, purpose
4. **README.md** in the user's project — features, technical details
5. **Source code analysis** — if needed for deeper understanding of features

All available sources are combined to give the ASO agent maximum context for high-quality generation.

---

## App Store Connect API Reference

### Base URL
```
https://api.appstoreconnect.apple.com
```

### Response Format
JSON:API — all responses follow the `{ data, included, links, meta }` structure. Relationships are returned as references and can be included inline with `?include=` parameter.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/apps?filter[bundleId]={id}` | GET | Find app by bundle ID |
| `/v1/apps/{id}/appInfos` | GET | Get app-level info records |
| `/v1/appInfoLocalizations/{id}` | GET/PATCH | Read/update app name, subtitle |
| `/v1/apps/{id}/appStoreVersions?filter[platform]={p}` | GET | Get versions by platform |
| `/v1/appStoreVersionLocalizations/{id}` | GET/PATCH | Read/update description, keywords, promo, what's new |
| `/v2/inAppPurchases?filter[app]={id}` | GET | List IAPs |
| `/v2/inAppPurchases/{id}/inAppPurchaseLocalizations` | GET | Get IAP localizations |
| `/v1/inAppPurchaseLocalizations/{id}` | PATCH | Update IAP display name, description |
| `/v1/apps/{id}/customerReviews` | GET | List customer reviews |
| `/v1/customerReviewResponses` | POST | Post review response |

### Rate Limits
- ~300 requests per minute, hourly rolling window
- 429 responses include `Retry-After` header
- Our client implements exponential backoff on 429

### Pagination
- Responses include `links.next` for pagination
- Default page size: 200 (max)
- Use `?limit=200` for large collections

---

## MCP Server Tools

### App Store Connect Tools (asc_*)

| Tool | Input | Output |
|------|-------|--------|
| `asc_get_app` | `bundle_id` | App record with id, name, platforms |
| `asc_get_app_info` | `app_id, locale?` | App-level localizations (name, subtitle) |
| `asc_update_app_info` | `localization_id, name?, subtitle?` | Updated localization |
| `asc_get_version` | `app_id, platform` | Latest editable version |
| `asc_get_version_localizations` | `version_id, locale?` | Version localizations (description, keywords, promo, what's new) |
| `asc_update_version_localization` | `localization_id, description?, keywords?, promotionalText?, whatsNew?` | Updated localization |
| `asc_get_iaps` | `app_id` | List of in-app purchases |
| `asc_get_iap_localizations` | `iap_id, locale?` | IAP localizations |
| `asc_update_iap_localization` | `localization_id, name?, description?` | Updated IAP localization |
| `asc_get_reviews` | `app_id, sort?, limit?` | Customer reviews |
| `asc_post_review_response` | `review_id, response_body` | Created response |

### Local Store Tools (store_*)

| Tool | Input | Output |
|------|-------|--------|
| `store_read_metadata` | `locale, field, platform?, version?` | Field content with history |
| `store_write_metadata` | `locale, field, platform?, version?, content, source, context` | Written with new iteration |
| `store_validate` | `locale?, platform?` | Validation results for all fields |
| `store_list` | `type (metadata\|locales\|history\|iap)` | Listing of requested type |
| `store_read_config` | — | Current config.json contents |

---

## Hooks

### PostToolUse Hook
- **Matcher:** Write or Edit tool targeting `.appstore/metadata/**`
- **Action:** Run `scripts/validate-metadata.sh` with the modified file path
- **Output:** Warnings if character limits exceeded

### SessionStart Hook
- **Action:** Run `scripts/session-status.sh`
- **Output:** Brief status showing configured app, sync state, and any validation warnings

---

## List Command Subcommands

| Subcommand | Output |
|------------|--------|
| `metadata` | All fields for primary locale with latest content and char counts |
| `description` | Full description text for specified locale/platform |
| `changelog` | All release notes versions |
| `iap` | All IAP products with display names and descriptions |
| `locales` | Configured locales with completion percentage |
| `history [field]` | Full iteration history for a specific field |

---

## Localization

### Supported Locales (39 App Store Connect locales)
ar-SA, ca, cs, da, de-DE, el, en-AU, en-CA, en-GB, en-US, es-ES, es-MX, fi, fr-CA, fr-FR, he, hi, hr, hu, id, it, ja, ko, ms, nl-NL, no, pl, pt-BR, pt-PT, ro, ru, sk, sv, th, tr, uk, vi, zh-Hans, zh-Hant

### Approach
- **Transcreation**, not literal translation — culturally adapted content
- Keywords are researched per-locale (translation of keywords rarely matches what local users search)
- CJK character width awareness (some limits effectively halve for CJK scripts)
- Each translated field saved with `translated` source type

---

## Sync Model

### Sync States
| State | Meaning |
|-------|---------|
| `in_sync` | Local latest matches remote |
| `local_newer` | Local has changes not pushed |
| `remote_newer` | Remote has changes not pulled |
| `conflict` | Both local and remote changed since last sync |

### Push Flow
1. Compute diff (local latest vs last pulled remote)
2. Show preview table of all changes
3. User confirms
4. Push each changed field via ASC API
5. Record sync timestamp

### Pull Flow
1. Fetch all metadata from ASC API
2. For each field, compare with local latest
3. If different, append new iteration with `pulled_from_asc` source
4. If same, skip (no duplicate iteration)

---

## Single-App Constraint

For v1, no multi-app support. All operations are scoped to the single `bundle_id` configured in `config.json`. This is a deliberate safety constraint — account-wide API keys could otherwise accidentally modify the wrong app.

Future multi-app support would require explicit app switching and confirmation flows.
