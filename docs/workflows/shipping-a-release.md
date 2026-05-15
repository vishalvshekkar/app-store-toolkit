# Shipping a Release: The `/ship` Orchestrator

The `/app-store-toolkit:ship` command is the one-step orchestrator that takes your updated app from local metadata through App Store Connect validation, approval, and submission. It runs eight coordinated phases in sequence, with checkpoints after each so you can safely resume if something fails.

## What `/ship` Does

`/ship` is a full end-to-end submission flow:

1. **Audit** your release for readiness (character limits, asset dimensions, voice consistency, App Review phrases, cross-surface balance)
2. **Push all metadata** to App Store Connect (description, keywords, promotional text, release notes across all locales and platforms)
3. **Push listing configuration** (categories, age rating, pricing, availability, encryption settings)
4. **Push App Privacy** responses (data collection, tracking, declared data types)
5. **Push App Review info** (contact, demo credentials, testing notes)
6. **Push screenshots and previews** (if using asset management)
7. **Attach a TestFlight build** (you pick from available builds)
8. **Submit for review** (optional dry-run, then real submission; auto-release or manual publish depending on strategy)

Each phase is a checkpoint. If phase 5 fails, you fix the issue, run `/ship` again, and it picks up at phase 5—it doesn't redo phases 1–4. The state is persisted in `.appstore/ship-state.json`.

### When to Use `/ship` vs. Manual Steps

**Use `/ship` when:**
- You're ready to submit a complete release to App Store Connect
- You want a single command that handles the entire flow (no need to run `/push`, `/submit`, etc. separately)
- You want automatic checkpointing so failures don't lose your progress
- You're updating multiple fields (metadata + listing config + privacy + review + assets) and want them all validated together

**Use manual commands when:**
- You're iterating on metadata alone (just run `/aso` → `/push` → review, repeat)
- You're testing just the audit phase (`/audit` by itself)
- You want fine-grained control over which phases run (e.g., push metadata but skip assets)

---

## The 8 Phases (In Order)

### Phase 1: `audit`

**What runs:** Calls `/app-store-toolkit:audit` (7-phase submission readiness check). Reads the latest audit entry from `.appstore/history/audits.jsonl`.

**What advances the state:** All blockers either waived or passing. The audit reference (line index in audits.jsonl) is stored in `ship-state.json`.

**What aborts:** Any unwaived blocker. Examples:
- Character limits exceeded on any field
- Asset dimensions invalid (wrong screenshot size for a device category)
- Cross-surface imbalance (keywords missing in some locales)
- Forbidden phrases in description (detected via regex against App Review guidelines)

**To override blockers:** Use `--waive <check>:<target>` flags. See [Waivers](#waivers) below.

### Phase 2: `push-metadata`

**What runs:** Invokes `/app-store-toolkit:push` (without the `--assets-only` flag). Syncs all locale-text fields from `.appstore/metadata/` to App Store Connect:
- App name and subtitle (app-level, shared across platforms)
- Keywords, description, promotional text, release notes (per locale, per platform)

**What advances the state:** All `store_write_metadata` calls succeed and data is confirmed on ASC. Metadata lock is acquired to skip unchanged content.

**What aborts:** Any API error (invalid locale, version locked, concurrent edits detected). If the build is already in review, this phase cannot push further changes—the fix is to create a new version and retry.

### Phase 3: `push-listing`

**What runs:** Syncs app-level listing configuration from `.appstore/listing.json` to App Store Connect:
- Categories (primary and optional secondary via `asc_set_categories`)
- Age rating (answers from `ageRating.answers` via `asc_set_age_rating`)
- Pricing (default tier + per-territory overrides via `asc_set_pricing`)
- Availability (territories the app is live in via `asc_set_availability`)
- Encryption (default encryption flag and exemption codes; actual per-build override happens in phase 7)

**What advances the state:** All four listing mutations complete successfully.

**What aborts:** Invalid pricing tier, unavailable territory code, malformed age rating answers, or locked version state.

### Phase 4: `push-privacy`

**What runs:** Pushes App Privacy responses from `.appstore/privacy.json` via `asc_set_privacy_responses`. Includes:
- Top-level `collectsData` boolean
- Tracking configuration (enabled/disabled + domains)
- Declared data types (each with `linkedToUser`, `usedForTracking`, and `purposes`)

**What advances the state:** Privacy schema validation passes and the response is accepted by ASC.

**What aborts:** Invalid data type taxonomy (unknown purpose), missing required fields (e.g., domains when tracking is enabled), or conflicting declarations.

### Phase 5: `push-review`

**What runs:** Pushes App Review information from `.appstore/review.json` via `asc_set_review_info`. Includes:
- Contact information (first name, last name, email, phone)
- Demo account credentials (required boolean, and optional username/password)
- Testing notes (free-form text for the reviewer)

**What advances the state:** Contact info is valid (non-empty email/phone) and ASC accepts the payload.

**What aborts:** Missing required contact fields, invalid email format, or database constraints on the version record.

### Phase 6: `push-assets`

**What runs:** Calls `/app-store-toolkit:push --assets-only` to sync screenshots and previews from your local assets directory (if you have one). Uses the metadata lock (`.appstore/assets.lock.json`) to skip unchanged files—only new or modified assets are uploaded.

**What advances the state:** All asset uploads complete (or skip if lock indicates no changes). Asset metadata (SHA256 checksums, ASC IDs, dimensions) is refreshed in the lock.

**What aborts:** Invalid asset format (wrong dimensions, unsupported file type), asset server errors, or quota limits reached.

### Phase 7: `attach-build`

**What runs:** Picks a TestFlight build and attaches it to the version:
1. Calls `asc_list_builds` to show available builds (filtered by platform, not in review, not expired)
2. User selects a build from the interactive menu
3. Calls `asc_attach_build` to link the build to the version
4. Optionally sets per-build encryption overrides (if the build uses encryption differently than `listing.json` default)

**What advances the state:** Build is successfully attached and version state moves to "Prepare for Submission."

**What aborts:** No valid builds available, build is already attached, or encryption settings conflict with version state.

### Phase 8: `submit`

**What runs:** Final submission preparation and submission:
1. Confirms encryption flag (uses default from `listing.json`, or per-build override if set)
2. Confirms release strategy (how the version is released once Apple approves)
3. Confirms review info is correct (contact, demo account, notes)
4. **Dry-run:** Calls `asc_submit_for_review { dry_run: true }` to catch any last-minute blockers without actually submitting
5. **Real submission:** If dry-run passes, calls `asc_submit_for_review { dry_run: false }`
6. On success, appends entry to `.appstore/history/submissions.jsonl` and clears `ship-state.json`

**What advances the state:** Version is now "Waiting for Review" on App Store Connect. A submission ID is recorded.

**What aborts:** Dry-run detects blockers (e.g., build missing bitcode, age rating incomplete), version already submitted, or ASC API error. If aborted, `ship-state.json` stays at phase 8, and you can retry after fixing the issue.

---

## Checkpoint and Resume

### State File: `.appstore/ship-state.json`

Ship state is persisted after every successful phase. Example:

```jsonc
{
  "schema_version": 1,
  "version": "1.0.0",
  "started_at": "2026-05-15T18:00:00Z",
  "current_phase": "push-assets",
  "completed_phases": ["audit", "push-metadata", "push-listing", "push-privacy", "push-review"],
  "audit_findings_ref": "audits.jsonl:42",
  "waivers": [
    {
      "check": "locale-parity",
      "target": "ja",
      "reason": "Japanese stub for legal hold",
      "waived_at": "2026-05-15T18:00:15Z"
    }
  ]
}
```

**How it works:**

- **`started_at`:** When `/ship` was first invoked (ISO 8601 timestamp)
- **`version`:** The app version being shipped (from `config.json`)
- **`current_phase`:** The phase currently running or to be retried
- **`completed_phases`:** Array of phases that have completed successfully
- **`audit_findings_ref`:** Line index in `audits.jsonl` (e.g., `"audits.jsonl:42"`) so the same audit run is not re-executed
- **`waivers`:** Array of waived blockers for this ship run (includes reason and timestamp)

### Resume After Failure

If phase N fails (e.g., phase 6 asset upload times out), `/ship` will:

1. Show you the error with code, message, and remediation steps
2. Leave `ship-state.json` with `current_phase: "push-assets"` (phase 6)
3. Leave `completed_phases` unchanged—it still lists phases 1–5

When you run `/ship` again:

1. It reads `ship-state.json` and sees `current_phase: "push-assets"`
2. It skips phases in `completed_phases` (phases 1–5 are not re-run)
3. It retries phase 6 from the beginning—asset upload is idempotent (lock-driven skip-unchanged)
4. On success, phase 6 is appended to `completed_phases`, `current_phase` advances to `attach-build`
5. Phase 7 runs, then phase 8, then state is cleared

**All phases are idempotent:** Each phase's underlying tools (push, listing mutations, etc.) use skip-unchanged logic. Re-running phase 2 doesn't re-upload unchanged metadata; re-running phase 6 only uploads new assets.

---

## Waivers (`--waive`)

By default, `/ship` aborts if the audit finds any blockers. Waivers allow you to override specific blockers with explicit reasoning (recorded in the audit log for future review).

### Syntax

```
/app-store-toolkit:ship --waive <check>:<target> --reason "..."
```

- **`<check>`:** The blocker type (e.g., `locale-parity`, `char-limit`, `asset-dim`, `phrase-risk`)
- **`<target>`:** The specific field or asset (e.g., `ja`, `description`, `de-DE/iphone-6.7/02.png`)
- **`--reason`:** Required when using `--waive`; a free-form explanation for the waiver (recorded in audit log)

### Examples

**Waive a locale parity blocker:**
```
/app-store-toolkit:ship --waive locale-parity:ja --reason "Japanese stub for legal hold; approved by legal team"
```

**Waive a character-limit blocker:**
```
/app-store-toolkit:ship --waive char-limit:de-DE/description --reason "German marketing term requires extra characters; approved by product manager"
```

**Waive multiple blockers:**
```
/app-store-toolkit:ship \
  --waive locale-parity:ja --reason "Japanese stub for legal hold" \
  --waive asset-dim:de-DE/iphone-6.7/02.png --reason "Screenshot is 1242×2688, not exact spec—visually correct per QA"
```

**Waive a phrase-risk blocker:**
```
/app-store-toolkit:ship --waive phrase-risk:en-US/description --reason "Medical jargon approved by compliance; app is HIPAA-registered"
```

### How Waivers Are Matched

Each waiver is keyed by `{check, target}`. When the audit runs:

1. For every blocker found, check if there's a waiver with matching `check` and `target`
2. If found, mark the blocker as waived (include the waiver reason in the report)
3. If not found, the blocker is unwaived and `/ship` aborts

**Unmatched waivers are silently ignored** (no error). This allows you to use the same waive flags across multiple runs without breaking if the blocker no longer exists.

### Waiver Recording

Each waiver is appended to `.appstore/history/audits.jsonl` as a separate JSON line (not part of the main audit entry) for full auditability:

```jsonc
{"timestamp":"2026-05-15T18:00:15Z","type":"waiver","check":"locale-parity","target":"ja","reason":"Japanese stub for legal hold"}
```

---

## Failure Handling

When `/ship` encounters an error:

1. **Structured error output:** Shows code, message, and remediation (e.g., "Build already attached—please create a new version")
2. **State persisted:** `ship-state.json` is NOT advanced; `current_phase` stays at the failing phase
3. **Audit log preserved:** All previous push entries remain in `history/pushes.jsonl` and `history/audits.jsonl`
4. **User action:** Fix the underlying issue (e.g., create a new version, adjust character limits)
5. **Resume:** Run `/ship` again (optionally with new `--waive` flags)

### Common Failure Scenarios

| Scenario | Cause | Remediation | Phase |
|----------|-------|------------|-------|
| Character limit exceeded | Description too long for locale | Edit metadata, re-run `/aso`, `/ship` again | 1 (audit) |
| Asset dimension invalid | Screenshot 750×1334 instead of 1242×2688 | Update screenshot, re-run `/ship` | 1 (audit) |
| Version already submitted | Previous submission still in review | Create new version (e.g., v1.0.1), run `/ship` again | 8 (submit) |
| Build not found | Selected build no longer available in TestFlight | Upload new build, run `/ship` again | 7 (attach-build) |
| Encryption mismatch | Build has encryption flag but listing says no encryption | Update `listing.json` or per-build override, run `/ship` again | 7 or 8 |
| Locale missing content | One locale has empty description | Run `/localize` or edit metadata, `/push`, run `/ship` again | 2 (push-metadata) |

---

## Release Strategies

When submitting (phase 8), choose how your approved version is released to users:

### `AFTER_APPROVAL` (Default)

The version is automatically released to the App Store as soon as Apple approves it.

```
/app-store-toolkit:ship
```

### `MANUAL`

Apple approves the version, but you manually publish it when you're ready (you can delay launch for marketing, coordination, etc.).

```
/app-store-toolkit:ship --release-strategy MANUAL
```

Then, when you're ready, go to App Store Connect and click "Release this Version."

### `SCHEDULED`

The version is released automatically on or after a specific date (e.g., a coordinated launch date).

```
/app-store-toolkit:ship --release-strategy SCHEDULED --earliest-release-date 2026-06-01
```

Apple will hold the approved version and release it on the specified date (or earliest thereafter).

### `PHASED`

Apple's phased rollout: the approved version is released to a small percentage of users initially, then ramped up over 7 days.

```
/app-store-toolkit:ship --release-strategy PHASED
```

Users will see the update gradually; this allows you to monitor crash rates and feedback before rolling out to 100%.

---

## Publishing v1.1+ Releases

Once your v1.0 is live and approved, releasing v1.1 follows the same flow:

### Standard Update Flow

1. **Update your code** and build a new version in Xcode (bump to 1.1.0)
2. **Upload to TestFlight** (new build with higher version number)
3. **Update metadata** (optional):
   - Run `/aso` to regenerate copy for v1.1 (if anything changed)
   - Run `/changelog` to write release notes for v1.1 (what's new in this update)
   - Run `/localize` to translate to all locales
4. **Push to ASC:** `/push` (or skip if no changes)
5. **Ship:** `/ship --release-strategy AFTER_APPROVAL` (or your chosen strategy)

### Creating a New Version in ASC

If you want to manually create the version record in ASC first (rare):

```
/app-store-toolkit:submit --new-version 1.1.0
```

This calls `asc_create_version` to create the version record, then you can populate metadata separately. Most of the time, `/ship` handles version creation automatically.

---

## Logs After `/ship`

On successful submission, three files in `.appstore/history/` are updated:

### `.appstore/history/audits.jsonl`

One new line from phase 1. Example:

```jsonc
{"timestamp":"2026-05-15T18:00:00Z","version":"1.0.0","checks":[...],"blockers":[],"waivers":[{"check":"locale-parity","target":"ja","reason":"..."}],"passed":true}
```

### `.appstore/history/pushes.jsonl`

One new line per push call across phases 2–6. Example:

```jsonc
{"timestamp":"2026-05-15T18:00:45Z","tool":"asc_update_version_localization","input":{"version_id":"xyz","localization_id":"abc","description":"..."},"result":{"id":"abc","status":"success"}}
{"timestamp":"2026-05-15T18:00:50Z","tool":"asc_set_categories","input":{"app_id":"123456789","primary":"PRODUCTIVITY"},"result":{"id":"cat-1","status":"success"}}
```

### `.appstore/history/submissions.jsonl`

One new line on successful submission (phase 8). Example:

```jsonc
{"timestamp":"2026-05-15T18:05:30Z","version":"1.0.0","duration_seconds":330,"phases":["audit","push-metadata","push-listing","push-privacy","push-review","push-assets","attach-build","submit"],"build_id":"abc123","release_strategy":"AFTER_APPROVAL","submission_id":"sub-789","outcome":"submitted"}
```

These are all **committed to git** in your next `git commit`, creating an immutable audit trail of every submission.

---

## Practical Example: Shipping v1.0.0

You've completed development and want to release v1.0.0 to the App Store:

```bash
# 1. Ensure metadata is finalized and pushed locally
/app-store-toolkit:aso  # Generate copy for all locales
/app-store-toolkit:changelog 1.0.0  # Write release notes
/app-store-toolkit:push  # Push to local store

# 2. Validate everything before shipping
/app-store-toolkit:validate  # Check char limits, asset dimensions

# 3. Upload final build to TestFlight, then ship
/app-store-toolkit:ship --release-strategy AFTER_APPROVAL
```

**Expected output:**

```
📋 Phase 1/8: audit
  ✓ 7 checks passed
  ✓ No blockers

🔄 Phase 2/8: push-metadata
  ✓ Synced 12 locales (iOS + macOS)

🔄 Phase 3/8: push-listing
  ✓ Categories, age rating, pricing, availability set

🔄 Phase 4/8: push-privacy
  ✓ Privacy responses saved

🔄 Phase 5/8: push-review
  ✓ Review contact and demo credentials updated

🔄 Phase 6/8: push-assets
  ✓ 156 screenshots and 12 previews synced (lock-driven)

🔄 Phase 7/8: attach-build
  Select a build:
  1. Build 42 (v1.0.0, iOS, 2026-05-15)
  > 1
  ✓ Build attached

🔄 Phase 8/8: submit
  Dry-run... ✓ Passed
  Submitting... ✓ Submitted
  
✅ Success! Version 1.0.0 submitted (ID: sub-abc789).
   Status: Waiting for Review
   Release strategy: Auto-release on approval
```

The state file is cleared, and a line is added to `submissions.jsonl`.

If anything fails (e.g., phase 6 times out), fix it and run `/ship` again—it resumes from phase 6 without re-running the earlier phases.

---

## Related Documentation

- **[Audit Deep Dive](audit-deep-dive.md)** — Detailed explanation of the 7 audit checks
- **[Handling Rejections](handling-rejections.md)** — What to do if Apple rejects your version
- **[File Schemas Reference](../reference/file-schemas.md)** — `ship-state.json`, `submissions.jsonl`, `audits.jsonl` formats
- **[Command Reference](../reference/commands.md)** — All `/ship` arguments and related commands (`/audit`, `/push`, `/submit`)
- **[Character Limits](../reference/character-limits.md)** — Field-by-field limits that `/ship` validates
