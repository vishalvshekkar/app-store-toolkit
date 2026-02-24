---
name: appcraft:reviews
description: View customer reviews and draft responses
arguments:
  - name: action
    description: "'list' to view reviews, 'respond' to draft a response, 'analyze' for review insights"
    required: false
  - name: sort
    description: "Sort order: newest, oldest, highest, lowest"
    required: false
  - name: limit
    description: "Number of reviews to fetch (default 20)"
    required: false
user_invocable: true
---

# /appcraft:reviews

You are managing customer reviews from App Store Connect.

## Steps

### 1. Load Configuration

Call `store_read_config` to get app_id and voice/tone settings.
If no app_id, tell the user to run `/appcraft:setup` and `/appcraft:pull` first.

### 2. Determine Action

Parse `$ARGUMENTS`:
- `list` (default): Fetch and display reviews
- `respond`: Draft a response to a specific review
- `analyze`: Provide insights across recent reviews

### For `list`:

Call `asc_get_reviews` with:
- `app_id` from config
- `sort`: Map user-friendly names → API values:
  - newest → `-createdDate`
  - oldest → `createdDate`
  - highest → `-rating`
  - lowest → `rating`
- `limit`: from args or default 20

Display reviews in a readable format:
```
Customer Reviews (20 most recent)
═══════════════════════════════════════
★★★★★  "Love this app!" — JohnD123 (US, Feb 2026)
  Best productivity app I've found. The timer feature is perfect.

★★☆☆☆  "Crashes on iPad" — iPadUser (UK, Feb 2026)
  App crashes every time I try to open settings on my iPad Pro.

★★★★☆  "Great but needs widgets" — WidgetFan (DE, Jan 2026)
  Really enjoying the app, would love to see home screen widgets.
═══════════════════════════════════════
Average: 4.2 stars | Total shown: 20
```

### For `respond`:

Ask the user which review to respond to (by ID or by selecting from the list).

Draft a response following these guidelines:
- Use the app's configured voice/tone
- Be professional and empathetic regardless of rating
- Address the specific feedback
- For bug reports: acknowledge the issue, mention it's being looked into
- For feature requests: thank them, note the suggestion
- For positive reviews: express gratitude, encourage sharing
- Keep responses concise (no character limit for responses, but shorter is better)

Show the draft and ask for approval before posting.

When approved, call `asc_post_review_response` with the review_id and response text.

### For `analyze`:

Fetch recent reviews and provide insights:
- Rating distribution breakdown
- Common themes in positive reviews (what users love)
- Common complaints or feature requests
- Sentiment trends (improving/declining)
- Actionable suggestions based on feedback patterns

```
Review Analysis (last 50 reviews)
═══════════════════════════════════════
Rating Distribution:
  ★★★★★  62% (31)
  ★★★★☆  20% (10)
  ★★★☆☆   8% (4)
  ★★☆☆☆   4% (2)
  ★☆☆☆☆   6% (3)

Top Praise:
  - Timer feature (mentioned 15x)
  - Clean design (mentioned 12x)
  - Syncs across devices (mentioned 8x)

Top Complaints:
  - iPad crashes in settings (mentioned 5x) — URGENT
  - Wants home screen widgets (mentioned 4x)
  - Dark mode text hard to read (mentioned 3x)

Recommendation: Priority fix the iPad settings crash,
then consider adding widgets for next release.
═══════════════════════════════════════
```

### 3. Suggest Next Steps

- After list: "Say 'respond to [review]' to draft a response"
- After respond: "Response posted to App Store Connect"
- After analyze: "Use these insights when running `/appcraft:aso` or `/appcraft:changelog`"
