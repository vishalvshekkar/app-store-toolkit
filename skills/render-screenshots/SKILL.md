---
name: app-store-toolkit:render-screenshots
description: Render screenshots from .appstore/templates/ HTML using the bundled Puppeteer renderer (installs Chromium ~280 MB on first call)
arguments:
  - name: locale
    description: "Specific locale to render (renders all locales if omitted)"
    required: false
  - name: device
    description: "Specific device to render (renders all configured devices if omitted)"
    required: false
user_invocable: true
---

# /app-store-toolkit:render-screenshots

Render template-based screenshots using the bundled Puppeteer renderer.

## Steps

### 1. Verify templates exist

Check `.appstore/templates/` for `screenshot-{device}.html` files. If none, tell the user to run `/app-store-toolkit:setup` and accept the starter templates, or to add their own.

### 2. Verify assets.json has entries

For each locale × device in scope, read `.appstore/metadata/{locale}/{platform}/assets.json`. If `screenshots[{device}]` is empty or missing, skip that combination and warn.

### 3. Render

For each locale × device with entries and a template:

- Call `assets_render_template({ locale, platform: "ios", device })`.
- The first call triggers a Chromium download (~280 MB). Print a one-time notice telling the user this is happening.
- The tool writes PNGs to `.appstore/assets/ios/{locale}/{device}/screenshots/`.

### 4. Suggest next steps

```
Rendered 36 screenshots across 9 locales × 4 devices.
Run /app-store-toolkit:validate to confirm dimensions, then /app-store-toolkit:push --assets.
```

## Suggested next

- `/app-store-toolkit:validate` — confirm rendered screenshots meet Apple's required dimensions
- `/app-store-toolkit:push` — upload the validated screenshots to App Store Connect
- See also: docs/workflows/assets-pipeline.md
