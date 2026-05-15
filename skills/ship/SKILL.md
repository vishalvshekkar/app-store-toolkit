---
name: app-store-toolkit:ship
description: Full submission orchestrator. Runs /audit, pushes metadata + listing + privacy + review + assets, attaches build, and submits. Checkpoint state in .appstore/ship-state.json so failure resumes mid-flight. Audit blockers abort unless waived with --waive.
arguments:
  - name: waive
    description: "Waive a specific audit blocker: --waive <check>:<target>. Repeatable."
    required: false
  - name: reason
    description: "Reason for waivers (required when --waive is used; recorded in audit log)"
    required: false
  - name: release-strategy
    description: "Release strategy: AFTER_APPROVAL | MANUAL | SCHEDULED | PHASED"
    required: false
user_invocable: true
---

# /app-store-toolkit:ship

You are running a full App Store submission end-to-end. Eight phases; checkpoint after each in `.appstore/ship-state.json`.

## 1. Load or initialize ship-state

- Call `store_read_ship_state`. 
  - If state exists, this is a resume: skip every phase in `completed_phases` and re-enter `current_phase`.
  - If no state exists, this is a fresh run: build a fresh `ShipState` (schema_version 1, version from config, started_at = now ISO, current_phase = "audit", completed_phases = [], audit_findings_ref = null, waivers = []) and call `store_write_ship_state { state }`.

Parse `$ARGUMENTS` for `--waive check:target` (may appear multiple times) and `--reason "..."`. These become the run's waivers.

## 2. Phases (in order)

### Phase 1: audit
- Call `/app-store-toolkit:audit` as a sub-skill (or run the audit checks inline).
- Read the latest entry from `.appstore/history/audits.jsonl`.
- For each blocker, check whether it's been waived (the user's `--waive` list matches `check:target`).
- If unwaived blockers remain, abort with the punch list and instruction: "Re-run with --waive to override, or resolve the blockers."
- Update ship-state: append `"audit"` to `completed_phases`, set `current_phase: "push-metadata"`, set `audit_findings_ref` to the latest audits.jsonl line index. Persist via `store_write_ship_state`.

### Phase 2: push-metadata
- Call `/app-store-toolkit:push` with no asset flag (skip assets; that's phase 6).
- On success, update state: `completed_phases += "push-metadata"`, `current_phase = "push-listing"`.

### Phase 3: push-listing
- Push categories, age rating, pricing, availability, encryption (from `listing.json`). Use the existing M1 tools (`asc_set_categories`, `asc_set_age_rating`, `asc_set_pricing`, `asc_set_availability`).
- On success, advance state.

### Phase 4: push-privacy
- `asc_set_privacy_responses` from `privacy.json`.
- On success, advance state.

### Phase 5: push-review
- `asc_set_review_info` from `review.json`.
- On success, advance state.

### Phase 6: push-assets
- Call `/app-store-toolkit:push --assets-only`.
- On success, advance state.

### Phase 7: attach-build
- Run `/app-store-toolkit:submit` up through the attach step (steps 1–3 of /submit), then return control to /ship.
- Alternatively: replay the build picker logic — `asc_list_builds`, pick valid build, `asc_attach_build`.
- On success, advance state.

### Phase 8: submit
- Apply encryption + release strategy + review info confirmation (steps 4–6 of /submit).
- Dry-run via `asc_submit_for_review { dry_run: true }`. If blockers remain after the push phases, abort with them shown.
- Real submit: `asc_submit_for_review { dry_run: false }`.
- On success, advance state.

## 3. On failure of any phase

- The phase's structured error is shown to the user (code + remediation).
- ship-state.json is NOT advanced.
- User re-runs `/ship` to resume at the same `current_phase`.

## 4. On successful submit

- Append one line to `.appstore/history/submissions.jsonl`:
  ```jsonc
  {"timestamp":"<now>","version":"<X.Y.Z>","duration_seconds":<delta>,"phases":[...8 phases...],
   "build_id":"<id>","release_strategy":"<type>","submission_id":"<id>","outcome":"submitted"}
  ```
- Call `store_clear_ship_state` to delete `ship-state.json`.
- Print final summary: "Submitted version X.Y.Z. Submission id: <id>. Waiting for review."

## Related

- `/app-store-toolkit:reviews` — once the app goes live, monitor and respond to customer reviews
- `/app-store-toolkit:changelog` — start drafting release notes for the next version
- See also: docs/workflows/shipping-a-release.md
