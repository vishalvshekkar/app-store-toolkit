import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export interface RenderInput {
  locale: string;
  platform: string;
  device: string;
  width: number;
  height: number;
  templatePath: string;
  outputDir: string;
  entries: Array<{ file: string; headline?: string }>;
}

/** Lazy-install puppeteer if it's not already available. */
export async function ensurePuppeteer(): Promise<void> {
  try {
    await import("puppeteer");
    return;
  } catch {
    // not installed — install it now
  }
  process.stderr.write(
    "ℹ Installing Chromium (~280 MB, one-time) for the template renderer …\n"
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install", "puppeteer", "--no-save"], {
      cwd: new URL("../..", import.meta.url).pathname,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install puppeteer exited with code ${code}`));
    });
  });
}

/** Render every entry by opening the template in Puppeteer at the device's pixel size. */
export async function renderScreenshots(
  input: RenderInput
): Promise<Array<{ file: string; path: string }>> {
  await ensurePuppeteer();
  // @ts-expect-error — puppeteer is a lazy optional dep; types are not installed at build time
  const puppeteer = (await import("puppeteer")) as any;
  const browser = await puppeteer.launch();
  try {
    const template = await readFile(input.templatePath, "utf-8");
    await mkdir(input.outputDir, { recursive: true });
    const results: Array<{ file: string; path: string }> = [];
    for (const entry of input.entries) {
      const page = await browser.newPage();
      await page.setViewport({ width: input.width, height: input.height });
      const html = template
        .replace(/\{\{headline\}\}/g, entry.headline ?? "")
        .replace(/\{\{locale\}\}/g, input.locale)
        .replace(/\{\{deviceWidth\}\}/g, String(input.width))
        .replace(/\{\{deviceHeight\}\}/g, String(input.height));
      await page.setContent(html, { waitUntil: "networkidle0" });
      const outPath = join(input.outputDir, entry.file);
      await page.screenshot({ path: outPath as `${string}.png`, type: "png" });
      await page.close();
      results.push({ file: entry.file, path: outPath });
    }
    return results;
  } finally {
    await browser.close();
  }
}
