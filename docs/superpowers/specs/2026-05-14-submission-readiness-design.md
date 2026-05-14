# Submission Readiness — Design

**Date:** 2026-05-14
**Status:** Draft for review
**Goal:** Close the gaps that prevent a developer from completing an App Store v1.0 submission entirely from `app-store-toolkit`, and add the workflow skills (`/audit` and `/ship`) that make that submission feel like one decisive action rather than thirteen.

This design draws on a field report from a developer who shipped a 9-locale iOS app with the toolkit ([app-store-toolkit-improvement-proposal.md](../../../../glucometer/docs/app-store-toolkit-improvement-proposal.md)), but groups the work along the seams of App Store Connect's actual interface rather than the proposal's flat 10-item tier.

---

## 1. Problem

Today the toolkit handles per-locale ASO content (description, keywords, promo text, what's new) end-to-end. Everything else — URLs, categories, age rating, pricing, App Privacy answers, App Review information, encryption compliance, screenshots, App Preview videos, build attachment, and the actual "Submit for Review" click — falls back to the App Store Connect web UI or hand-written API scripts. A developer using the toolkit to ship v1.0 still spends most of their submission time outside it.

## 2. Mission shift

The toolkit's stated mission is "manage App Store metadata as code." The mission this design adopts:

> **Provide a complete, AI-assistable interface to populate, validate, and submit an App Store v1.0 release without leaving Claude Code.**

Multi-app, multi-account, post-launch analytics, A/B testing, and full multi-platform parity are deliberately out of scope for this round. They remain on the broader roadmap.

## 3. Scope

In:
- Every required field for a v1.0 iOS submission, exposed as MCP tools and reflected in the local store
- Asset upload (screenshots, App Preview videos) with dimension validation
- A minimal HTML→PNG/MP4 templating renderer for users who don't bring their own
- `/app-store-toolkit:audit` — a single skill that catches everything that would block submission or trigger rejection, including a vision-driven cross-surface consistency check
- `/app-store-toolkit:submit` — a focused skill for the build-attach-and-submit pipeline
- `/app-store-toolkit:ship` — an orchestrator that runs audit → push → assets → submit end-to-end

Out:
- Multi-app or multi-account
- macOS / tvOS / watchOS / visionOS (data model is platform-aware but the new tools target iOS first)
- Custom Product Pages, PPO A/B testing
- In-App Events
- Sales / financial reports
- Reviews response is unchanged in this round (the existing skill is sufficient)

## 4. Approach: submission readiness ladder

Three milestones, each independently shippable and each telling a clear user story.

### M1 — "The toolkit can fill every required ASC field"

After M1, a user can populate every text field, every dropdown, and every toggle that ASC requires for a v1.0 submission, from the toolkit. Asset upload and the actual submit click still happen in the web UI.

### M2 — "The toolkit handles assets"

After M2, the user can drop finished PNGs and MP4s into a directory (or use the built-in light templating renderer) and have them validated and uploaded to ASC.

### M3 — "The toolkit submits"

After M3, the user can attach a build, run `/audit`, and `/ship` in one flow. The web UI is no longer part of a normal submission.

## 5. Architecture

The toolkit keeps its three-layer structure:

- **MCP tools** (`servers/appstore-connect/src/tools/`) — typed wrappers over App Store Connect API endpoints and over the local store. Stay lean: tools expose data and primitive operations, not workflows.
- **Skills** (`skills/*/SKILL.md`) — conversational workflows. New skills (`audit`, `submit`, `ship`) compose existing tools with Claude's reasoning and multimodal capabilities. Most of the "intelligence" of the new features lives here, not in MCP tools, because skills run inside Claude Code and can use the model directly.
- **Local store** (`.appstore/`) — JSON files, diffable in git, single source of truth.

### 5.1 Local store changes

Today:
```
.appstore/
  config.json              # bundle id, locales, voice — committed
  config.local.json        # API credentials — gitignored
  metadata/{locale}/...    # per-locale content
```

After this design:
```
.appstore/
  config.json              # unchanged
  config.local.json        # unchanged
  listing.json             # NEW — categories, age rating, pricing, availability, encryption defaults
  privacy.json             # NEW — App Privacy questionnaire responses
  review.json              # NEW — App Review information (contact, demo creds, notes)
  metadata/{locale}/...    # extended with marketingUrl, supportUrl, privacyPolicyUrl
  assets/                  # NEW — user-managed asset directory (path overridable)
    {platform}/{locale}/{device}/screenshots/01.png ...
    {platform}/{locale}/{device}/preview.mp4
  templates/               # NEW (optional) — HTML templates for the light renderer
    screenshot.html
  metadata/{locale}/{platform}/screenshots.json  # NEW optional — per-screen headlines for the renderer
  ship-state.json          # NEW (transient) — checkpoint for /ship resume
```

Rationale for the split:
- `listing.json` holds decisions that rarely change and aren't per-locale. Grouping them mirrors how ASC presents them.
- `privacy.json` and `review.json` are special-purpose enough that embedding them in `config.json` would muddy the schema.
- `assets/` defaults to inside `.appstore/` but the path is configurable in `config.json` so users with existing pipelines can point at their own directories.

### 5.2 New MCP tools

Grouped by milestone. All tools sit alongside the existing ones in `servers/appstore-connect/src/tools/` and follow the existing `asc_*` naming and response-shape conventions.

**M1 — fill every field**

| Tool | Purpose |
|---|---|
| `asc_update_version_localization` (extend) | Add `marketingUrl`, `supportUrl` |
| `asc_update_app_info` (extend) | Add `privacyPolicyUrl` (with app-level→per-locale fallback for the 409 case in §4.16 of the field report) |
| `asc_set_categories` | Primary + optional secondary; subcategory args reserved for future games support |
| `asc_set_age_rating` | Accepts a structured `AgeRatingResponses` object; tool validates against Apple's question schema before pushing |
| `asc_set_pricing` | Price tier per territory; bulk variant accepts `territories: '*'` |
| `asc_set_availability` | Territory list; pre-order toggle reserved for later |
| `asc_set_privacy_responses` | Accepts `PrivacyResponses` (typed schema mirroring Apple's questionnaire — see §5.4) |
| `asc_set_review_info` | Contact, demo credentials, notes; per-version |
| `asc_set_encryption_compliance` | Per-build; persistent default in `listing.json` |
| `store_read_listing` / `store_write_listing` | Local-store primitives for `listing.json` |
| `store_read_privacy` / `store_write_privacy` | Same for `privacy.json` |
| `store_read_review` / `store_write_review` | Same for `review.json` |

**M2 — assets**

| Tool | Purpose |
|---|---|
| `asc_upload_screenshot` | One file per call; auto-detects device class from dimensions |
| `asc_upload_app_preview` | Same for video; accepts optional cover-frame timestamp |
| `asc_list_screenshots` | By version, optionally filtered by locale/device |
| `asc_delete_screenshot` | By id |
| `asc_list_app_previews` / `asc_delete_app_preview` | Symmetric |
| `assets_validate_dimensions` | Local-only; reads files from `.appstore/assets/` and checks against the dimension catalog |
| `assets_render_template` | Local-only; runs the bundled Puppeteer-based renderer if the user opts in |

The dimension catalog ships with the plugin as `servers/appstore-connect/src/data/asc-asset-specs.json`. Same data file informs `assets_validate_dimensions` and the upload tools' pre-flight checks.

**M3 — submit**

| Tool | Purpose |
|---|---|
| `asc_list_builds` | TestFlight builds with processing state |
| `asc_attach_build` | Bind build to version |
| `asc_set_release_strategy` | Auto / manual / scheduled / phased |
| `asc_submit_for_review` | The submit click; supports `dry_run: true` for pre-flight only |
| `asc_get_submission_state` | Single read; polling lives in the skill or the user's `/loop` |
| `asc_create_version` | For the v1.1+ case; copies metadata from previous version when asked |

### 5.3 New skills

**`/app-store-toolkit:audit`** — single-pass submission readiness check.

Runs:
1. **Locale parity** — every configured locale has every required field. Pure data check against the store.
2. **Char limits** — delegates to existing `store_validate`.
3. **Required-field presence** — listing config, privacy responses, review info all populated.
4. **Asset dimensions** — if `.appstore/assets/` exists, validate every file against the catalog.
5. **Voice drift** — for each locale, ask the model whether the description/promo/what's-new still matches the voice block in `config.json`. Flag drift with rationale.
6. **App Review phrase risk** — scan all localized text for risky phrases. The rule list ships as `servers/appstore-connect/src/data/review-phrase-rules.json` (seeded with the field report's examples: "guarantee", "diagnose", "doctor-ready", competitor names, unqualified medical claims) and is loaded by the skill. Rule hits are combined with an LLM second-pass for context (e.g., "diagnose" inside a quoted user testimonial may be fine).
7. **Cross-surface consistency (vision)** — for each locale, hand the model the description, promo, keywords, what's-new, and every screenshot PNG. Ask it to extract on-screen text and claims, then flag drift, contradictions, or claims promised in copy but missing from screenshots (and vice versa). This is the headline check.

Output is a single ranked punch list: blockers first, then quality issues, each with the specific field/file and a suggested fix. Privacy-manifest cross-checks and Required-Reason-API audits are explicitly *not* in /audit; they belong with the existing `/privacy` skill (out of scope for this round but called out as the natural home).

**`/app-store-toolkit:submit`** — the build-attach-and-submit pipeline.

Walks: select build → confirm encryption answer → confirm release strategy → confirm review info → submit → optionally poll state. Each step is a single tool call with confirmation. Designed to be runnable on its own. For a v1.1+ release that just needs a build swap and a fresh release notes push, the user runs `asc_create_version` (or has the skill prompt for it) and then `/submit` without re-touching the rest of the listing.

**`/app-store-toolkit:ship`** — orchestrator over everything.

Runs `/audit` first; bails on any blocker unless the user explicitly waives. Then: push metadata → push listing config → push privacy → push review info → upload assets → call `/submit`. State is checkpointed in `.appstore/ship-state.json` keyed by version, so a failure at minute 30 doesn't lose the prior 29 minutes of work. The user can re-run `/ship` and it resumes from the last completed step.

### 5.4 App Privacy schema

Apple's App Privacy questionnaire is the largest typed surface this design adds. The shape:

```ts
type PrivacyResponses = {
  tracking: {
    collects: boolean;
    domains: string[];          // tracking domains, when collects=true
  };
  dataTypes: Array<{
    type: DataTypeCategory;     // enum mirroring Apple's taxonomy
    linkedToUser: boolean;
    usedForTracking: boolean;
    purposes: Purpose[];        // analytics, advertising, app functionality, etc.
  }>;
};
```

The taxonomy ships in two paired forms: `servers/appstore-connect/src/data/privacy-taxonomy.json` for editor autocomplete (referenced from a JSON Schema for `privacy.json`), and a TypeScript enum derived from it at build time so the `asc_set_privacy_responses` tool rejects invalid combinations before calling Apple. Other catalog data (asset dimensions in §5.2, App Review phrase rules in §5.3) follows the same JSON-as-source-of-truth pattern.

### 5.5 Asset templating

The bundled renderer is intentionally minimal:

- One HTML template per device size (`templates/screenshot-iphone-6.7.html`, etc.), provided by the user or copied from a starter set the plugin ships.
- Template receives `{ headline, subheadline, screenImage, locale, deviceWidth, deviceHeight }` as a JSON blob.
- Headlines come from a new optional `screenshots` block in `.appstore/metadata/{locale}/{platform}/screenshots.json`.
- Renderer is a Node script invoked via Bash from the skill (not an MCP tool) — it requires Puppeteer, which we install on demand only if the user opts into templating. Users who bring their own pipeline never pay for this dependency.
- App Preview rendering is **not** in scope. The dimension catalog will reject wrong-size MP4s, but generating video stays the user's responsibility this round.

## 6. Data flow

Typical M3 flow when a user runs `/ship`:

```
user → /ship
  → /audit
      → reads: store, assets/, all metadata
      → asks model: voice drift, phrase risk, cross-surface (with screenshots)
      → returns: ranked punch list
  → if blockers: stop, show list, exit
  → push metadata (existing tools, per locale)
  → push listing config (asc_set_categories, asc_set_age_rating, asc_set_pricing, asc_set_availability)
  → push privacy (asc_set_privacy_responses)
  → push review info (asc_set_review_info)
  → upload assets (asc_upload_screenshot per file, asc_upload_app_preview per file)
  → /submit
      → asc_list_builds → user selects
      → asc_attach_build
      → asc_set_encryption_compliance (from listing.json default)
      → asc_set_release_strategy (from listing.json default)
      → asc_submit_for_review
  → write ship-state.json with completion timestamp
```

Every step writes its checkpoint to `ship-state.json` before moving on. Failure at any step leaves a resumable state.

## 7. Error handling

Two shifts from current behavior:

1. **Structured errors.** Every MCP tool error returns `{ code, field?, locale?, message, remediation, asc_response? }`. Skills surface `remediation` to the user. The current "raw string error" pattern is replaced as we touch each tool.
2. **Partial-failure surfacing.** When a multi-locale push (e.g., URL update across 9 locales) has 7 successes and 2 failures, the tool returns a structured per-locale result map rather than aborting on the first failure or silently swallowing later ones. Skills then present a clear "7 succeeded, 2 failed (here's why), retry or skip?" prompt.

## 8. Backwards compatibility

- Tools are **extended in place** (e.g., `asc_update_version_localization` gains optional `marketingUrl`, `supportUrl`). No breaking changes to existing skills.
- Existing per-locale metadata files gain optional fields; old files without them remain valid.
- New store files (`listing.json`, `privacy.json`, `review.json`) are created on first write. Their absence is a "not configured yet" state, not an error.
- Plugin version bumps to **v0.2.0** at end of M1, **v0.3.0** at M2, **v0.4.0** at M3. `plugin.json` is the version authority per `CLAUDE.md`.

## 9. Testing

- Each new MCP tool gets unit tests against a fixture for Apple's API responses (existing pattern in the server).
- Integration tests against a real ASC sandbox account for the destructive tools (submit, attach build, upload screenshot). Gated behind an env var so they don't run in normal CI.
- The skills get smoke tests that exercise the orchestration logic against mocked tools — checkpointing, resume, error surfacing, audit punch-list ranking.
- Asset dimension catalog gets a snapshot test against Apple's published asset specs, so when Apple adds a new device class we notice.

## 10. Open questions deferred to implementation

- Exact ASC API endpoint for `asc_set_age_rating` (the questionnaire schema differs slightly between platform and territory; iOS-only for this round simplifies it).
- Whether `assets_render_template` ships with Puppeteer pre-bundled or installs it on first use. Lean toward install-on-use to keep plugin install lightweight.
- Per-locale vs single review-info contact. Defer to per-version single-contact (matches the most common case); revisit if users ask.

## 11. Non-goals reminder

This design is bounded. It will not solve:

- Multi-app / multi-account / multi-platform
- Post-launch analytics, sales reports, financial reports
- A/B testing, Custom Product Pages, In-App Events
- TestFlight tester management
- Required Reason API audit and Privacy Manifest cross-check (belong to a future `/privacy` skill upgrade)
- App Preview *video* rendering (only validation/upload)

These are real gaps but each is its own design effort.
