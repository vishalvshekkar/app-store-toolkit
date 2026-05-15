---
name: app-store-toolkit:submit
description: Build-attach-and-submit pipeline. Picks a TestFlight build, confirms encryption + release strategy + review info, dry-runs the submit, and posts the real submission to App Store Connect.
arguments:
  - name: new-version
    description: "Create a new version first (e.g., 1.1.0)"
    required: false
  - name: copy-from
    description: "When creating a new version, copy metadata from this version string"
    required: false
  - name: release-strategy
    description: "Override release strategy: AFTER_APPROVAL | MANUAL | SCHEDULED | PHASED"
    required: false
  - name: wait
    description: "Poll asc_get_submission_state until terminal state"
    required: false
user_invocable: true
---

# /app-store-toolkit:submit

## 1. (Optional) Create a new version

If `$ARGUMENTS` includes `--new-version <X.Y.Z>` and optionally `--copy-from <prev>`:
- Call `asc_create_version { app_id, version_string, platform: "IOS" }`.
- Note: copying metadata from an existing version is handled server-side by App Store Connect when the API is given the right `relationships`. For now, treat this as creating a fresh version and rely on `/push` to populate it from local state.

## 2. List and pick a build

- Call `asc_list_builds { app_id }`.
- Filter to `valid:true` builds.
- Present the user with the list (id, build_number, version, expires_at). Ask which to attach.

## 3. Attach the build

- Call `asc_attach_build { version_id, build_id }`.

## 4. Confirm encryption compliance

- Call `store_read_listing`.
- If `listing.encryption.usesEncryption` is set, call `asc_set_encryption_compliance { build_id, uses_encryption, exemptions }`.
- If not set in `listing.json`, ask the user.

## 5. Confirm release strategy

- Read the user's preferred strategy from `$ARGUMENTS --release-strategy` if present; else default `AFTER_APPROVAL`.
- Call `asc_set_release_strategy { version_id, strategy: { type: <strategy> } }`.

## 6. Confirm review info

- Call `store_read_review`.
- Call `asc_set_review_info { review_detail_id, contact, demo, notes }` if review info isn't already current on ASC.

## 7. Dry-run

- Call `asc_submit_for_review { app_id, version_id, dry_run: true }`.
- Show the user the `would_submit` block and any remaining blockers.
- If blockers exist, exit and tell the user to resolve them.

## 8. Real submit

- Confirm with user: "Submit version <X.Y.Z> for review? This is irreversible without a re-submit."
- On confirmation, call `asc_submit_for_review { app_id, version_id, dry_run: false }`.
- Report the `submission_id` and `submitted_at` from the response.

## 9. (Optional) Poll for state

If `$ARGUMENTS` includes `--wait`:
- Every 30 seconds, call `asc_get_submission_state { version_id }`.
- Stop when state is terminal (`READY_FOR_SALE`, `REJECTED`, `PENDING_DEVELOPER_RELEASE`, `IN_REVIEW`).
- Report progress between polls.

## Related

- `/app-store-toolkit:reviews` — once the app goes live, monitor and respond to customer reviews
- See also: docs/workflows/shipping-a-release.md
