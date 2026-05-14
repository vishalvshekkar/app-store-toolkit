# Roadmap

What's planned for app-store-toolkit. No promises on timelines.

## Completed

- [x] M1 — Toolkit can fill every required ASC field (v0.2.0)
  - listing.json (categories, age rating, pricing, availability, encryption)
  - privacy.json (App Privacy responses with taxonomy validation)
  - review.json (App Review information)
  - URL fields on existing tools (marketingUrl, supportUrl, privacyPolicyUrl)
  - history audit log (.appstore/history/*.jsonl)

## In Progress

- [ ] M2 — Toolkit handles assets (screenshot upload, App Preview upload, dimension catalog, light HTML templating)
- [ ] M3 — Toolkit submits (build attach, submit-for-review, /audit, /submit, /ship skills)

## Later

- [ ] Privacy depth (Privacy Manifest cross-check, Required Reason API audit)
- [ ] Post-launch ops (analytics pull, reviews intelligence, rejection triage)
- [ ] Multi-app / multi-account / multi-platform
- [ ] Marketing surface (Custom Product Pages, PPO A/B testing, In-App Events)

See `docs/superpowers/specs/2026-05-14-submission-readiness-design.md` for the M1/M2/M3 architecture and §12 for the post-M3 follow-on rounds.

## Ideas (Not Committed)

- Automatic promo art generation with AI
- Competitor keyword gap analysis
- Review sentiment trends over time
- Slack/webhook notifications on metadata sync

---

Have an idea? [Open a feature request](https://github.com/vishalvshekkar/app-store-toolkit/issues/new?template=feature.yml) or [start a discussion](https://github.com/vishalvshekkar/app-store-toolkit/discussions).
