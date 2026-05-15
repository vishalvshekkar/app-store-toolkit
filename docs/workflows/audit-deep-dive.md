# Audit Deep Dive: The 7-Phase Submission Readiness Check

## What `/audit` Is For

`/app-store-toolkit:audit` is a single command that runs every automated readiness check we know how to perform **before you spend hours on a submission Apple will reject**. It produces a ranked punch list of findings—BLOCKERS first (submission-blocking issues), then QUALITY recommendations (not blocking, but worth fixing)—and appends a complete JSON record to `.appstore/history/audits.jsonl` for auditability.

Running `/audit` takes seconds. It can save you days of iteration after App Review rejects your submission for something automated checks could have caught.

---

## Severity Model

The audit uses two severity levels:

### BLOCKER

**Definition:** App Store Connect will refuse to accept the submission, OR App Review will reject it.

**Impact on `/ship`:** `/ship` aborts unless the blocker is explicitly waived with `--waive <check>:<target> --reason "..."`.

**Examples:**
- Character limits exceeded (Apple silently truncates; the app in App Review's hands won't match what you submitted)
- Required fields (like description) missing entirely in a configured locale
- Asset dimensions wrong (screenshot 750×1334 instead of 1242×2688)
- Forbidden medical claims or regulatory language without a quoted testimonial context

### QUALITY

**Definition:** Not blocking submission, but worth fixing before going live.

**Impact on `/ship`:** `/ship` proceeds with QUALITY findings shown in the output. You can iterate later.

**Examples:**
- Copy tone drifts from configured voice (formal instead of playful)
- Regulatory caution words like "guarantee" (not forbidden, but flags reviewer attention)
- Cross-surface inconsistencies (keywords mention "30-day trial" but the screenshot shows "7 days")

---

## The 7 Phases

### Phase 1: Locale Parity (BLOCKER)

**What it checks:** Every configured locale has all required fields populated (no missing descriptions, keywords, etc.).

**Concrete logic:**
1. Calls `store_validate` for each locale in `config.json.locales`
2. Checks for required fields per Apple's rules:
   - Version-level fields: `keywords`, `description`, `whatsNew` (required for all platforms)
   - App-level fields: `name`, `subtitle` (required once per app)
3. For each missing field, flags it as a blocker

**Common failures:**
- You translated the app to 12 locales but only wrote copy for English and German, leaving Japanese, French, etc. with empty descriptions
- You added a new locale to `config.json` but never ran `/aso` to generate copy for it

**How to fix:**
- Run `/app-store-toolkit:aso <locale>` to generate copy for a specific locale
- Or manually edit `.appstore/metadata/<locale>/description.json` and other fields
- Then run `/audit` again to confirm the missing field is now populated

**Severity:** BLOCKER — Apple's version creation API requires all required fields to have content before a version can enter "Waiting for Review" state.

---

### Phase 2: Character Limits (BLOCKER)

**What it checks:** Every field in every locale is within Apple's published character limits.

**Concrete logic:**
1. Same `store_validate` call as Phase 1 also validates lengths
2. Reads the character limit for each field from the schema:
   - App name: 30 characters
   - Subtitle: 30 characters
   - Keywords: 100 characters
   - Promotional text: 170 characters
   - Description: 4000 characters
   - What's New: 4000 characters
3. Flags any field exceeding its limit

**Why this matters:**  
Apple silently truncates fields that exceed limits. If your description is 4050 characters, ASC accepts it but truncates to 4000—and your marketing copy in App Review's hands won't match what you intended.

**Common failures:**
- Localized German descriptions are naturally longer and exceed 4000 characters
- A hastily-written keywords field includes the full feature list instead of a comma-separated summary

**How to fix:**
- Shorten the field by editing `.appstore/metadata/<locale>/<field>.json` directly
- Or run `/app-store-toolkit:aso --regenerate <field> <locale>` to have the AI generate a shorter version (the skill will retry if the regenerated version still exceeds limits)
- Run `/audit` again to confirm the field now fits

**Severity:** BLOCKER — Apple will see truncated copy, and App Review may reject based on the truncated version not matching the app's actual behavior.

---

### Phase 3: Required-Field Presence (BLOCKER)

**What it checks:** Listing configuration, privacy responses, and App Review information are complete—no "not yet configured" sentinel values.

**Concrete logic:**
1. Calls `store_read_listing` and flags if:
   - `categories.primary` is empty or undefined
2. Calls `store_read_privacy` and flags if:
   - `collectsData` is `null` or unset (Apple requires a yes/no answer)
3. Calls `store_read_review` and flags if:
   - `contact.email` is empty or invalid
   - `contact.firstName` or `contact.lastName` is empty
   - `notes` is empty (the testing notes field)

**Why this matters:**  
These fields are required by App Store Connect's API. If any are missing, the submission will be rejected with a validation error. Better to catch it here than during phase 8 (submit).

**Common failures:**
- You configured app metadata but never ran `/app-store-toolkit:setup` to fill in categories, privacy settings, and your contact info
- You left privacy `collectsData` unset (it defaults to `null`), meaning you never answered whether your app collects data
- Your App Review testing notes are empty (just placeholders)

**How to fix:**
- Run `/app-store-toolkit:setup` again to walk through the questionnaire for listing, privacy, and review info
- Or manually edit `.appstore/listing.json`, `.appstore/privacy.json`, and `.appstore/review.json` to fill in missing values
- Run `/audit` again to confirm all required fields are present

**Severity:** BLOCKER — The ASC API will reject the submission outright.

---

### Phase 4: Asset Dimensions (BLOCKER)

**What it checks:** Every screenshot and app preview in your assets directory meets Apple's size and resolution specifications.

**Concrete logic:**
1. Calls `assets_validate_dimensions { locale }` for each locale
2. Scans `.appstore/assets/<locale>/<device_category>/` for PNG (screenshots) and MP4 (app previews)
3. For each file, validates:
   - Correct resolution (e.g., iPhone 6.7" requires 1290×2796 pt)
   - File size constraints (previews ≤ 500 MB, screenshots ≤ 10 MB)
   - Correct file type (PNG for screenshots, MP4 for previews)
4. Returns `ok: false` for any asset that doesn't match the catalog

**Apple's asset specifications:**  
Screenshots must be exact dimensions per device family:
- iPhone 6.7" (Pro Max): 1290×2796
- iPhone 6.1" (Pro/Plus): 1242×2688
- iPhone SE (5.5"): 1125×2436
- iPad (12.9" gen 5+): 2732×2048
- iPad (11"): 2560×1440

App previews: 30 seconds max, 500 MB max, 1080p+ resolution.

**Common failures:**
- You screenshot a 750×1334 (iPhone 8 era) asset and try to upload it for the 6.7" device category
- You export a preview as an MOV instead of MP4
- A screenshot is 1242×2689 (one pixel short of 1242×2688)

**How to fix:**
- Resize the screenshot in Xcode's device simulator, Figma, or a screenshot tool to the exact dimensions Apple requires
- Re-export app previews as MP4 (use FFmpeg: `ffmpeg -i input.mov -c:v libx264 output.mp4`)
- Move the asset to the correct device folder (if you had it in `iphone-6.1/` but it's actually a 6.7" screenshot, move it to `iphone-6.7/`)
- Run `/audit` again

**Severity:** BLOCKER — App Store Connect's upload API will reject the asset, and the version cannot be submitted without all assets in place.

---

### Phase 5: Voice Drift (QUALITY)

**What it checks:** Copy in every locale matches the tone and style configured in `config.json.voice`.

**Concrete logic:**
1. Reads `config.json.voice` (e.g., `{tone: "playful", style_notes: "Use emojis, conversational"}`).
2. For each locale, reads the description, promotional text, and what's-new text
3. Asks the model: "Given this voice block, does the localized copy match the tone? Return `{drift: bool, rationale: string}`."
4. If `drift: true`, flags it as a QUALITY finding

**Example prompt to the model:**

```
Voice config: {"tone": "playful", "style_notes": "Use emojis, conversational, avoid corporate jargon"}

Description (ja): "本アプリケーションは、エンタープライズ向けの包括的なソリューションを提供します。"
Promotional Text (ja): "7日間の無料体験版を提供しています。"
What's New (ja): "パフォーマンスの最適化とバグ修正が含まれています。"

Does this copy match the configured voice? Respond with {"drift": bool, "rationale": "..."}
```

If the model returns `{drift: true, rationale: "Japanese copy is very formal; voice calls for conversational and playful. No emojis used."}`, the finding is added.

**Why this matters:**  
Users download the app based on marketing copy that sounds a certain way. If the Japanese version reads formally corporate while the English version is playful and conversational, it creates a disjointed experience.

**Common failures:**
- Machine translation produces very formal, stilted Japanese that doesn't match the playful English
- You manually edited a locale's copy to be more marketing-focused, but the original voice config was technical and minimal
- A freelance translator applied their own voice instead of matching your configured tone

**How to fix:**
- Edit the copy in `.appstore/metadata/<locale>/<field>.json` to match the voice (add emojis if you're playful, simplify corporate jargon if you're minimal, etc.)
- Or run `/app-store-toolkit:aso --regenerate <field> <locale> --voice-override "emphasize tone, add emojis"` to have the AI rewrite with a stronger voice direction
- Run `/audit` again to confirm the drift is resolved

**Severity:** QUALITY — Not blocking, but users may perceive the localized version as lower quality or out of brand.

---

### Phase 6: App Review Phrase Risk (BLOCKER or QUALITY per rule)

**What it checks:** Copy scanned for medical claims, guarantees, and regulatory language that trigger App Review escalation.

**Concrete logic:**
1. Loads review phrase rules from `servers/appstore-connect/src/data/review-phrase-rules.json`
2. For each locale's copy (description, keywords, promo, what's new), regex-matches each rule
3. For each match, applies a context pass:
   - Is the matched phrase inside a clearly quoted user testimonial (e.g., `"Quote: 'I was able to diagnose my condition'"`)? If yes, downgrade the severity from blocker to quality
   - Otherwise, use the rule's declared severity (blocker or quality)

**Current rules (as of v0.4.0):**

| Pattern | Severity | Reason | Context-Downgradeable? |
|---------|----------|--------|------------------------|
| `\b(diagnose\|diagnosis)\b` | BLOCKER | Medical claims trigger escalation | Yes (if quoted) |
| `\bguarantee(s\|d)?\b` | QUALITY | Regulatory caution flag | No |
| `\b(doctor[- ]ready\|FDA[- ]approved)\b` | BLOCKER | Regulatory claims need substantiation | Yes (if quoted) |

**Why this matters:**  
App Review has guidelines against unsubstantiated medical claims (e.g., "This app can diagnose cancer"). If your copy trips the phrase risk, Apple routes it to a specialized medical reviewer, which adds 1-2 weeks to review time. Better to reword proactively.

**Common failures:**
- Health/fitness app copy says: "Use this app to diagnose your sleep disorders."
- Medical app copy says: "Guaranteed to improve your cholesterol levels."
- Regulatory compliance app claims: "FDA-approved for HIPAA compliance."
- Testimonial from a real user: `"Dr. Johnson says: 'I was able to diagnose three cases using this app.'"`

**How to fix:**
- **If it's a blocker:** Reword the phrase. Instead of "diagnose," use "assess," "identify," or "evaluate." Instead of "guaranteed," use "helps," "supports," or "enables."
- **If it's quoted from a user testimonial:** The context pass should downgrade it to quality, but you can also clarify the quoting (add explicit quote marks, attribute to the user by name, etc.) to make the context clear
- **For medical/regulatory claims:** Have Apple review your app and agree on approved language before submitting (contact apple-mcp-tools@example.com or your App Review contact)
- Run `/audit` again to confirm the phrase is removed or downgraded

**Severity:** BLOCKER for medical/regulatory claims (unless in a testimonial context); QUALITY for guarantees.

**Adding new rules:**  
To add a phrase rule (e.g., for a new regulatory term):

1. Edit `servers/appstore-connect/src/data/review-phrase-rules.json`:
   ```jsonc
   {
     "pattern": "\\b(term|another-term)\\b",
     "severity": "blocker",
     "reason": "Reason why this term triggers review escalation",
     "ignore_inside": ["quotedTestimonial"]  // optional; downgrades if quoted
   }
   ```
2. Rebuild the MCP server: `cd servers/appstore-connect && npm run build`
3. The next `/audit` run will use the new rule

---

### Phase 7: Cross-Surface Consistency, Vision-Driven (QUALITY)

**What it checks:** Marketing copy aligns with what the app actually looks like in screenshots (the headline novel check).

**The architecture:**  
This phase is architecturally unique. The MCP tool (`audit_prepare_cross_surface`) builds a deterministic prompt template; the skill loads images via Claude Code's native image read and asks the host model. No server-side vision API, no extra API key.

**Concrete logic:**

1. **Prepare phase:** Calls `audit_prepare_cross_surface { locale, platform: "ios" }`
   - Returns `{ prompt: string, screenshots: [{path, device_category}] }`
   - The `prompt` is deterministic and captures:
     - Description (what the app does)
     - Keywords (feature list)
     - Promotional text (call to action)
     - What's new (latest feature promises)
   - Example prompt:
     ```
     You are reviewing an iOS app's marketing materials. Check for contradictions,
     missing promises, and stale screenshots.

     Marketing copy:
     Keywords: "habit tracker, daily goals, achievements"
     Description: "Track your daily habits with AI-powered insights. See your progress over 30 days."
     Promotional: "Try it free for 7 days."
     What's New: "New: Habit streaks and social sharing."

     Screenshots to review:
     1. iphone-6.7/01-onboarding.png (Onboarding)
     2. iphone-6.7/02-stats.png (Main stats view)
     3. iphone-6.7/03-sharing.png (Social features)

     For each finding, respond with JSON:
     [
       {
         "type": "contradiction|missing_promise|stale_screen_text",
         "screenshot": "filename",
         "severity": "blocker|quality",
         "copy_field": "description|keywords|promo|whatsNew",
         "copy_says": "exact quote from copy",
         "screen_text_extracted": "text visible in screenshot",
         "fix": "how to resolve"
       }
     ]
     ```

2. **Image load phase:** For each screenshot path returned, uses Claude Code's Read tool to load the PNG as an image natively

3. **Model phase:** Asks the host model with all loaded screenshots and the prepared prompt

4. **Parse phase:** Model returns a JSON array of findings; each finding becomes a row in the punch list

**Finding types and examples:**

**Contradiction** — Copy says X, but screenshot shows Y:
```jsonc
{
  "type": "contradiction",
  "screenshot": "iphone-6.7/02-stats.png",
  "screen_text_extracted": "Free 30-day trial",
  "copy_field": "promotional_text",
  "copy_says": "Try it free for 7 days",
  "severity": "quality",
  "fix": "Either update the screenshot (show 7 days instead of 30) or align the promo text."
}
```
User sees "30-day trial" on the app's first screen, but the App Store says "7 days." Confusion. Fix by changing one or the other.

**Missing promise** — Copy mentions a feature, no screenshot shows it:
```jsonc
{
  "type": "missing_promise",
  "screenshot": null,
  "copy_field": "description",
  "copy_says": "Share habits with your friends.",
  "severity": "quality",
  "screen_text_extracted": "No screenshots show social features",
  "fix": "Either add a screenshot showing the social sharing UI, or remove the mention from copy."
}
```
Your description says "social sharing," but none of your screenshots show people sharing. Reviewers or users will look for that feature and not find it.

**Stale screen text** — Screenshot has text/feature not mentioned in copy:
```jsonc
{
  "type": "stale_screen_text",
  "screenshot": "iphone-6.7/03-old-feature.png",
  "screen_text_extracted": "Sync with Fitbit",
  "copy_field": "keywords",
  "copy_says": "habit tracker, daily goals, achievements",
  "severity": "quality",
  "fix": "Update the screenshot (remove outdated Fitbit UI) or add 'Fitbit integration' to keywords."
}
```
An old screenshot shows a feature (Fitbit sync) that you removed in v1.1, but the screenshot wasn't updated. Users see it in the App Store and expect it.

**Why this matters:**  
App Review has human reviewers who look at screenshots while reading your copy. If there's a mismatch—copy promises social features but the screenshots only show individual tracking—they may:
1. Reject for false marketing ("app doesn't match description")
2. Spend extra time investigating, delaying review
3. Flag it as a quality issue in feedback

**Common failures:**
- You rewrote the description to emphasize analytics, but the old onboarding screenshots don't show graphs
- The app added a new "premium features" section, and you took screenshots of it, but forgot to mention it in keywords or description
- You localized the app to German and took German-language screenshots, but the translated description still mentions English UI labels

**How to fix:**
- **Contradiction:** Update one of: the screenshot (e.g., crop to remove the "30-day" text) or the copy (change promotional text from 7 to 30 days)
- **Missing promise:** Add a screenshot showing the promised feature, or remove the claim from copy
- **Stale screen text:** Replace the outdated screenshot with a new one, or update copy to clarify the feature was removed
- Run `/audit` again to confirm the vision findings are resolved

**Severity:** QUALITY — Not blocking, but reduces user trust and increases App Review scrutiny.

**Why vision happens in the skill layer:**  
Apple's automated checks don't run vision. Human reviewers DO, hence they reject for visual mismatches. Running vision in the skill layer using the host model lets you catch these before submission. The MCP tool (`audit_prepare_cross_surface`) is testable in TypeScript (snapshot tests lock the prompt template), and the image loading is done natively by Claude Code (no extra vision API key needed).

---

## Output: The Punch List

After all 7 phases complete, findings are grouped by severity and rendered as a markdown table:

```markdown
## Audit — v1.0.0 — 2026-05-15T18:00:00Z

### BLOCKERS (2)
| check | locale | field/file | message | fix |
|---|---|---|---|---|
| locale-parity | ja | description | missing | run /aso for ja |
| asset-dim | de-DE/iphone-6.7/02.png | dimension | 1242×2688 vs actual 1290×2796 | resize |

### QUALITY (3)
| check | locale | field | message | fix |
|---|---|---|---|---|
| voice-drift | de-DE | description | tone too formal for playful config | rephrase |
| phrase-risk | en-US | description | "diagnose" in testimonial context | (downgraded from blocker; OK to proceed) |
| cross-surface | ja | iphone-6.7/02.png | screen shows "Free 30 days", copy says "7 days" | align |
```

**Next step prompt:**
- If blockers > 0: "Resolve the blockers above, then run `/audit` again. Or waive them: `/ship --waive locale-parity:ja --reason '...'`"
- Else: "Audit clean. Run `/app-store-toolkit:ship` to proceed to submission."

---

## The Audit Log

Each `/audit` run appends one line to `.appstore/history/audits.jsonl`:

```jsonc
{
  "timestamp": "2026-05-15T18:00:00Z",
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
      "check": "asset-dim",
      "severity": "blocker",
      "locale": "de-DE",
      "file": "iphone-6.7/02.png",
      "message": "1242×2688 vs 1290×2796"
    },
    {
      "check": "voice-drift",
      "severity": "quality",
      "locale": "de-DE",
      "field": "description",
      "rationale": "Tone is very formal; configured voice is playful"
    },
    {
      "check": "phrase-risk",
      "severity": "quality",
      "locale": "en-US",
      "field": "description",
      "pattern": "diagnose",
      "context": "quoted",
      "message": "Medical term in testimonial context (downgraded from blocker)"
    },
    {
      "check": "cross-surface",
      "severity": "quality",
      "locale": "ja",
      "screenshot": "iphone-6.7/02.png",
      "type": "contradiction",
      "copy_field": "promotional_text",
      "copy_says": "Try free for 7 days",
      "screen_text": "Free 30-day trial",
      "fix": "Align screenshot or copy"
    }
  ],
  "waivers": []
}
```

**Reading the audit log:**
```bash
# Latest audit findings
tail -1 .appstore/history/audits.jsonl | jq .

# All audits for this version
cat .appstore/history/audits.jsonl | jq 'select(.version == "1.0.0")'

# Count blockers over time
cat .appstore/history/audits.jsonl | jq '.blocker_count' | paste -sd+ | bc
```

Every audit run, including intermediate ones while you're iterating, is recorded. You can use `git log -p .appstore/history/audits.jsonl` to see how your submission readiness evolved—useful for post-mortems after rejection or for understanding the review timeline.

---

## Waivers

If `/audit` finds blockers you believe are safe to override, you can waive them. Waivers are explicit: you provide a reason, which is recorded in the audit log for future review.

**Syntax:**
```
/app-store-toolkit:ship --waive <check>:<target> --reason "your reason"
```

**Examples:**

Waive a locale parity blocker (stub for legal hold):
```
/app-store-toolkit:ship --waive locale-parity:ja --reason "Japanese stub for legal hold; approved by legal team"
```

Waive a character-limit blocker (German marketing term requires extra characters):
```
/app-store-toolkit:ship --waive char-limit:de-DE/description --reason "German marketing term requires 40 extra characters; approved by product manager"
```

Waive a medical phrase blocker (app is HIPAA-registered, medical jargon approved):
```
/app-store-toolkit:ship --waive phrase-risk:en-US/description --reason "Medical jargon approved by compliance; app is HIPAA-registered and cleared with Apple legal"
```

Waive multiple blockers:
```
/app-store-toolkit:ship \
  --waive locale-parity:ja --reason "Japanese stub for legal hold" \
  --waive asset-dim:de-DE/iphone-6.7/02.png --reason "Screenshot 1242×2688; verified visually correct per QA"
```

**How waivers are matched:**
Each waiver is keyed by `{check, target}`. During the audit phase of `/ship`:
1. For every blocker found, check if there's a waiver with matching check and target
2. If found, mark the blocker as waived (include the waiver reason in the report)
3. If not found, the blocker is unwaived and `/ship` aborts

Unmatched waivers are silently ignored (no error), so you can use the same `--waive` flags across multiple `/ship` runs without breaking if the blocker no longer exists.

**Waiver recording:**
Each waiver is appended to `.appstore/history/audits.jsonl` as part of the audit entry's `waivers` array:
```jsonc
"waivers": [
  {
    "check": "locale-parity",
    "target": "ja",
    "reason": "Japanese stub for legal hold; approved by legal team",
    "waived_at": "2026-05-15T18:00:15Z"
  }
]
```

---

## Running Audit Standalone vs. As Part of `/ship`

### Standalone: `/audit`

Use when iterating on copy or validating a specific locale:
```
/app-store-toolkit:audit              # Audit all configured locales
/app-store-toolkit:audit en-US        # Audit only English
/app-store-toolkit:audit de-DE ja     # Audit multiple locales
```

Output is immediate. Findings are appended to history. No state file is created.

**Use case:** After you run `/aso` to generate copy, immediately run `/audit en-US` to catch blocker-level issues (char limits, missing fields) before pushing to ASC.

### As Phase 1 of `/ship`

The `/ship` command internally runs the full audit:
```
/app-store-toolkit:ship
```

The audit findings are recorded in the latest `audits.jsonl` entry. If blockers are found, `/ship` aborts (unless waived). The ship state is recorded in `.appstore/ship-state.json` with the audit reference.

**Use case:** Final readiness check before the entire 8-phase submission flow.

---

## Customizing Audit Behavior

### Phase 5: Voice Config (Voice Drift)

Edit `config.json`:
```jsonc
{
  "voice": {
    "tone": "playful",
    "style_notes": "Conversational, use emojis, avoid jargon",
    "target_audience": "Busy professionals (ages 25-45) with limited time"
  }
}
```

The next `/audit` run will check Phase 5 (voice drift) against this config. If copy is too formal or doesn't match the target audience, it flags it.

### Phase 6: Phrase Rules

Edit `servers/appstore-connect/src/data/review-phrase-rules.json` and add a new rule:

```jsonc
{
  "pattern": "\\b(blockchain|crypto|NFT)\\b",
  "severity": "quality",
  "reason": "Crypto/blockchain claims need careful review",
  "ignore_inside": ["quotedTestimonial"]
}
```

Rebuild the server: `cd servers/appstore-connect && npm run build`. The next `/audit` run will match the new pattern.

### Adding New Phases

To add a new audit phase (e.g., "check for broken URLs"):

1. Add a new MCP tool to `servers/appstore-connect/src/tools/` (e.g., `audit_check_urls.ts`)
2. Update the skill in `skills/audit/SKILL.md` with the new phase logic
3. The skill calls the tool, collects findings, and appends them to the punch list

For details, see `docs/contributing/adding-tools.md`.

---

## Limitations

**Phase 7 (Vision) depends on model quality:**  
Claude 4.x handles iOS screenshots well, but very small screen text in dense screenshots may be missed. If you have a critical feature with tiny UI labels, manual review is recommended.

**Phase 5 (Voice drift) is a judgment call:**  
The model decides whether copy matches the configured voice. False positives are common (e.g., flagging a formal testimonial as "tone drift" even though it's quoted). Treat as a flag for human review, not a hard rule.

**Phase 6 (Phrase risk) uses regex:**  
Regex is brittle. "Diagnose" in "co-diagnose with your doctor" might be flagged even in appropriate context. Use the context-pass (quoted testimonial detection) to downgrade, or add the phrase to a whitelist.

**Phase 4 (Asset dimensions) requires exact matches:**  
If your screenshot is 1242×2689 (one pixel short), it will be rejected. Some screen recording tools add 1-2 pixels; always verify actual dimensions in Finder or Xcode.

**The audit cannot detect:**
- Actual app crashes or runtime errors
- Broken support URLs (use a website uptime monitor separately)
- Demo-account credential breakage (test them manually)
- API behaviors that violate App Review guidelines (e.g., hidden data collection)
- Misleading imagery (e.g., a fake screenshot that doesn't match the real app)

---

## Related Documentation

- **[Shipping a Release](./shipping-a-release.md)** — How `/ship` uses `/audit` as phase 1
- **[Handling Rejections](./handling-rejections.md)** — What to do if Apple rejects your submission
- **[Concepts: History and Audit](../concepts/history-and-audit.md)** — Detailed explanation of the `audits.jsonl` stream
- **[Reference: File Schemas](../reference/file-schemas.md)** — JSON schema for `audits.jsonl` and `listing.json`
- **[Reference: Commands](../reference/commands.md)** — All `/audit` and `/ship` arguments
- **[Reference: Character Limits](../reference/character-limits.md)** — Complete field-by-field limits
- **[Contributing: Adding Tools](../contributing/adding-tools.md)** — How to add new audit phases or phrase rules
