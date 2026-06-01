# Live App Store Connect verification checklist

Every App Store Connect tool in this plugin is covered by unit tests, but those
tests **mock the HTTP layer and JWT signing**. No code path has been exercised
against the real Apple API. This checklist is the pre-production gate: run it
once against a throwaway sandbox app before relying on the toolkit for a real
submission, and any time the ASC API shapes are suspected to have drifted.

## Why this matters

The endpoint paths, JSON:API body shapes, and response field names for the M3
submission surface (`asc_list_builds`, `asc_attach_build`,
`asc_set_release_strategy`, `asc_submit_for_review`, `asc_get_submission_state`,
`asc_create_version`) and parts of M2 (asset reserve/upload/commit) were written
from API knowledge, not verified live. Apple occasionally changes attribute
names and relationship shapes between API versions. A mismatch surfaces as a 4xx
with a JSON:API error, which the tools report but which only a live call reveals.

## Prerequisites

- An Apple Developer account you're willing to test with
- A **throwaway or non-production app** registered in App Store Connect (do not
  practice on a live, revenue-generating listing)
- An App Store Connect API key (`.p8`) with the **App Manager** role, plus its
  Key ID and Issuer ID — see [getting-started.md](../getting-started.md)
- A TestFlight build uploaded to the sandbox app (needed for the build-attach
  and submit steps; can be skipped for the read-only and metadata steps)

## Procedure

Work through these in order. Stop at the first failure, capture the exact tool
call and the raw ASC error, and fix the implicated `src/api/*.ts` wrapper before
continuing.

### Phase A — Auth and reads (non-mutating, safe)

- [ ] `/app-store-toolkit:setup` against the sandbox app's bundle ID + credentials
- [ ] `/app-store-toolkit:pull` — confirms JWT auth works and the app/version/
      localization read endpoints return the shapes the store expects
- [ ] `/app-store-toolkit:status` — confirms the diff logic runs end-to-end
- [ ] `asc_list_builds` (via `/submit` step 1, or directly) — confirms the build
      list endpoint and `processingState` field name are correct

If Phase A passes, auth and the read surface are verified.

### Phase B — Metadata writes (mutating, reversible)

- [ ] Make a trivial copy change (e.g., a word in the description) and
      `/app-store-toolkit:push` — confirms `asc_update_version_localization`
- [ ] Set a category via `.appstore/listing.json` + push — confirms
      `asc_set_categories`
- [ ] Set App Privacy responses + push — confirms `asc_set_privacy_responses`
      (this is the largest typed surface; watch for taxonomy enum mismatches)
- [ ] Set App Review info + push — confirms `asc_set_review_info`
- [ ] Confirm each write appended a line to `.appstore/history/pushes.jsonl`

All of these are reversible from the ASC web UI if something looks wrong.

### Phase C — Assets (mutating)

- [ ] Drop one correctly-sized PNG into
      `.appstore/assets/ios/<locale>/iphone-6.7/screenshots/01.png`
- [ ] `/app-store-toolkit:validate` — confirms the dimension catalog matches
      Apple's current requirements
- [ ] `/app-store-toolkit:push --assets-only` — exercises the full 3-step
      reserve → PUT → commit upload protocol; confirms `asc_upload_screenshot`
      and that `sourceFileChecksum` (MD5) is accepted by Apple
- [ ] Confirm `assets.lock.json` was written with a non-null `asc_id`
- [ ] Re-run the push — confirm it reports `unchanged` (skip-unchanged works)
- [ ] `asc_delete_screenshot` (or `/pull` then inspect) — confirms delete + list

### Phase D — Submission flow (the riskiest, mutating)

Run the dry-run first; it makes **no** mutating call and validates readiness:

- [ ] `asc_submit_for_review` with `dry_run: true` — confirms the version/build/
      privacy/review/categories read shapes used by the readiness checker. The
      six blocker checks each hit a distinct endpoint; a wrong path here shows up
      as a spurious blocker or a thrown error.
- [ ] `asc_attach_build` — attach the TestFlight build to the editable version
- [ ] `asc_set_release_strategy` with `{ type: "MANUAL" }` — safest strategy for
      a test (you control if/when it goes live)
- [ ] `asc_set_encryption_compliance` — confirms the encryption answer shape

Only if you genuinely intend to submit the sandbox app:

- [ ] `asc_submit_for_review` with `dry_run: false` — the real submit. Confirms
      the `/v1/appStoreVersionSubmissions` POST body. **You can cancel the
      submission from the ASC web UI afterward** if this is only a test.
- [ ] `asc_get_submission_state` — confirms the `appStoreState` read

### Phase E — Orchestration

- [ ] `/app-store-toolkit:audit` — runs all 7 phases; confirms
      `audit_prepare_cross_surface` produces a usable prompt and the vision
      check loads screenshots
- [ ] `/app-store-toolkit:ship` through at least the first few phases — confirms
      the checkpoint/resume state machine works against live calls; kill it
      mid-flow and re-run to confirm resume

## When a call fails

The original brief for this project flagged this explicitly: **if an ASC
endpoint or payload shape doesn't match what Apple returns, don't fix it
silently.** Capture:

1. Which tool/skill was called
2. The exact request (method, path, body) — add a temporary `console.error` in
   the relevant `src/api/*.ts` wrapper if needed
3. Apple's raw JSON:API error response

Then correct the wrapper, update its unit test to match the real shape, and
re-run this checklist from the failing phase.

## After a clean run

Once Phases A–E pass against the sandbox:

- Note the verified date and ASC API version in this file's history (via git)
- Consider adding env-var-gated integration tests (the M1/M2/M3 specs each
  describe this pattern: tests that hit a real sandbox account, skipped unless
  `ASC_INTEGRATION=1`) so future regressions are caught automatically
- The toolkit is now safe to use for a real submission

## See also

- [Getting started](../getting-started.md) — credential setup
- [Shipping a release](../workflows/shipping-a-release.md) — the `/ship` flow
- [Handling rejections](../workflows/handling-rejections.md) — when Apple says no
- [Adding tools](adding-tools.md) — how the api/tool/test layers fit together
