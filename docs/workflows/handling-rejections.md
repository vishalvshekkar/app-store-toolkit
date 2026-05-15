# Handling App Review Rejections

Apple rejects approximately 30–40% of first-time submissions (industry estimate). Common rejection categories include missing metadata, screenshots that mismatch the app's behavior, privacy declarations that don't align with actual data collection, copy with risky phrases (medical, financial, regulatory claims), App Review issues (couldn't log in with demo credentials), wrong category assignment, or broken support URLs.

The toolkit's `/app-store-toolkit:audit` command—especially its vision-driven cross-surface phase—catches many of these problems *before* submission. But Apple's review team may still reject for reasons only they can see or enforce.

This document walks you through the rejection workflow: understanding what Apple said, making the fix, and resubmitting safely.

---

## 1. When Apple Rejects You

You'll receive an **email notification** from Apple with:

1. **A rejection reason** — Cite specific App Store Review Guideline numbers (e.g., "Guideline 5.1.1 — Legal") and human-readable explanation.
2. **Optional screenshots or screen recordings** — Apple's review team may attach a screenshot showing the problematic behavior or the exact text they saw.
3. **A rejection code** — Guideline number for quick categorization.
4. **A free-form explanation** — More context about what they observed.

Your submission state in App Store Connect becomes `REJECTED`. The build remains attached; you can fix and resubmit without uploading a new build (unless the issue is in code).

---

## 2. Step 1: Read the Rejection Carefully

**Do this before making any changes:**

1. **Google the Guideline number.** Search "App Store Review Guidelines 5.1.1" (or whichever number Apple cited) to read Apple's official text. Guidelines change; the exact phrasing matters.
2. **Identify the specific field or behavior Apple cited.**
   - Does it mention your app name, description, keywords, promo text, screenshot, or in-app behavior?
   - Did they see a specific word or claim in your copy?
   - Did they say the screenshot doesn't match the app's actual behavior?
3. **Determine the issue type:**
   - **Copy issue** — Your description, promo text, or keywords contain a claim or phrase Apple disapproves.
   - **Asset issue** — A screenshot shows something misleading or prohibited.
   - **Metadata issue** — Your category, age rating, or privacy responses don't align with the app.
   - **App behavior issue** — The app crashes, can't log in with demo credentials, or behaves unexpectedly.

---

## 3. Step 2: Identify Implicated `.appstore/` Files

Use this table to find which local files correspond to Apple's rejection category:

| Rejection Category | Implicated Files | Toolkit Tools |
|---|---|---|
| Description claim too aggressive or unsubstantiated | `.appstore/metadata/{locale}/description.json` | `/app-store-toolkit:aso` (regenerate) or manual edit |
| Keywords are spammy or inappropriate | `.appstore/metadata/{locale}/keywords.json` | `/app-store-toolkit:aso --keywords-only` or manual |
| Promotional text violates guidelines | `.appstore/metadata/{locale}/promotional_text.json` | Manual edit (use `/app-store-toolkit:validate` after) |
| Privacy nutrition labels inaccurate | `.appstore/privacy.json` | `/app-store-toolkit:privacy` (re-analyze source code) |
| Demo credentials don't work | `.appstore/review.json` | Manual edit + test credentials yourself before resubmit |
| Support/marketing URLs are 404 | `.appstore/metadata/{locale}/support_url.json`, `marketing_url.json` | Fix on your server first, then update JSON |
| Screenshot shows wrong feature or misleading content | `.appstore/assets/{platform}/{locale}/{device}/screenshots/` | Replace PNG files, re-render if using templates |
| Wrong app category | `.appstore/listing.json` (categories) | Manual edit via `/app-store-toolkit:push` |
| Age rating incorrect | `.appstore/listing.json` (ageRating.answers) | Re-answer questionnaire, manual edit |
| Medical/regulatory claims in copy | `metadata/{locale}/*.json` (all copy fields) | `/app-store-toolkit:audit` Phase 6 can flag these; regenerate with `/aso` |
| App crashes or login fails | Source code | Xcode + new TestFlight build required |

---

## 4. Step 3: Make the Fix in `.appstore/`

### For copy (description, keywords, promo text, release notes)

**Option A: Regenerate with the ASO tool**

If Apple rejected your description as "too aggressive" or "misleading":

```bash
/app-store-toolkit:aso --regenerate description --locale en-US
```

The skill will ask for context ("What is your app really for?") and regenerate copy that's more conservative and accurate. Commit the change.

**Option B: Manual edit**

If you know the exact phrase to remove or change:

1. Open `.appstore/metadata/{locale}/description.json` in your editor.
2. Edit the `content` field to remove the problematic claim.
3. Run `/app-store-toolkit:validate` to confirm you're still within character limits.
4. Commit: `git add .appstore/metadata && git commit -m "Fix: remove aggressive claim from description"`

### For privacy (`privacy.json`)

If Apple says your privacy responses don't match what the app actually does:

```bash
/app-store-toolkit:privacy --re-analyze
```

The skill will scan your source code again and regenerate the privacy JSON, then show you the diff. Review and confirm.

### For demo credentials or support URLs (`.appstore/review.json`)

1. **For credentials:** Test them yourself before resubmit. Log into your app with the username/password you've listed in `review.json`.
   - If they don't work, update them to a working account (or disable the "demo required" field if your app doesn't need one).
   - If you've deleted the old demo account, create a new one specifically for App Review.

2. **For support URLs:** Verify the URL is live and returns a 200 status.
   ```bash
   curl -I https://yourapp.com/support
   ```
   If it's 404, fix it on your server first, then update `.appstore/review.json`.

### For screenshots or assets

If Apple says a screenshot is misleading (e.g., "Screenshot shows a free trial but your copy doesn't mention it"):

1. Either **replace the PNG** in `.appstore/assets/{platform}/{locale}/{device}/screenshots/` with a corrected version, OR
2. **Update your copy** to match what the screenshot shows.

If you're using the screenshot-rendering tool, regenerate the templates with corrected copy and re-render:
```bash
/app-store-toolkit:render-screenshots
```

Commit the asset changes separately from copy changes so the diff is clear.

### For categories or age rating (`.appstore/listing.json`)

Edit `listing.json` directly:

```json
{
  "categories": {
    "primary": "PRODUCTIVITY",
    "secondary": "UTILITIES"
  },
  "ageRating": {
    "answers": [
      { "questionId": "VIOLENCE", "level": "NONE" },
      ...
    ]
  }
}
```

Then:
```bash
/app-store-toolkit:validate
```

---

## 5. Step 4: Run the Audit

After fixing the issue, run a fresh audit to catch any side effects:

```bash
/app-store-toolkit:audit
```

Review the audit report. If it flags new blockers:
- Fix those too before resubmitting.
- The audit's **cross-surface phase** (Phase 7) runs vision checks; if Apple said your screenshot doesn't match your copy, the audit will flag it.
- The **phrase-risk phase** (Phase 6) flags medical claims, guarantees, and other regulatory red flags.

If the audit passes, commit your changes:
```bash
git add .appstore/
git commit -m "Fix rejection: [brief description of the issue and the fix]"
```

---

## 6. Step 5: Optionally Reply to Apple (via Web UI)

In the **App Store Connect Resolution Center**, you can optionally post a reply to Apple. Suggestions:

- **Be specific.** Mention the exact field you fixed (e.g., "Updated promotional text to remove the phrase 'medically approved'").
- **Link to evidence.** If helpful, describe what you changed: "Updated screenshot to show the actual login flow with a free trial offer clearly visible."
- **Keep it short.** Apple reviewers process hundreds of apps. A 2–3 sentence reply is better than a long defense.
- **Don't be defensive.** If you disagree, explain your case calmly. If you agree the claim was wrong, just say you've fixed it.

Example reply:

> "Thank you for the feedback. We've updated the description to remove the phrase 'clinically proven' and now accurately state that our app helps users track their wellness data. The copy has been softened to comply with Guideline 5.1.1."

**Note:** The toolkit does not yet have a skill to post replies directly; you'll do this in the App Store Connect web UI. A future feature may automate this.

---

## 7. Step 6: Resubmit

Two scenarios:

### A. Same Build, Fixed Metadata/Assets/Copy

Your build is still valid and attached. You don't need a new build. Just push the fixed metadata and resubmit:

```bash
/app-store-toolkit:push --force
/app-store-toolkit:audit
/app-store-toolkit:submit
```

**`/app-store-toolkit:submit`** will re-attach the same build and submit. The app will go back into review queue.

### B. Code Change Required

If the rejection was about app behavior (crash, login failure, broken feature), you need a new build:

1. **Make code changes in Xcode.**
2. **Archive and upload to TestFlight** (Xcode organizer or Xcode Cloud).
3. **Wait for the build to process** (~5–15 minutes). When it reaches `VALID` state in TestFlight, it's ready to attach.
4. **Then run submit:**
   ```bash
   /app-store-toolkit:submit
   ```
   The skill will list available builds and let you pick the new one.

---

## 8. Avoiding the Next Rejection

The toolkit's `/app-store-toolkit:audit` command runs seven phases. Several directly prevent the most common rejections:

### Phase 6: Phrase-Risk Scanning

Reads your copy (description, keywords, promo text, release notes) and scans for phrases that trigger reviewer scrutiny:

- **Medical:** `diagnose`, `cure`, `prevent`, `treat`, `disease`, etc.
- **Guarantee:** `guaranteed`, `100% effective`, `money-back guarantee`
- **Regulatory:** `FDA approved`, `clinically tested`, `prescription`
- **Financial:** `guaranteed returns`, `investment`, `trading`

If the audit finds a risky phrase, it tells you which field and which phrase, and suggests toning it down. Fix before submission.

### Phase 7: Cross-Surface Vision Check

Reads your promotional copy and screenshots side-by-side using Claude's vision. Flags:

- **Promises not visible in screenshots** — "Free trial for 7 days" in promo text, but no paywall screen visible in the screenshots.
- **Screenshot text doesn't match copy** — Screenshot shows "Login with Google" but description says "Email-only."
- **Misleading assets** — Screenshot shows a feature that doesn't exist.

Run `/audit` before every submission to catch these. Then fix the copy or screenshots.

### Character Limits (Phase 2)

`/audit` flags fields that exceed Apple's character limits. If a field is too long, Apple silently truncates it—which looks unprofessional. The limits are strict:

| Field | Limit |
|---|---|
| App Name | 30 |
| Subtitle | 30 |
| Keywords | 100 |
| Promotional Text | 170 |
| Description | 4000 |
| What's New | 4000 |

Run `/app-store-toolkit:validate` after any edit to ensure you're under the limit.

---

## 9. Common Rejection Patterns and Prevention

This table lists the most common rejection patterns and what the toolkit can do to prevent them:

| Pattern | Root Cause | Prevention | Toolkit Signal |
|---|---|---|---|
| "Demo credentials don't work" | Stale or incorrect credentials in `review.json` | Test the username/password yourself before submission | `/audit` Phase 3 checks the field is populated, not that it works. Manual test required. |
| "Screenshot shows feature not in app" | Outdated or wrong screenshot asset | Run `/audit` Phase 7 (cross-surface vision check) before submit | Vision check flags screenshot text that contradicts copy |
| "Privacy responses inaccurate" | Privacy.json doesn't match actual data collection | Run `/privacy` to re-analyze source code | Privacy diff visible in git; `/audit` Phase 3 checks all answers are set |
| "Similar to existing app / not distinctive" | Copy and screenshots are generic | Run `/app-store-toolkit:score` and `/app-store-toolkit:competitors` analysis | ASO score suggests improvements; competitors analysis shows differentiation gaps |
| "Guideline 5.1.1 — Medical claims" | Copy contains `diagnose`, `cure`, `treatment` | `/audit` Phase 6 scans for phrase-risk and flags | Phase 6 output includes flagged phrases; regenerate with `/aso` |
| "Support URL is 404" | URL changed or is wrong in `.appstore/` | Test support URL with curl before every submission | Manual pre-check; `/audit` Phase 3 flags empty URLs |
| "Category mismatch" | `listing.json` says GAMES but app is EDUCATION | Review category in `.appstore/listing.json` before submit | Manual review; consider running `/score` which analyzes positioning |
| "Keywords are spam" | Keywords contain irrelevant words or brand names | Use `/aso --keywords-only` to regenerate | `/audit` Phase 6 may flag keyword quality; `/score` provides ASO feedback |

---

## 10. The Audit History Is Your Friend

Every audit run writes one entry to `.appstore/history/audits.jsonl`. After a rejection:

1. **Compare your last pre-submission audit to Apple's feedback:**
   ```bash
   tail -1 .appstore/history/audits.jsonl | jq .
   ```
   This shows the latest audit findings. Did the audit catch the issue Apple mentioned?

2. **If Apple found something the audit missed:** File an issue or PR. The toolkit's phrase-rules or vision logic may need updating.

3. **Use git history to correlate rejection with submission:**
   ```bash
   git log --oneline .appstore/history/
   ```
   Each submission appends to `history/submissions.jsonl`. You can match the submission ID from Apple's email to your local record.

For a deep dive, see [`docs/concepts/history-and-audit.md`](../concepts/history-and-audit.md).

---

## 11. Structured Resubmission Workflow

To recap, here's a repeatable workflow for handling rejections:

1. **Read** Apple's rejection email carefully. Note the guideline number and the specific field/behavior cited.
2. **Audit locally:** Run `/app-store-toolkit:audit` to see if your local checks would have caught it.
3. **Fix:** Edit `.appstore/` files or regenerate copy with `/app-store-toolkit:aso`.
4. **Validate:** Run `/app-store-toolkit:validate` to confirm no new issues.
5. **Commit:** `git add .appstore/ && git commit -m "Fix rejection: ..."`
6. **Audit again:** Run `/app-store-toolkit:audit` one more time to be sure.
7. **Reply (optional):** Post a brief reply in App Store Connect Resolution Center.
8. **Resubmit:**
   ```bash
   /app-store-toolkit:push --force
   /app-store-toolkit:submit
   ```
   Or if code changes were needed, upload a new build first.
9. **Track submission:** Watch `history/submissions.jsonl` for the submission record.

---

## 12. When to Escalate

If you believe Apple's rejection is wrong or you need clarification:

- **Use the Resolution Center reply form.** Post a clear, specific reply with a link to evidence.
- **Request clarification:** "We've updated the description. Could you clarify what specific phrase triggered the rejection?"
- **Resubmit and wait.** Sometimes a different reviewer will approve if you've made a good-faith change.

If the rejection persists across multiple submissions and you believe it's an error, you can [contact App Review Support](https://developer.apple.com/contact/app-review/) via the App Store Connect web UI. Provide your submission ID and a clear explanation.

---

## 13. Related Reading

- [`../workflows/audit-deep-dive.md`](./audit-deep-dive.md) — Detailed walkthrough of each `/audit` phase and how to interpret findings.
- [`../workflows/shipping-a-release.md`](./shipping-a-release.md) — End-to-end submission workflow from code freeze to App Review approval.
- [`../reference/commands.md`](../reference/commands.md) — Full command reference for `/audit`, `/submit`, `/ship`, `/aso`, `/privacy`, and `/validate`.
- [`../concepts/history-and-audit.md`](../concepts/history-and-audit.md) — How the toolkit logs every audit, push, and submission for audit-trail and PR review.
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — Apple's official guideline reference (linked in each rejection email).
