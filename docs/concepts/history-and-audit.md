# History and Audit: Three Streams of Truth

The toolkit maintains three append-only JSONL files in `.appstore/history/` that form the complete audit trail of everything your app has sent to the App Store. Together, they answer the question: "What did we tell App Store Connect, and when?"

This document explains each stream, how it's populated, what it contains, and how to read it.

## Why an Audit Log?

Three goals drive the design:

1. **Historical accountability:** `git log -p .appstore/history/` shows every field change without clicking through the App Store Connect web UI. You can answer "when did we change the German promo text?" or "what categories were live on the day we submitted v1.0?" by reading the commit history.

2. **Pull request transparency:** Code reviewers see every push that will happen to App Store Connect. Before your app goes live, collaborators can audit the exact payloads bound for ASC. Changes to pricing, privacy responses, review contact info—all visible as diffs in your PR.

3. **Failed submission trails:** When App Review rejects your submission, you can correlate the rejection email with what you told ASC. The history log records the version, submission ID, timestamp, and exact payload sent. If there's a mismatch between what you intended and what ASC saw, the log gives you the proof.

---

## The Three Streams

### Stream 1: `pushes.jsonl` — Every Metadata Change

**When it's written:**  
Every successful call to these MCP tools appends one line:
- `asc_set_categories`, `asc_set_age_rating`, `asc_set_pricing`, `asc_set_availability`
- `asc_set_privacy_responses`, `asc_set_review_info`, `asc_set_encryption_compliance`
- `asc_update_app_info`, `asc_update_version_localization`
- `asc_update_iap_localization`, `asc_upload_app_preview`
- `asc_attach_build`, `asc_set_release_strategy`, `asc_create_version`
- `asc_delete_*` (any deletion)

**What's in each entry:**

```json
{
  "timestamp": "2026-05-15T18:43:22.000Z",
  "tool": "asc_set_categories",
  "target": { "app_id": "1234567890" },
  "payload": { "primary": "PRODUCTIVITY", "secondary": "UTILITIES" },
  "result": "success",
  "details": {}
}
```

- **timestamp** — ISO 8601 UTC, auto-inserted if omitted by the tool.
- **tool** — MCP tool name that triggered the write.
- **target** — Identifying context: which app, version, locale, IAP, or build. Keys vary per tool.
- **payload** — Sanitized input sent to ASC. Sensitive fields (review contact passwords, demo credentials, API secrets) are redacted before write.
- **result** — One of `"success"`, `"error"`, `"skipped"`. Skipped entries are for tools that detected no-op changes (same value already on ASC) and exited early.
- **error** — Error message or stack snippet if `result === "error"`.
- **details** — Optional map of per-locale or per-step results (e.g., if one version succeeded and another failed).

**What it answers:**
- "What URLs did we push to ASC last Tuesday?"
- "When did we change categories, and what did we change them to?"
- "Was that build attachment successful?"
- "Did we ever send that review contact's phone number, and if so, when?"

---

### Stream 2: `audits.jsonl` — Readiness Checks

**When it's written:**  
Every `/app-store-toolkit:audit` skill run appends one line.

**What's in each entry:**

```json
{
  "timestamp": "2026-05-15T18:40:00.000Z",
  "version": "1.0.0",
  "blocker_count": 2,
  "quality_count": 3,
  "findings": [
    {
      "check": "locale-parity",
      "severity": "blocker",
      "locale": "ja",
      "field": "description",
      "message": "missing"
    },
    {
      "check": "char-limits",
      "severity": "blocker",
      "locale": "de-DE",
      "field": "keywords",
      "message": "165 chars, limit is 100"
    },
    {
      "check": "cross-surface",
      "severity": "quality",
      "locale": "en-US",
      "screenshot": "iphone-6.7/02-stats.png",
      "type": "contradiction",
      "copy_field": "promotional_text",
      "copy_says": "Try it free for 7 days",
      "screen_text_extracted": "Free 30-day trial",
      "fix": "Either update the screenshot or align the promo text."
    }
  ],
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

- **timestamp** — When the audit ran.
- **version** — App version number being audited.
- **blocker_count** — Number of findings with severity `"blocker"`.
- **quality_count** — Number of findings with severity `"quality"`.
- **findings** — Array of audit findings from seven phases:
  1. **Locale parity** (blocker) — Every required field populated in every configured locale.
  2. **Character limits** (blocker) — All fields within Apple's limits.
  3. **Required fields** (blocker) — Listing, privacy, and review configs have no sentinel "not configured" values.
  4. **Asset dimensions** (blocker) — Screenshots and app previews meet Apple's size/resolution specs.
  5. **Voice drift** (quality) — Localized copy maintains consistent tone across description, promo, and release notes.
  6. **Phrase risk** (blocker or quality per rule) — Copy scanned for medical claims, guarantees, regulatory language that trigger reviewer scrutiny.
  7. **Cross-surface** (quality) — Vision check correlating screenshot text against promotional copy and promises.
- **waivers** — List of checks explicitly waived by the user (e.g., `--waive locale-parity:ja --reason "..."`). Each waiver suppresses blockers matching that check and target.

**What it answers:**
- "What did the audit flag in the last run?"
- "Have we waived locale-parity before, and why?"
- "How many blockers are between us and submission?"
- "Did cross-surface find any contradictions in the en-US screenshots?"

---

### Stream 3: `submissions.jsonl` — Submission Records

**When it's written:**  
Two paths write here:
1. Successful `asc_submit_for_review` call with `dry_run: false`.
2. Successful `/app-store-toolkit:ship` run (which internally calls `asc_submit_for_review`).

**What's in each entry:**

```json
{
  "timestamp": "2026-05-15T18:43:22.000Z",
  "version": "1.0.0",
  "duration_seconds": 2580,
  "phases": ["audit", "push-metadata", "push-listing", "push-privacy", "push-review", "push-assets", "attach-build", "submit"],
  "build_id": "abc123def456",
  "release_strategy": "AFTER_APPROVAL",
  "submission_id": "sub_xyz789",
  "outcome": "WAITING_FOR_REVIEW",
  "submitted_at": "2026-05-15T18:43:22.000Z"
}
```

- **timestamp** — When the submission record was written.
- **version** — App version submitted.
- **duration_seconds** — How long the entire `/ship` orchestration took (only for `/ship` submissions; standalone `asc_submit_for_review` may omit this).
- **phases** — Array of all phases executed. For `/ship`, this is always `["audit", "push-metadata", "push-listing", "push-privacy", "push-review", "push-assets", "attach-build", "submit"]`. For standalone `asc_submit_for_review`, this is omitted.
- **build_id** — TestFlight build ID attached to the submission.
- **release_strategy** — Release type: `"AFTER_APPROVAL"`, `"MANUAL"`, `"SCHEDULED"`, or `"PHASED"`.
- **submission_id** — App Store Connect submission ID returned by ASC.
- **outcome** — Submission state at the moment of writing. Typically `"WAITING_FOR_REVIEW"`, but can be `"READY_FOR_SALE"`, `"REJECTED"`, etc. if the user queries and logs the state later.
- **submitted_at** — Timestamp from the ASC response; may differ slightly from `timestamp` (wall-clock arrival vs. response generation).

**What it answers:**
- "When did we submit v1.0?"
- "Which build did we attach to that submission?"
- "What release strategy are we using?"
- "How long did the entire `/ship` orchestration take?"
- "Did that submission make it all the way to App Review, or did it hang?"

---

## The Best-Effort Pattern

History writes are **best-effort**. Every mutating MCP tool wraps its `appendHistoryEntry` call in try-catch. If the disk is full, the file is locked, or the `.appstore/` directory can't be created, the history write fails silently. **The API call succeeds anyway.**

Here's the pattern:

```typescript
try {
  const result = await setCategories(appInfoId, payload);
  await appendHistoryEntry("pushes", {
    tool: "asc_set_categories",
    target: { app_id: appId },
    payload,
    result: "success",
  });
  return result;
} catch (error) {
  // best-effort: history-write failures never invert API success
  // The tool already succeeded; we just couldn't log it.
  console.warn("History write failed (disk full?), but API call succeeded.");
  return result;
}
```

**Why?** The history log is for your own audit trail and PR review. It's valuable but not critical. If it fails, your app still gets updated in App Store Connect. You can manually reconstruct what happened by querying ASC or checking the git diff of your `.appstore/` store files.

This pattern was established in M1 commit `506d943` and is enforced by the resilience test suite (`src/tools/__tests__/history-resilience.test.ts`), which mocks the history writer to throw and verifies the API result still succeeds.

---

## Reading the Streams

### Command-line reading

```bash
# Latest audit findings
tail -1 .appstore/history/audits.jsonl | jq .

# All pushes by tool
cat .appstore/history/pushes.jsonl | jq '.tool' | sort | uniq -c

# Count all entries per stream
wc -l .appstore/history/*.jsonl

# All submissions
cat .appstore/history/submissions.jsonl | jq '.version, .submission_id'

# Git history of pushes
git log -p .appstore/history/pushes.jsonl
```

### In code (MCP tools)

The MCP server exposes two tools to read history programmatically:

- **`store_list`** with `type: "history"` — Returns all entries from a stream with optional filtering. See `/app-store-toolkit:list` skill and [`reference/file-schemas.md`](../reference/file-schemas.md) for the full schema.
- **`store_read_metadata`** — While primarily for reading localized content, it can also surface iteration history for any field. History entries are keyed by stream and indexed position.

Example skill invocation:

```
/app-store-toolkit:list --type history --stream pushes
```

Returns a formatted table of all pushes with timestamps, tools, and outcomes.

---

## What's NOT Logged

- **Read-only tools** (`asc_get_*`, `store_read_*`) do not append to history. They're safe to call repeatedly without side effects.
- **Pulls** (via `/app-store-toolkit:pull`) do not append to history. The pull operation fetches metadata from ASC and updates store files, but those store file changes are themselves versioned in git. The intent is captured by the git commit message.
- **Dry-run tools** (e.g., `asc_submit_for_review --dry-run`) do not append. Only real mutations append.

---

## Pruning and Archiving History

History files are append-only and never truncated by the toolkit. In normal app lifecycles, they grow slowly (a few hundred entries per year of active development). If your history becomes large and you want to archive it:

1. Create an archive directory: `mkdir -p .appstore/history/archive`
2. Move old entries: `mv .appstore/history/pushes.jsonl .appstore/history/archive/pushes-2026Q1.jsonl`
3. Commit: `git add .appstore/history/archive/ && git commit -m "Archive Q1 2026 history"`

The toolkit always reads the current files (`pushes.jsonl`, `audits.jsonl`, `submissions.jsonl`). Archived files are reference-only; they do not affect active workflows.

---

## Comparing to App Store Connect's Own Logs

App Store Connect has its own activity log visible in the web UI under App Information > Activity. Our `history/` streams record events **from your perspective**; ASC's log records events **from theirs**.

**Key differences:**

| Our log | ASC's log |
|---------|-----------|
| Records every local mutation (including dry-runs and waivers). | Records only what ASC saw. |
| Captures `payload` we sent; ASC might process it differently. | Records ASC's processing result and any transformations. |
| Immutable; commits to git. | Visible only in the web UI; no public API export. |
| Has a clear intent (tied to git history). | Reactive log of what happened on ASC's servers. |

They should largely agree. If they don't, the discrepancy is worth investigating—it may indicate a network issue, a race condition, or a bug in the toolkit.

---

## Related Reading

- [`local-store.md`](./local-store.md) — The `.appstore/` directory structure and how store files are versioned.
- [`audit-deep-dive.md`](../workflows/audit-deep-dive.md) — Detailed walkthrough of each audit phase.
- [`reference/file-schemas.md`](../reference/file-schemas.md) — Full JSON schemas for `pushes.jsonl`, `audits.jsonl`, and `submissions.jsonl`.
- [M1 Plan](../superpowers/plans/2026-05-14-m1-fill-every-field.md) — History infrastructure origins (commit `506d943`).
- [M3 Plan](../superpowers/plans/2026-05-15-m3-submit.md) — Audits and submissions stream design.
