# app-store-toolkit

AI-powered App Store Connect management for Claude Code.

Generate ASO-optimized listings, audit submissions for consistency, render localized screenshots, and ship releases end-to-end — all from Claude Code, without touching the web UI.

## What you can do

- **Generate ASO-optimized listings** (`/app-store-toolkit:aso`) — name, subtitle, keywords, description, promo text
- **Localize to 39 locales** (`/app-store-toolkit:localize`) — culturally-aware transcreation, not just translation
- **Render screenshots from templates** (`/app-store-toolkit:render-screenshots`) — Puppeteer-based asset generation
- **Audit submission readiness** (`/app-store-toolkit:audit`) — vision-driven cross-surface consistency checks
- **Ship releases end-to-end** (`/app-store-toolkit:ship`) — orchestrator with phase-level resume and overrides
- **Manage App Store metadata** (`/app-store-toolkit:push`, `/app-store-toolkit:pull`) — sync local store to App Store Connect

## Install

```
/plugin marketplace add vishalvshekkar/appcraft-tools
/plugin install app-store-toolkit@appcraft-tools
```

Or directly:
```
/plugin install https://github.com/vishalvshekkar/app-store-toolkit
```

## Documentation

- **Getting started**: See `docs/getting-started.md`
- **All commands**: See `docs/reference/commands.md`
- **Full documentation index**: See `docs/README.md`
- **Roadmap**: See `ROADMAP.md`
- **Changelog**: See `docs/changelog.md`

## Status

Milestones M1 (fill every ASC field), M2 (assets), and M3 (submit + audit + ship) are complete at v0.4.0. Eight follow-on improvement rounds remain on the roadmap. See `ROADMAP.md` for details.

## Contributing

See `CONTRIBUTING.md` for setup and development guidelines.

## License

MIT. See `LICENSE` for details.
