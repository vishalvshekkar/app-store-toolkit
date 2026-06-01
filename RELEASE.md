# Release kit — v0.4.1

This file is a **prepared release plan**. Nothing here has been executed. The maintainer runs the steps below when ready. Delete or archive this file after the release.

---

## Pre-flight (all already verified at HEAD)

- [x] Working tree clean
- [x] `plugin.json` and `servers/appstore-connect/package.json` both at `0.4.1`
- [x] `npm --prefix servers/appstore-connect run build` succeeds (133 KB ESM)
- [x] `npm --prefix servers/appstore-connect test` — 119/119 pass (44 test files)
- [x] `docs/changelog.md` has a v0.4.1 entry
- [x] README status line and known-limitation note updated
- [ ] **Live ASC sandbox dry-run** — see [docs/contributing/live-asc-checklist.md](docs/contributing/live-asc-checklist.md) (recommended before first public release)

---

## Step 1 — Push the branch

83 commits are local. Push `main` to the plugin repo:

```bash
git push origin main
```

Repo: `github.com/vishalvshekkar/app-store-toolkit`

---

## Step 2 — Tag the release

```bash
git tag -a v0.4.1 -F .git/TAG_MSG_v0.4.1
git push origin v0.4.1
```

Where `.git/TAG_MSG_v0.4.1` contains the tag message below (copy it into that file first, or paste inline with `git tag -a v0.4.1 -m "..."`).

### Tag message

```
v0.4.1 — Guidance system + documentation site

Adds the in-plugin guidance layer and a full documentation site on top of the
M3 (submit + audit + ship) release.

- /help skill: state-aware "what's next" + docs-grounded answers
- SessionStart hook prints a one-line next-step recommendation
- All 18 skills gain a consistent "Suggested next" footer
- docs/ site: 20 pages covering getting-started, concepts, reference,
  workflows, and contributing

Plugin and MCP server bumped 0.4.0 -> 0.4.1. 119 tests pass.

Known limitation: the App Store Connect tool layer is unit-tested with mocked
HTTP/JWT but not yet verified against a live ASC account. See
docs/contributing/live-asc-checklist.md.
```

---

## Step 3 — Confirm the marketplace points here

The `appcraft-tools` marketplace (`github.com/vishalvshekkar/appcraft-tools`) references this plugin by GitHub source. Confirm its `.claude-plugin/marketplace.json` has an entry like:

```json
{ "source": "github", "repo": "vishalvshekkar/app-store-toolkit" }
```

Claude Code reads the plugin's own `plugin.json` for the version (it is the authority), so no version edit is needed in the marketplace — but if `marketplace.json` duplicates a version field, bump it to `0.4.1` for clarity.

---

## Step 4 — Create the GitHub release

`gh release create v0.4.1` (or via the web UI). Suggested release notes:

### GitHub release notes (paste into the release body)

> **app-store-toolkit v0.4.1 — Guidance system + documentation site**
>
> This release makes the plugin self-explanatory inside Claude Code and ships a full documentation site.
>
> **New**
> - **`/app-store-toolkit:help`** — ask "what's next?" or any question ("how do screenshots work?") and get a state-aware, docs-grounded answer with the exact command to run.
> - **Session hints** — every session now opens with a `→ Next: …` recommendation based on where you are in the release flow.
> - **Consistent skill footers** — every command ends by pointing you at the natural next step.
> - **Documentation site** — 20 pages under `docs/`: getting-started, architecture, the local store, voice/locales, a full command + MCP-tool reference, and end-to-end workflow guides (first submission, shipping, rejections, assets, audit).
>
> **Install / update**
> ```
> /plugin marketplace add vishalvshekkar/appcraft-tools
> /plugin install app-store-toolkit@appcraft-tools
> ```
>
> **Heads-up:** the App Store Connect API tools are fully unit-tested but have not yet been run against a live Apple account. If you're shipping a real app, walk through `docs/contributing/live-asc-checklist.md` first.
>
> Full changelog: [docs/changelog.md](docs/changelog.md)

---

## Step 5 — Post-release smoke test

After the marketplace picks up the new version:

1. In a fresh Claude Code session (or `/plugin install --update`), confirm the version shows `0.4.1`.
2. Run `/app-store-toolkit:help` — should print the state-aware recommendation.
3. Open a project with `.appstore/` and confirm the SessionStart hook prints the `→ Next:` line.

---

## Rollback

If something is wrong after tagging:

```bash
git tag -d v0.4.1
git push origin :refs/tags/v0.4.1   # delete the remote tag
```

Then fix, re-bump (e.g. `0.4.2`), and re-tag. Avoid re-using a tag that users may have already pulled.
