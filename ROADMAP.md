# Roadmap

## Done

- **M1 — Fill every required ASC field** (v0.2.0)
  - Listing config (categories, age rating, pricing, availability, encryption)
  - App Privacy responses (taxonomy-validated)
  - App Review information (contact, demo, notes)
  - Per-locale URL fields (marketing, support, privacy policy)
  - Append-only `.appstore/history/pushes.jsonl` audit log
- **M2 — Assets** (v0.3.0)
  - 8 new MCP tools + 2 store tools for screenshots and App Previews
  - Strict per-locale asset layout under `.appstore/assets/`
  - Lock-driven skip-unchanged in `/push`
  - Manifest-only `/pull` by default, `--with-bytes` opt-in
  - Optional Puppeteer-based template renderer (lazy install)
- **M3 — Submit + audit + ship** (v0.4.0)
  - Build attach + release strategy + submit MCP tools
  - `/audit` with vision-driven cross-surface consistency check
  - `/submit` build-attach-and-submit pipeline
  - `/ship` 8-phase orchestrator with checkpointed resume and `--waive` blockers

## Later (parent spec §12)

Eight follow-on rounds remain explicitly out of scope for this arc and become their own brainstorming → spec → plan cycles when prioritized:

- Round 2: Privacy depth (Privacy Manifest cross-check, Required Reason API audit, ATT tracking domain registration, CCPA, HealthKit)
- Round 3: Post-launch ops (analytics, reviews intelligence, submission-state notifications, rejection-triage skill)
- Round 4: Multi-everything (workspace, accounts, platforms, team management)
- Round 5: Marketing surface (Custom Product Pages, PPO A/B testing, In-App Events, promoted IAPs, Apple Search Ads)
- Round 6: Asset pipeline depth (App Preview video rendering, localized rendering beyond starter, asset hashing/dedup, alternate icons)
- Round 7: Studio features (TestFlight management, Sales and Trends, financial forms, CI integration)
- Round 8: Voice and consistency upgrades (voice training, glossary, locale-aware quality, pre-launch wizard)

---

See `docs/superpowers/specs/2026-05-14-submission-readiness-design.md` for the M1/M2/M3 architecture.

Have an idea? [Open a feature request](https://github.com/vishalvshekkar/app-store-toolkit/issues/new?template=feature.yml) or [start a discussion](https://github.com/vishalvshekkar/app-store-toolkit/discussions).
