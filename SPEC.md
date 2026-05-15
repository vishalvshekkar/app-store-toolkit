# Specification

The product specification has been split into focused pages under [`docs/`](docs/README.md). This file is preserved as a redirect.

## Architecture and concepts

- [Architecture overview](docs/concepts/architecture.md) — the three-layer design (skills + MCP server + local store)
- [Local store](docs/concepts/local-store.md) — `.appstore/` directory layout and the git-tracking pillar
- [Voice and tone](docs/concepts/voice-and-tone.md) — how AI generation is shaped
- [Locales](docs/concepts/locales.md) — multi-locale model + localizer agent
- [History and audit](docs/concepts/history-and-audit.md) — `history/*.jsonl` audit streams

## Reference

- [Slash commands](docs/reference/commands.md) — every command, arguments, behavior
- [MCP tools](docs/reference/mcp-tools.md) — every typed tool exposed by the bundled server
- [File schemas](docs/reference/file-schemas.md) — JSON shape for every committed file
- [Character limits](docs/reference/character-limits.md) — the eight ASC limits + how the toolkit enforces them

## Workflows

- [First submission](docs/workflows/first-submission.md) — end-to-end v1.0
- [Shipping a release](docs/workflows/shipping-a-release.md) — `/ship` deep dive
- [Handling rejections](docs/workflows/handling-rejections.md) — reject → fix → resubmit
- [Assets pipeline](docs/workflows/assets-pipeline.md) — screenshots and App Previews
- [Audit deep dive](docs/workflows/audit-deep-dive.md) — the seven phases of `/audit`

## Milestone design specs

The three milestone specs are preserved verbatim under [`docs/superpowers/specs/`](docs/superpowers/specs/):

- [`2026-05-14-submission-readiness-design.md`](docs/superpowers/specs/2026-05-14-submission-readiness-design.md) — parent spec (M1/M2/M3 framing + §12 follow-on rounds)
- [`2026-05-15-m2-assets-design.md`](docs/superpowers/specs/2026-05-15-m2-assets-design.md) — M2 assets design
- [`2026-05-15-m3-submit-design.md`](docs/superpowers/specs/2026-05-15-m3-submit-design.md) — M3 submit/audit/ship design

The implementation plans (TDD task lists per milestone) live under [`docs/superpowers/plans/`](docs/superpowers/plans/).
