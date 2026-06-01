# Changelog

All notable releases of app-store-toolkit are documented here. This is the official plugin for App Store Connect metadata management—ASO copywriting, changelogs, localization, asset handling, and submission orchestration.

For deployment details, see the [ROADMAP](../ROADMAP.md). For architecture overview, see [Architecture](concepts/architecture.md).

---

## v0.4.1 — Guidance system + documentation site (2026-06-01)

### Added

**Skills**
- `/app-store-toolkit:help` — state-aware guidance. With no arguments, reads `.appstore/` state and recommends the next concrete command; with a question, routes to the relevant docs page and answers in 3–6 sentences with a command to run.

**Discoverability**
- SessionStart hook now prints a second `→ Next: ...` line with a state-based recommendation (e.g., `→ Next: /app-store-toolkit:audit (no audit since last push)`). Silent and non-fatal when state can't be determined.
- All 18 existing skills now end with a consistent `## Suggested next` / `## Related` footer pointing to the natural follow-on command and a docs page.

**Documentation**
- New `docs/` site (20 pages, ~9,500 lines): getting-started, 5 concept pages, 4 reference pages, 5 workflow guides, 2 contributing guides, roadmap, and changelog.
- Root `README.md` slimmed to a landing page; `SPEC.md`, `CONTRIBUTING.md`, `ROADMAP.md` converted to redirect stubs into `docs/`.

### Internal

- No changes to the MCP server's runtime behavior beyond the SessionStart hook; all 119 tests still pass and the build is unchanged.

### Known limitations

- The App Store Connect tool layer is unit-tested with mocked HTTP/JWT but has **not** been exercised against a live ASC account. See `docs/contributing/live-asc-checklist.md` for the pre-production verification procedure.

---

## v0.4.0 — M3: Submit + Audit + Ship (2026-05-15)

### Added

**Skills**
- `/app-store-toolkit:audit` — 7-phase submission readiness check with vision-driven cross-surface consistency validation
- `/app-store-toolkit:submit` — Build attach + dry-run + submit pipeline with inline error recovery
- `/app-store-toolkit:ship` — 8-phase orchestrator with checkpointed resume and `--waive` blockers for expert overrides

**MCP Tools — Builds & Submission**
- `asc_list_builds` — List builds associated with an app and platform
- `asc_attach_build` — Attach a build to an app store version (history-resilient)
- `asc_set_release_strategy` — Configure release type (manual, phased, automatic, scheduled)
- `asc_create_version` — Create a new app store version for a platform (for v1.1+ releases)
- `asc_submit_for_review` — Submit version for App Review with dry-run readiness checks
- `asc_get_submission_state` — Poll submission status and rejection details

**MCP Tools — Audit & Store**
- `audit_prepare_cross_surface` — Deterministic prompt builder for vision-driven audit validation
- `store_read_ship_state` — Read 8-phase checkpoint and waiver overrides from ship state
- `store_write_ship_state` — Write phase completion, resume, and blockers to ship state
- `store_clear_ship_state` — Reset ship state (safe to call after successful submission)

**Data & State**
- `.appstore/review-phrase-rules.json` — Risk-detection ruleset for App Review feedback (3 seed rules: diagnose, guarantee, FDA-approved)
- `.appstore/ship-state.json` — Transient state file (gitignored) for `/ship` phase tracking and checkpoint resume
- `history/audits.jsonl` — Append-only audit log of cross-surface validation runs
- `history/submissions.jsonl` — Append-only log of submission attempts and outcomes

### Internal

- 18 task commits implementing M3 design spec
- 119 tests passing (44 test files)
- Build size: 133 KB (minified)
- Submission API integration complete with dry-run readiness validation
- Release strategy API integrated (phased, automatic, scheduled, manual)
- Builds API fully implemented (list, attach, reserve)

---

## v0.3.0 — M2: Assets (2026-05-15)

### Added

**Skills**
- `/app-store-toolkit:render-screenshots` — Puppeteer-based HTML→PNG batch renderer with lazy Puppeteer install and template caching

**Extended Skills**
- `/app-store-toolkit:setup` — LFS initialization, starter templates, gitignore warnings for asset directories
- `/app-store-toolkit:push` — Asset upload phase with lock-driven skip-unchanged detection
- `/app-store-toolkit:pull` — Manifest-only assets by default, `--with-bytes` opt-in for full download
- `/app-store-toolkit:status` — Asset diff with six-state classification (missing, unchanged, local-newer, remote-newer, dimension-mismatch, orphaned)
- `/app-store-toolkit:validate` — Dimension validation against asc-asset-specs.json per locale and device class
- `/app-store-toolkit:list` — Assets summary across locales and devices

**MCP Tools — Screenshots & Previews**
- `asc_upload_screenshot` — 3-step reserve-PUT-commit protocol with dual-hash (SHA256 + MD5) and lock write
- `asc_upload_app_preview` — 3-step upload with optional cover frame extraction
- `asc_list_screenshots` — List all screenshots for a version by locale and device class
- `asc_list_app_previews` — List all previews with timecodes
- `asc_delete_screenshot` — Remove screenshot by ID
- `asc_delete_app_preview` — Remove preview by ID

**MCP Tools — Local Asset Management**
- `assets_validate_dimensions` — Scan `.appstore/assets/` directory against iOS device catalog
- `assets_render_template` — Render HTML template to PNG with Puppeteer (lazy install)
- `store_read_assets_lock` — Read lock manifest with SHA256 + MD5 checksums
- `store_write_assets_lock` — Write lock manifest and dual-hash cache

**Data & Layout**
- `.appstore/assets/` — Strict per-locale asset directory layout: `{platform}/{locale}/{device}/screenshots/` and `{locale}/previews/`
- `.appstore/assets.json` — Per-file metadata: headlines, cover frame offsets
- `.appstore/assets.lock.json` — Committed lock file with dual-hash checksums and ASC file IDs (gitignored cache layer)
- `.appstore/asc-asset-specs.json` — iOS device class catalog with screenshot and preview dimensions for 5 device breakpoints
- `.appstore/.gitattributes` — Git LFS configuration (auto-generated, opt-in during setup)

### Internal

- 20 task commits implementing M2 design
- 85 tests passing (29 test files)
- PNG and MP4 dimension parsing without image library dependency
- Asset upload: fully implemented with 3-step reserve-PUT-commit pattern
- Lock-driven skip logic prevents re-uploading unchanged files
- tsup config: `external: ["puppeteer"]` to avoid bundling Puppeteer transitive dependencies

---

## v0.2.0 — M1: Fill every required ASC field (2026-05-14)

### Added

**Skills**
- `/app-store-toolkit:push` — Sync local metadata to App Store Connect (first version)
- `/app-store-toolkit:pull` — Fetch metadata from App Store Connect into local store
- `/app-store-toolkit:validate` — Validate all fields against Apple character limits
- `/app-store-toolkit:list` — List metadata, descriptions, release notes, and iteration history

**App-Level Configuration**
- `.appstore/listing.json` — Categories, age rating, privacy policy URLs, pricing tier, availability by territory, encryption declaration
- `.appstore/privacy.json` — App Privacy questionnaire responses (fully taxonomy-validated against Apple's data type and purpose taxonomy)
- `.appstore/review.json` — App Review contact information, demo credentials, review notes

**MCP Tools — Listing & URLs**
- `asc_set_categories` — Set primary and optional secondary App Store category
- `asc_set_age_rating` — Set age rating answers across all 28 Apple rating questions
- `asc_set_availability` — Set territories where app is available (ISO 3166-1 alpha-2 codes)
- `asc_set_pricing` — Set USA base tier and per-territory price overrides
- `asc_update_app_info` — Update app name and subtitle per locale and privacy policy URL
- `asc_update_version_localization` — Update description, keywords, promotional text, release notes, marketing URL, support URL per locale

**MCP Tools — Privacy & Review**
- `asc_set_privacy_responses` — Replace App Privacy declarations with validated responses
- `asc_set_review_info` — Set App Review contact, demo credentials, and review notes
- `asc_set_encryption_compliance` — Set encryption answer and optional exemption codes on a build

**Local Store**
- `.appstore/metadata/{locale}/` — Per-locale content: name, subtitle, keywords, description, promotional text, release notes, marketing URL, support URL, privacy policy URL
- `history/pushes.jsonl` — Append-only audit log: one line per ASC mutation with timestamp, tool name, payload, and ASC response
- Field iteration tracking: `source` (ai_generated, user_edited, pulled_from_asc, translated) and `context` for every field change

**Validation & Error Handling**
- Character limit validation for all fields (name 30, subtitle 30, keywords 100, promotional 170, description 4000, release notes 4000, IAP name 30, IAP description 45)
- Taxonomy-validated privacy responses (rejects invalid data types and purposes)
- History-append is best-effort: ASC success never inverted by a history write failure (commit `506d943`)

### Internal

- 21 task commits implementing M1 design spec
- 48 tests passing (Vitest infrastructure bootstrapped)
- MCP server fully functional with all listing, privacy, and review mutation tools
- Age rating questionnaire support for all 28 Apple rating questions
- Full privacy taxonomy coverage: 50+ data types, 8+ purposes, tracking and linked-to-user metadata

---

## v0.1.0 — Initial Plugin (Pre-M1, Not Formally Versioned)

The plugin began as a scaffold with foundational skills for text generation, per-locale metadata storage, and basic API integration.

**Initial Skills**
- `/app-store-toolkit:setup` — Configure bundle ID, API credentials, voice/tone preferences, and locales
- `/app-store-toolkit:aso` — Generate ASO-optimized name, subtitle, keywords, description
- `/app-store-toolkit:changelog` — Generate release notes from git history or manual input
- `/app-store-toolkit:iap` — Generate in-app purchase display names and descriptions
- `/app-store-toolkit:localize` — Translate generated content to configured locales
- `/app-store-toolkit:competitors` — Analyze competitor App Store listings for ASO benchmarks
- `/app-store-toolkit:reviews` — View and respond to customer reviews
- `/app-store-toolkit:privacy` — Analyze code for privacy nutrition label recommendations
- `/app-store-toolkit:score` — Generate ASO quality score (0-100) with improvement suggestions

**Initial Store & MCP**
- `.appstore/config.json` — Bundle ID, platforms, locales, voice/tone settings (committed)
- `.appstore/config.local.json` — API credentials (gitignored)
- `.appstore/metadata/{locale}/` — Per-locale text with iteration history
- `asc_get_app`, `asc_get_app_info`, `asc_get_version`, `asc_get_version_localizations` — Read tools
- `asc_update_app_info`, `asc_update_version_localization`, `asc_update_iap_localization` — Write tools

---

## Versioning

The plugin and bundled MCP server share a version number, set in `.claude-plugin/plugin.json` (authority) and mirrored in `servers/appstore-connect/package.json`.

**Semver Rules:**
- **MAJOR** — Breaking tool-shape changes (removing a tool, changing required arguments)
- **MINOR** — New tools, skills, store files, or data schemas
- **PATCH** — Bug fixes that don't change tool interfaces

**Release Process:**
1. Implementation arc closes with a version-bump commit (e.g., `Bump to v0.4.0 — M3 complete`)
2. Tag: `git tag v0.4.0 && git push --tags`
3. The `appcraft-tools` marketplace references this repo via GitHub source
4. Install or update: `/plugin install app-store-toolkit@appcraft-tools --update`

---

## Archive

Questions or feedback? Open an [issue](https://github.com/vishalvshekkar/app-store-toolkit/issues) or [discussion](https://github.com/vishalvshekkar/app-store-toolkit/discussions) on GitHub.

See the [ROADMAP](../ROADMAP.md) for planned features (M4–M8) and the [Contributing Guide](contributing/) for development setup.
