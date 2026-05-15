---
name: app-store-toolkit:audit
description: Single-pass App Store submission readiness check — locale parity, char limits, required fields, asset dimensions, voice drift, App Review phrase risk, and vision-driven cross-surface consistency. Output is a ranked punch list plus a JSON row to .appstore/history/audits.jsonl.
arguments:
  - name: locale
    description: "Specific locale to audit (audits all configured locales if omitted)"
    required: false
user_invocable: true
---

# /app-store-toolkit:audit

You are auditing an App Store submission. The result is a punch list: BLOCKERS first (will prevent submission), then QUALITY issues (won't block but worth fixing).

## 1. Load configured locales

Call `store_read_config` for the locale list. If `$ARGUMENTS` includes a specific locale, restrict to it.

## 2. Run the seven phases

For each locale in scope, run these phases and collect findings.

### Phase 1: Locale parity (BLOCKER)
Call `store_validate { locale }`. Any missing required field becomes a finding: `{check:"locale-parity", severity:"blocker", locale, field, message:"missing", fix:"run /aso for <locale>"}`.

### Phase 2: Char limits (BLOCKER)
The same `store_validate` call also reports char-limit violations. Each becomes: `{check:"char-limit", severity:"blocker", locale, field, message:"<N> chars exceeds limit <L>", fix:"shorten <field>"}`.

### Phase 3: Required-field presence (BLOCKER)
- Call `store_read_listing`. Flag if `categories.primary` is empty.
- Call `store_read_privacy`. Flag if `collectsData` is unset.
- Call `store_read_review`. Flag if `contact.email` or `notes` is empty.

### Phase 4: Asset dimensions (BLOCKER)
Call `assets_validate_dimensions { locale }`. Each `ok:false` result becomes a finding.

### Phase 5: Voice drift (QUALITY)
For each locale, read the voice config from `store_read_config` and the description/promo/what's-new for that locale. Ask yourself (as the model): "Given the voice block `<voice>`, does this copy match? Return `{drift: bool, rationale: string}`." If `drift: true`, append `{check:"voice-drift", severity:"quality", locale, rationale, fix:"rephrase to match voice"}`.

### Phase 6: App Review phrase risk (BLOCKER or QUALITY per rule)
Match the seed patterns against each locale's copy:
- `\b(diagnose|diagnosis)\b` → blocker
- `\bguarantee(s|d)?\b` → quality
- `\b(doctor[- ]ready|FDA[- ]approved)\b` → blocker

For each hit, do a context pass: is the hit inside a clearly-quoted user testimonial? If so, downgrade to `severity:"quality"`. Otherwise use the rule's declared severity.

### Phase 7: Cross-surface consistency (QUALITY)
- Call `audit_prepare_cross_surface { locale, platform: "ios" }`. The result is `{prompt, screenshots, copy}`.
- For each screenshot in `screenshots`, use the Read tool on `screenshot.path` (Claude Code loads images natively).
- After all screenshots are read, ask yourself (as the model) with the returned `prompt`.
- Parse the model's JSON array of findings. Each finding becomes a row in the punch list, tagged with `check:"cross-surface", severity:<from finding>`.

## 3. Render the punch list

Group findings by severity (BLOCKER first, then QUALITY). Display as a markdown table.

Example output:

```
## Audit — <version> — <timestamp>

### BLOCKERS (N)
| check | locale | field/file | message | fix |
|---|---|---|---|---|
| locale-parity | ja | description | missing | run /aso for ja |
| asset-dim | de-DE | iphone-6.7/02.png | got 1242×2688 | resize |

### QUALITY (M)
| check | locale | field | message | fix |
|---|---|---|---|---|
| voice-drift | de-DE | description | tone too formal | rephrase |
| phrase-risk | en-US | description | "diagnose" | reword |
| cross-surface | ja | screenshot 02 | screen text not in copy | add to keywords |
```

## 4. Append to history/audits.jsonl

Construct the JSON record:

```jsonc
{
  "timestamp": "<ISO now>",
  "version": "<from config or version arg>",
  "blocker_count": <N>,
  "quality_count": <M>,
  "findings": [<every finding>],
  "waivers": []
}
```

Append this as one line to `.appstore/history/audits.jsonl` using a Bash command with single-line JSON.

## 5. Suggest next step

- If blockers > 0: "Resolve the blockers above, or run `/ship --waive <check>:<target> --reason '...'` to override."
- Else: "Audit clean. Run `/app-store-toolkit:ship` to push and submit."

## Suggested next

- `/app-store-toolkit:ship` — if audit is clean, run the full push-and-submit pipeline
- `/app-store-toolkit:localize` — resolve locale-parity blockers by generating missing translations
- See also: docs/workflows/audit-deep-dive.md
