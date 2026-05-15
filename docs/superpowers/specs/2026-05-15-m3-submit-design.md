# M3 — Submit + Audit + Ship: Design

**Date:** 2026-05-15
**Status:** Approved for implementation
**Parent spec:** [2026-05-14-submission-readiness-design.md](2026-05-14-submission-readiness-design.md) — this document refines and supersedes §5.2 (M3 row) and §5.3 of the parent for everything M3-scoped.

This design closes the submission-readiness ladder. After M3, a developer can run `/app-store-toolkit:ship` once and have the toolkit audit, push, attach the build, and submit a v1.0 release end-to-end — no App Store Connect web UI required. M3's headline is `/audit`'s vision-driven cross-surface check: the host model reads the screenshot PNGs alongside the localized copy and flags contradictions and missing promises that no field-by-field validator can catch.

---

## 1. Scope

In:

- 6 new MCP tools wrapping App Store Connect: `asc_list_builds`, `asc_attach_build`, `asc_set_release_strategy`, `asc_submit_for_review`, `asc_get_submission_state`, `asc_create_version`.
- 1 new local MCP tool: `audit_prepare_cross_surface` — builds the vision-prompt spec the audit skill executes.
- 1 new store tool pair: `store_read_ship_state` / `store_write_ship_state`.
- 1 new data file: `review-phrase-rules.json` — phrase-risk catalog for the audit skill.
- 3 new skills: `/audit`, `/submit`, `/ship`.
- New state files: `.appstore/ship-state.json` (gitignored, transient) and entries in `history/audits.jsonl` and `history/submissions.jsonl`.
- New structured error codes for the submit path.

Out (deferred to parent spec §12):

- Multi-app workspace, multi-account, multi-platform parity.
- Custom Product Pages, PPO A/B testing, In-App Events.
- TestFlight tester management, beta What's New.
- Sales / financial pulls, analytics.
- Privacy Manifest cross-check / Required Reason API audit (round 2).
- Submission-state webhooks, rejection-triage skill (round 3).

## 2. Decisions from brainstorming

Five decisions shape the M3 design. Each is a deliberate choice from brainstorming; the parent spec stays the higher-level reference but is superseded on these specifics.

1. **Vision check: MCP tool prepares the prompt; skill executes it.** `audit_prepare_cross_surface` is a pure TypeScript function over the local store — it gathers the locale's description / keywords / promo / what's-new and the list of screenshot PNG paths, builds a deterministic prompt template, and returns `{prompt, screenshots, copy}`. The `/audit` skill then uses Claude Code's `Read` tool on each PNG (Claude Code loads images natively) and asks the host model with the prepared prompt. No MCP tool ever calls a vision API directly. This split keeps the prompt-construction logic snapshot-testable in TypeScript while the actual reasoning happens in the host model.

2. **Audit punch list: markdown table to user, JSON to `history/audits.jsonl`.** The user-facing output is grouped by severity (BLOCKER first, then QUALITY) with one row per finding. The same findings are persisted as a single JSON object per audit run, diffable in PR review. `/ship` reads the latest JSONL entry to decide whether to bail.

3. **Ship checkpoints: phase-level granularity.** Eight phases: `audit`, `push-metadata`, `push-listing`, `push-privacy`, `push-review`, `push-assets`, `attach-build`, `submit`. State file holds `{version, started_at, current_phase, completed_phases, audit_findings_ref, waivers}`. Each phase is idempotent (the underlying push tools already use skip-unchanged semantics from M1/M2), so resume-from-phase is safe.

4. **Per-blocker waiver, command-line only.** Default `/ship` aborts on any audit blocker. The user explicitly re-runs with `--waive check:target --reason "..."` (one or more times). Each waiver is recorded in the audit log. No interactive prompts: every override is reproducible from the command line and visible in git history.

5. **`asc_submit_for_review --dry-run` validates readiness, no API call.** Returns `{ready: bool, blockers: [...], would_submit: {...}}`. The tool reads the current ASC version state (build attached? encryption answered? privacy responses set? review info populated?) and reports what's missing. The actual submit POST happens only when `dry_run: false`.

---

## 3. New MCP tools

All tools sit in `servers/appstore-connect/src/tools/` and follow the existing `asc_*` / `store_*` / new `audit_*` naming.

### 3.1 Tool table

| Tool | Mode | Purpose |
|---|---|---|
| `asc_list_builds` | ASC reader | List TestFlight builds for an app, optionally filtered by version, with processing state. Returns `[{id, version, build_number, processing_state, valid: bool, expires_at}]`. Only `valid:true` builds are attachable. |
| `asc_attach_build` | ASC mutator | Bind a build to an editable version. PATCHes the version's `build` relationship. Appends history. |
| `asc_set_release_strategy` | ASC mutator | Set `AFTER_APPROVAL` / `MANUAL` / `SCHEDULED` (with date) / `PHASED`. Pushes to the version-level release type and `earliestReleaseDate`. Appends history. |
| `asc_submit_for_review` | ASC mutator (or local pre-flight when `dry_run`) | The submit action. When `dry_run: true`, performs readiness checks locally and returns a structured report without calling ASC. When `dry_run: false`, POSTs `/v1/appStoreVersionSubmissions`. Appends history on the real submit. |
| `asc_get_submission_state` | ASC reader | Single read of the version's `appStoreState` enum. Skills poll if they want to wait. |
| `asc_create_version` | ASC mutator | Create a new editable version (v1.1+). Optional `copy_metadata_from_version_id` argument triggers server-side copy of app-info localizations and version localizations from the named version to the new one. Appends history. |
| `audit_prepare_cross_surface` | Local | Pure function over the local store. Returns `{prompt, screenshots, copy}` ready for the `/audit` skill to feed the host model. No model call; no API call. |
| `store_read_ship_state` / `store_write_ship_state` | Store | Read/write `.appstore/ship-state.json` (gitignored). Tiny surface for `/ship` orchestration. |

### 3.2 `asc_submit_for_review` shape

```ts
// Input
{
  app_id: string,
  version_id: string,
  dry_run?: boolean   // default false
}

// Dry-run output (no API call)
{
  ready: false,
  blockers: [
    {"check": "no-build-attached", "remediation": "Run asc_attach_build first"},
    {"check": "encryption-not-set", "remediation": "Run asc_set_encryption_compliance"}
  ],
  would_submit: {
    app_id: "1234567890",
    version_id: "abcdef",
    build_id: null,
    release_strategy: "AFTER_APPROVAL",
    automatic_release: false
  }
}

// Real submit output
{
  submitted: true,
  submission_id: "sub_xyz",
  state: "WAITING_FOR_REVIEW",
  submitted_at: "2026-05-15T18:43:00Z"
}
```

Blocker checks performed during dry-run:
- `no-build-attached`: version has no `build` relationship.
- `build-not-valid`: attached build's `processingState !== "VALID"`.
- `encryption-not-set`: attached build has no `usesNonExemptEncryption` answer.
- `privacy-not-set`: app's data-usage publish state is `NOT_PUBLISHED`.
- `review-info-incomplete`: version's `appStoreReviewDetail` is missing contact or notes.
- `categories-not-set`: app info has no primary category.

Each blocker carries a `remediation` with the specific MCP tool call to run.

### 3.3 `audit_prepare_cross_surface` shape

Input:
```ts
{ locale: string, platform: string }
```

Output:
```ts
{
  prompt: string,                  // ready-to-send template populated with the locale's content
  screenshots: Array<{
    path: string,                  // absolute path under .appstore/assets/
    device: string,
    position: number               // sorted-filename position
  }>,
  copy: {
    description: string,
    keywords: string,
    promotional_text: string,
    whats_new: string
  }
}
```

The prompt template asks the host model to return a strict JSON array of findings (shape in §4.1). Snapshot-tested in TypeScript.

### 3.4 `review-phrase-rules.json` shape

```jsonc
{
  "rules": [
    {
      "pattern": "\\b(diagnose|diagnosis)\\b",
      "severity": "blocker",
      "reason": "Medical claims trigger App Review escalation. Reword unless cleared with Apple.",
      "ignore_inside": ["quotedTestimonial"]
    },
    {
      "pattern": "\\bguarantee\\b",
      "severity": "quality",
      "reason": "Unconditional guarantees attract reviewer attention."
    },
    {
      "pattern": "\\b(doctor[- ]ready|FDA[- ]approved)\\b",
      "severity": "blocker",
      "reason": "Regulatory claims need substantiation."
    }
  ]
}
```

Loaded by a typed module `src/data/review-phrase-rules.ts` that compiles each `pattern` once at module load.

---

## 4. New skills

### 4.1 `/app-store-toolkit:audit`

Single-pass readiness check. Seven phases. Output is a markdown table to the user and one JSONL row to `history/audits.jsonl`.

| Phase | Severity | How it works |
|---|---|---|
| 1. Locale parity | BLOCKER | Per configured locale, check that every required field has a value. Uses `store_validate`. |
| 2. Char limits | BLOCKER | Per locale × platform, every field is under its limit. Uses `store_validate`. |
| 3. Required-field presence | BLOCKER | Reads `listing.json`, `privacy.json`, `review.json`; flags sentinel "not configured" states (e.g., empty `categories.primary`, empty review contact). |
| 4. Asset dimensions | BLOCKER | Calls `assets_validate_dimensions` (M2). |
| 5. Voice drift | QUALITY | For each locale, host model reads the voice config and the description/promo/what's-new; returns `{drift: bool, rationale}`. |
| 6. Phrase risk | BLOCKER or QUALITY per rule | Regex pre-pass over every localized text using `review-phrase-rules.json`. For each hit, host model does a context pass to decide if the hit is genuine or in an acceptable context (e.g., `diagnose` inside a quoted testimonial). |
| 7. Cross-surface (vision) | QUALITY | `audit_prepare_cross_surface` → `Read` each PNG → host model returns strict JSON findings. |

**Cross-surface findings JSON shape** (the model is asked for exactly this in the prompt):

```jsonc
{
  "locale": "en-US",
  "findings": [
    {
      "type": "contradiction",
      "screenshot": "iphone-6.7/02-stats.png",
      "screen_text_extracted": "Free 30-day trial",
      "copy_field": "promotional_text",
      "copy_says": "Try it free for 7 days",
      "severity": "quality",
      "fix": "Either update the screenshot or align the promo text."
    },
    {
      "type": "missing_promise",
      "copy_field": "description",
      "copy_says": "Real-time sync across devices",
      "screen_text_extracted": null,
      "severity": "quality",
      "fix": "Add a screenshot showing the sync feature."
    }
  ]
}
```

**Findings funnel into the same punch list as the other six phases.** All findings end up in one `audits.jsonl` row.

### 4.2 `/app-store-toolkit:submit`

Build-attach-and-submit pipeline. Runnable standalone.

1. `asc_list_builds` → show user the `valid:true` builds, ask which to attach.
2. `asc_attach_build`.
3. Read `listing.json`'s encryption default; call `asc_set_encryption_compliance` if the attached build doesn't already have it set.
4. Read `listing.json`'s release strategy (or accept `--release-strategy` override); call `asc_set_release_strategy`.
5. Read `review.json`; if it differs from what ASC has, call `asc_set_review_info`.
6. Dry-run via `asc_submit_for_review({dry_run: true})`. Show the `would_submit` payload. Ask confirmation.
7. `asc_submit_for_review({dry_run: false})` — the real submit.
8. If `--wait` is passed (default off), poll `asc_get_submission_state` every 30 seconds until the state is terminal (`READY_FOR_SALE`, `REJECTED`, `PENDING_DEVELOPER_RELEASE`, etc.).

For v1.1+ release path: `/submit --new-version 1.1.0 --copy-from 1.0.0` calls `asc_create_version({copy_metadata_from_version_id})` first, then proceeds with the same flow.

### 4.3 `/app-store-toolkit:ship`

The orchestrator. Eight phases in order; checkpoint after each in `ship-state.json`.

```
audit → push-metadata → push-listing → push-privacy → push-review → push-assets → attach-build → submit
```

**Resume:** On re-run, reads `ship-state.json`. Skips every phase listed in `completed_phases`. Re-enters `current_phase` from scratch — each phase is idempotent.

**Waivers:** `/ship --waive locale-parity:ja --waive asset-dim:de-DE/iphone-6.7/02.png --reason "shipping ja stub for legal hold"`. Waivers are matched against the audit findings; any blocker whose `{check, target}` is waived is treated as clear. Unmatched waivers (no corresponding finding) are silently ignored — they're a no-op, not an error.

**On success:** Write one summary line to `history/submissions.jsonl`; delete `ship-state.json`.

**On failure of any phase:** `ship-state.json` stays unchanged at `current_phase`; the failed phase's structured error is shown to the user with its remediation. Re-running `/ship` resumes from `current_phase`.

---

## 5. State and audit log shapes

### 5.1 `.appstore/ship-state.json` (gitignored, transient)

```jsonc
{
  "schema_version": 1,
  "version": "1.0.0",
  "started_at": "2026-05-15T18:00:00Z",
  "current_phase": "push-assets",
  "completed_phases": [
    "audit",
    "push-metadata",
    "push-listing",
    "push-privacy",
    "push-review"
  ],
  "audit_findings_ref": "audits.jsonl:42",
  "waivers": [
    {
      "check": "locale-parity",
      "target": "ja",
      "reason": "ja stub for legal hold",
      "waived_at": "2026-05-15T18:00:11Z"
    }
  ]
}
```

### 5.2 `history/audits.jsonl` — one line per audit run

```jsonc
{
  "timestamp": "2026-05-15T18:00:00Z",
  "version": "1.0.0",
  "blocker_count": 2,
  "quality_count": 3,
  "findings": [
    {"check":"locale-parity","severity":"blocker","locale":"ja","field":"description","message":"missing","fix":"run /aso for ja"},
    {"check":"cross-surface","severity":"quality","locale":"en-US","screenshot":"iphone-6.7/02.png","type":"contradiction","copy_field":"promo","copy_says":"7 days","screen_text_extracted":"30 days","fix":"align promo and screenshot"}
  ],
  "waivers": [
    {"check":"locale-parity","target":"ja","reason":"…","waived_at":"…"}
  ]
}
```

### 5.3 `history/submissions.jsonl` — one line per successful `/ship` run

```jsonc
{
  "timestamp": "2026-05-15T18:43:00Z",
  "version": "1.0.0",
  "duration_seconds": 2580,
  "phases": ["audit","push-metadata","push-listing","push-privacy","push-review","push-assets","attach-build","submit"],
  "build_id": "abc123",
  "release_strategy": "AFTER_APPROVAL",
  "submission_id": "sub_xyz",
  "outcome": "submitted"
}
```

---

## 6. Error handling

Continues M1+M2's pattern. New error codes:

```ts
type SubmitError = {
  code:
    | "NO_BUILD_ATTACHED"
    | "BUILD_NOT_VALID"
    | "ENCRYPTION_NOT_SET"
    | "PRIVACY_NOT_SET"
    | "REVIEW_INFO_INCOMPLETE"
    | "CATEGORIES_NOT_SET"
    | "ASC_SUBMIT_REJECTED",
  message: string,
  remediation: string,
  asc_response?: unknown
}
```

`/ship` failures: any phase that errors aborts `/ship`. `current_phase` stays unchanged in `ship-state.json`. The structured error is shown with its `remediation`. A re-run resumes from `current_phase`.

History append is best-effort (M1 pattern): every successful mutator appends, every failure to append logs to stderr and does not invert the primary success.

---

## 7. Testing

- **Unit tests per new MCP tool** with mocked `fetch`/JWT, mirroring existing patterns in `src/api/__tests__/`.
- **History-resilience tests** for `asc_attach_build`, `asc_set_release_strategy`, `asc_submit_for_review`, `asc_create_version` (mirroring M1+M2 resilience tests).
- **`audit_prepare_cross_surface` snapshot test** — fixture `.appstore/` with known content and screenshot file paths; the returned `{prompt, screenshots, copy}` is locked in `toMatchInlineSnapshot`. Any prompt-template change is a deliberate diff.
- **Dry-run tool test** — covers each of the six blocker conditions individually plus the all-green `{ready:true}` path.
- **Phrase-rules data test** — snapshot of the rules file + regex compilation check (every pattern compiles).
- **Ship-state tests** — round-trip read/write, resume from each phase.
- **`/audit` skill smoke test** — fixture project, exercise phases 1–4 and 6 (regex pass only, no model). Assert correct finding count and severity distribution.
- **Vision check and voice drift are NOT unit-testable** — they require the host model. Manual integration tests against a fixture project, run pre-release.

Target: full automated test suite stays under 6 seconds on a clean machine.

---

## 8. Backwards compatibility

- All new MCP tools are additive — no changes to existing tool signatures from M1/M2.
- New store file `ship-state.json` is gitignored and created on first `/ship` run; its absence is a "not currently shipping" state, not an error.
- New skills are additive — they don't modify or break the existing skill surface.
- Plugin and server bump to **v0.4.0** at end of M3. `plugin.json` is the authority.

---

## 9. Implementation order

A separate implementation plan ([2026-05-15-m3-submit.md](../plans/2026-05-15-m3-submit.md)) decomposes this into TDD'd tasks. Rough order:

1. `review-phrase-rules.json` data file + typed loader + snapshot test.
2. `ship-state` store helpers + tests.
3. `store_read_ship_state` / `store_write_ship_state` MCP tools + tests.
4. `asc_list_builds` API wrapper + tests.
5. `asc_attach_build` API wrapper + tests.
6. `asc_set_release_strategy` API wrapper + tests.
7. `asc_create_version` API wrapper + tests.
8. `asc_submit_for_review` and `asc_get_submission_state` API wrappers + tests (real submit path).
9. MCP tools for builds (list, attach) + history-resilience.
10. MCP tools for release strategy + create version + history-resilience.
11. `asc_submit_for_review` MCP tool with dry-run readiness checks + history-resilience.
12. `asc_get_submission_state` MCP tool.
13. `audit_prepare_cross_surface` MCP tool + snapshot test.
14. `/audit` skill (phases 1–7 wiring; the host-model-dependent phases are described in the skill markdown).
15. `/submit` skill.
16. `/ship` skill (orchestrator, --waive, resume).
17. Docs (README, CLAUDE.md, ROADMAP) updates.
18. Version bump to 0.4.0.

---

## 10. Out of scope reminder

Eight follow-on rounds from parent spec §12 remain explicitly deferred. M3 ships v1.0 submission end-to-end; everything else is a separate brainstorming → spec → plan cycle when prioritized.
