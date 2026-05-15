# app-store-toolkit documentation

Welcome to the documentation for app-store-toolkit, a Claude Code plugin that manages App Store Connect metadata, submissions, and releases with AI. Whether you're an app developer shipping your first release, a contributor building new features, or just curious about how App Store automation works, you'll find guides and references here.

## Quick start

**New to the plugin?** Start with [Getting started](getting-started.md) — a 10-minute walk through setup and your first metadata generation.

**Shipping a release?** Jump straight to [Shipping a release](workflows/shipping-a-release.md) — the end-to-end workflow for version bumps, changelogs, and submissions.

**Looking for a command or tool?** Check [Commands reference](reference/commands.md) for every slash command, or [MCP tools reference](reference/mcp-tools.md) for the underlying API.

## Documentation by section

### Getting started
- **[Getting started](getting-started.md)** — Install, authenticate, configure voice/tone, and generate your first App Store listing in 10 minutes.

### Concepts
Deep dives into the architecture, data model, and design decisions.

- **[Architecture](concepts/architecture.md)** — Three-layer plugin structure (skills, MCP server, local store) and how data flows between them.
- **[Local store](concepts/local-store.md)** — The `.appstore/` directory: config files, metadata structure, iteration history, and the audit log.
- **[Voice and tone](concepts/voice-and-tone.md)** — How to configure a consistent voice for all generated content across locales and releases.
- **[Locales and localization](concepts/locales.md)** — 39 supported locales, how the localizer agent works, and when to localize content.
- **[History and audit](concepts/history-and-audit.md)** — Append-only audit logs, understanding pushes to App Store Connect, and compliance tracking.

### Reference
Lookup tables and schema documentation.

- **[Commands reference](reference/commands.md)** — Every slash command (`/app-store-toolkit:aso`, `/app-store-toolkit:push`, etc.) with parameters, examples, and use cases.
- **[MCP tools reference](reference/mcp-tools.md)** — All MCP server tools, organized by domain (App Store Connect API, local store, auth).
- **[File schemas](reference/file-schemas.md)** — JSON structure for config.json, metadata, privacy, review, listing, and history files.
- **[Character limits](reference/character-limits.md)** — The 8 App Store fields with hard character limits and how validation works.

### Workflows
Step-by-step guides for common tasks.

- **[First submission](workflows/first-submission.md)** — End-to-end guide for shipping a brand-new app: onboarding, metadata generation, builds, and going live.
- **[Shipping a release](workflows/shipping-a-release.md)** — Bump version, auto-generate release notes, update localizations, and push to App Store Connect.
- **[Handling rejections](workflows/handling-rejections.md)** — Understand rejection reasons, fix metadata or code issues, and resubmit.
- **[Assets pipeline](workflows/assets-pipeline.md)** — Screenshots, preview videos, app icons, and promotional art workflows.
- **[Audit deep dive](workflows/audit-deep-dive.md)** — Using `/app-store-toolkit:audit` to review 7 phases of app store compliance.

### Contributing
For developers extending the plugin.

- **[Development](contributing/development.md)** — Build, test, and run the plugin locally; TypeScript/MCP server setup.
- **[Adding tools](contributing/adding-tools.md)** — TDD walkthrough for adding a new MCP tool from tests to deployment.

### Roadmap and changelog
- **[Roadmap](roadmap.md)** — M1 (shipping), M2 (multiregion reviews), M3 (marketplace) and 12 follow-up milestones.
- **[Changelog](changelog.md)** — Release notes for each version.

## About this project

**app-store-toolkit** is a Claude Code plugin for developers who ship to the App Store. Version **0.4.0** (M2 in progress) adds support for submissions, reviews, and compliance audits.

Install via the Claude Code plugin marketplace:
```
/plugin marketplace add vishalvshekkar/appcraft-tools
/plugin install app-store-toolkit@appcraft-tools
```

Repository: [github.com/vishalvshekkar/app-store-toolkit](https://github.com/vishalvshekkar/app-store-toolkit)

Marketplace catalog: [github.com/vishalvshekkar/appcraft-tools](https://github.com/vishalvshekkar/appcraft-tools)

## Found an issue?

Report bugs, request features, or ask questions on GitHub: [github.com/vishalvshekkar/app-store-toolkit/issues](https://github.com/vishalvshekkar/app-store-toolkit/issues)
