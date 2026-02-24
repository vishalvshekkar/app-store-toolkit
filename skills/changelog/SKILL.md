---
name: appcraft:changelog
description: Generate release notes from git history or manual input
arguments:
  - name: range
    description: "Git version range (e.g., v1.0..v2.0) or version number for manual entry"
    required: false
  - name: instructions
    description: "Additional instructions for release notes style"
    required: false
user_invocable: true
---

# /appcraft:changelog

You are generating release notes (What's New) for an app version.

## Steps

### 1. Load Configuration

Call `store_read_config` to get voice/tone settings and platforms.

### 2. Determine Version Range

Follow this priority order:

**Priority 1 — User specified range in `$ARGUMENTS`:**
If the user provided a range like `v1.0..v2.0` or `1.0..2.0`, use that directly.

**Priority 2 — Git tags:**
Run `git tag --sort=-version:refname` to list tags. Take the latest two tags as the range.
- If only one tag exists, use `{tag}..HEAD`
- If no tags exist, fall through to Priority 3

**Priority 3 — Existing release notes:**
Call `store_list` with `type: "release_notes"` to check for existing versions.
If found, the latest version is the "from" — ask the user for the new version number.

**Priority 4 — Manual:**
Ask the user for:
- The version number (e.g., "2.1.0")
- What changed (they can describe changes in natural language)

### 3. Gather Changes

**Git mode** (Priorities 1-2):
Run `git log {from}..{to} --oneline --no-decorate` to get the commit list.

Parse conventional commits if enabled in config:
- `feat:` / `feature:` → **Features** / **New**
- `fix:` / `bugfix:` → **Bug Fixes**
- `perf:` → **Performance**
- `refactor:` / `chore:` / `docs:` / `style:` / `test:` / `ci:` / `build:` → **Improvements** (or skip if minor)

For non-conventional commits, use AI to categorize them.

**Manual mode** (Priorities 3-4):
Use whatever the user described as the source material.

### 4. Generate Release Notes

Create user-friendly release notes following these rules:
- Apply configured voice/tone
- Maximum 4000 characters
- Focus on user-visible changes (skip internal refactors, CI changes, dependency bumps unless significant)
- Group by category (New, Improved, Fixed) when there are many changes
- For small releases, a simple paragraph or bullet list works
- Start with the most impactful change
- Use language users understand (not developer jargon)
- Be specific about what changed, not vague ("Fixed a bug where photos failed to upload on slow connections" not "Bug fixes")

### 5. Validate

Check the generated release notes are under 4000 characters.
If over, regenerate with explicit constraint. Retry up to 2 times.

### 6. Present to User

Show the generated release notes with character count:

```
Release Notes for v2.1.0 (847/4000 chars):
───────────────────────────────────────────
[release notes content]
───────────────────────────────────────────
```

If git-based, also show the raw commits that were summarized.

Ask the user to approve, request changes, or edit.

### 7. Save

On approval, call `store_write_metadata` with:
- `field`: `"release_notes"`
- `platform`: for each configured platform
- `version`: the version string
- `source`: `"ai_generated"`
- `context`: "Generated from git commits {from}..{to}" or "Manual entry"

### 8. Suggest Next Steps

- "Run `/appcraft:localize` to translate release notes to other locales"
- "Run `/appcraft:push` to sync to App Store Connect"
