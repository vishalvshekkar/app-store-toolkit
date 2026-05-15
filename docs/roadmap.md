# Roadmap

This is the public roadmap for app-store-toolkit. The first three milestones (M1, M2, M3) shipped in v0.4.0 and delivered the core submission-readiness feature set. Eight follow-on rounds are currently deferred from this arc and would be prioritized separately as their own brainstorming → spec → plan cycles.

## Done

### M1 — Fill every required ASC field (v0.2.0)

Implemented all MCP tools and store accessors needed to populate every text field, dropdown, and toggle required for a v1.0 iOS App Store submission via the toolkit.

- Listing configuration (categories, age rating, pricing, availability, encryption compliance)
- App Privacy questionnaire responses (taxonomy-validated against Apple's schema)
- App Review information (reviewer contact, demo account credentials, submission notes)
- Per-locale URL fields (marketing URL, support URL, privacy policy URL)
- Append-only `.appstore/history/pushes.jsonl` audit log tracking all mutations to ASC

### M2 — Assets (v0.3.0)

Added the complete pipeline for validating, uploading, and managing screenshots and App Preview videos. Includes optional lightweight HTML-to-PNG templating for users who don't bring their own asset workflow.

- 10 new MCP tools for asset upload, deletion, and listing (screenshots, App Previews)
- Strict per-locale asset directory layout under `.appstore/assets/` with dimension validation
- Lock-driven skip-unchanged optimization in `/push` to avoid redundant uploads
- Manifest-only `/pull` by default, with `--with-bytes` opt-in to fetch binary asset content
- Optional Puppeteer-based HTML template renderer (lazy install, user opt-in)

### M3 — Submit + audit + ship (v0.4.0)

Completed the orchestration layer: audit for submission readiness, structured build attachment and submission, and a resumable `/ship` orchestrator that runs the full pipeline end-to-end.

- Build attachment, release strategy, and submit MCP tools for the final submission workflow
- `/audit` skill with seven-phase readiness check: locale parity, character limits, required fields, asset dimensions, voice drift detection, App Review phrase risk scanning, and vision-driven cross-surface consistency
- `/submit` skill for guided build selection, encryption confirmation, release strategy, and review info confirmation
- `/ship` orchestrator (8-phase pipeline with checkpointed resume) that runs audit → push → assets → submit without user intervention; `--waive` flag allows overriding blockers with audit trail
- Append-only `history/submissions.jsonl` for submission event tracking and resume state management

For the detailed technical design of M1, M2, and M3, see [concepts/architecture.md](concepts/architecture.md) and the implementation specs under `docs/superpowers/specs/`.

## Later

Eight follow-on rounds remain explicitly deferred from this arc. Each is treated as its own independent brainstorming → spec → plan cycle when prioritized. They are listed here to ensure they are not lost to scope creep discussions.

### Round 2 — Privacy depth

Extended privacy and security coverage beyond the basic ASC questionnaire.

- Privacy Manifest (`PrivacyInfo.xcprivacy`) cross-check against `privacy.json` and App Store Connect declarations
- Required Reason API audit — scan Swift/Obj-C source for APIs requiring declared reasons; validate against manifest
- Tracking domain registration support for apps using AppTrackingTransparency
- Privacy Choices URL and CCPA compliance fields
- Health Records and HealthKit as first-class data types in the privacy schema

### Round 3 — Post-launch ops

Analytics and feedback workflows for live apps.

- Daily analytics pull (impressions, downloads, conversion rate, keyword ranking) stored in `.appstore/analytics/` as git-tracked time series
- Reviews intelligence: sentiment clustering, topic extraction, spike alerts, localized reply drafting
- Submission state notifications via webhook or `/loop` integration with Slack/Discord
- Rejection triage skill: parse rejection reasons, identify affected fields, suggest fixes and reply templates

### Round 4 — Multi-everything

Account, workspace, and platform expansion.

- Multi-app support (separate app instances per bundle ID, workspace configuration)
- Multi-account support (switch between developer accounts or organizations)
- macOS, tvOS, watchOS, visionOS parity (currently iOS-only)
- Team management (roles, permissions, audit trails per user)

### Round 5 — Marketing surface

Custom Product Pages, A/B testing, and promotional features.

- Custom Product Pages creation and A/B testing
- App Preview Point-of-Interest (PPO) interactive hotspot configuration
- In-App Events scheduling and management
- Promoted In-App Purchases configuration
- Apple Search Ads campaign integration (if API available)

### Round 6 — Asset pipeline depth

Advanced rendering and asset management.

- App Preview MP4 generation and editing from templates (currently validation/upload only)
- Locale-aware asset rendering beyond the starter English template set
- Asset hashing and deduplication to reduce repository bloat for large asset libraries
- Alternate app icons and app icon variants

### Round 7 — Studio features

Build and operational reporting integrations.

- TestFlight tester management (invitations, groups, device tracking)
- Sales and Trends data pull (revenue, refunds, geographic breakdown)
- Financial forms and tax reporting (Contract, Tax, and Banking information)
- CI/CD integration (GitHub Actions, GitLab CI, Fastlane workflows)

### Round 8 — Voice and consistency upgrades

Model-driven quality and localization improvements.

- Voice training from project repositories (README, code comments, brand guidelines) for higher fidelity localization
- Glossary management for consistent terminology across locales
- Locale-aware quality scoring (e.g., stricter rules for RTL languages or specific regional App Store guidelines)
- Pre-launch wizard for first-time users (guided setup, best practices, checklist)

## How to influence the roadmap

You can request features, report bugs, or discuss priorities on GitHub:

- **Feature requests:** [Open a feature request](https://github.com/vishalvshekkar/app-store-toolkit/issues/new?template=feature.yml)
- **Bug reports:** [Open a bug report](https://github.com/vishalvshekkar/app-store-toolkit/issues/new?template=bug.yml)
- **Discussion:** [Start a discussion](https://github.com/vishalvshekkar/app-store-toolkit/discussions)

## Out of scope

The following areas are explicitly **not** in scope for this project and will not be implemented:

- **Multi-app / multi-account support** — the toolkit is designed for single-app workflows. Multi-app scenarios require separate brainstorming and design.
- **Multi-platform beyond iOS** — while the data model is platform-aware, macOS, tvOS, watchOS, and visionOS are not prioritized for this arc.
- **Financial and tax forms** — sales reports, revenue tracking, contract/tax/banking information, and other financial workflows remain outside the toolkit's scope.
- **Automation outside the public App Store Connect API** — features like web-UI automation or undocumented endpoints are not supported.

These constraints keep the toolkit focused on its core mission: managing every aspect of a single iOS app's App Store listing as code.

---

For technical details, see [concepts/architecture.md](concepts/architecture.md).
