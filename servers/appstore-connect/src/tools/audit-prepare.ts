import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getAppstoreDir } from "../store/config.js";

export interface CrossSurfaceCopy {
  description: string;
  keywords: string;
  promotional_text: string;
  whats_new: string;
}

export interface CrossSurfaceScreenshot {
  path: string;
  device: string;
  position: number;
}

export interface CrossSurfacePrepared {
  prompt: string;
  screenshots: CrossSurfaceScreenshot[];
  copy: CrossSurfaceCopy;
}

async function readFieldLatest(path: string): Promise<string> {
  if (!existsSync(path)) return "";
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as { latest?: number; iterations?: Array<{ id: number; content: string }> };
  const latestId = parsed.latest;
  const iter = parsed.iterations?.find((i) => i.id === latestId);
  return iter?.content ?? "";
}

export async function prepareCrossSurface(
  locale: string,
  platform: string
): Promise<CrossSurfacePrepared> {
  const metaDir = join(getAppstoreDir(), "metadata", locale, platform);
  const description = await readFieldLatest(join(metaDir, "description.json"));
  const keywords = await readFieldLatest(join(metaDir, "keywords.json"));
  const promotional_text = await readFieldLatest(join(metaDir, "promotional_text.json"));

  // What's-new is per-version; pick the latest version file if present
  let whats_new = "";
  const versionsDir = join(metaDir, "release_notes");
  if (existsSync(versionsDir)) {
    const versionFiles = (await readdir(versionsDir)).filter((f) => f.endsWith(".json")).sort();
    if (versionFiles.length > 0) {
      whats_new = await readFieldLatest(join(versionsDir, versionFiles[versionFiles.length - 1]));
    }
  }

  const screenshots: CrossSurfaceScreenshot[] = [];
  const assetsRoot = join(getAppstoreDir(), "assets", platform, locale);
  if (existsSync(assetsRoot)) {
    for (const device of (await readdir(assetsRoot)).sort()) {
      const folder = join(assetsRoot, device, "screenshots");
      if (!existsSync(folder)) continue;
      const files = (await readdir(folder)).filter((f) => f.endsWith(".png")).sort();
      files.forEach((file, idx) => {
        screenshots.push({ path: join(folder, file), device, position: idx + 1 });
      });
    }
  }

  const prompt = `You are checking cross-surface consistency between an iOS app's localized App Store copy and its screenshots, for locale ${locale} on ${platform}.

LOCALIZED COPY:
- Description: ${description}
- Keywords: ${keywords}
- Promotional text: ${promotional_text}
- What's new: ${whats_new}

SCREENSHOTS:
${screenshots.map((s, i) => `  ${i + 1}. ${s.device} position ${s.position}: <image attached separately>`).join("\n")}

For each screenshot, extract the on-screen text and identify what feature/claim it shows. Then compare against the copy.

FLAG:
- Contradictions: copy says one thing, screenshot shows another (e.g., "7-day trial" in copy, "30-day trial" on screen).
- Missing promises: a claim in the copy is not visually demonstrated by any screenshot.
- Stale screen text: a screen shows a feature/wording not mentioned in copy and likely should be.

Return ONLY a JSON array of findings, no prose. Each finding:
{
  "type": "contradiction" | "missing_promise" | "stale_screen_text",
  "screenshot": "<device>/<file>" or null,
  "screen_text_extracted": "<text>" or null,
  "copy_field": "description" | "keywords" | "promotional_text" | "whats_new" | null,
  "copy_says": "<excerpt>" or null,
  "severity": "blocker" | "quality",
  "fix": "<one sentence suggestion>"
}

If there are no findings, return [].`;

  return {
    prompt,
    screenshots,
    copy: { description, keywords, promotional_text, whats_new },
  };
}
