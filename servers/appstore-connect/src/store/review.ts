import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import type { ReviewInfo } from "./types.js";

const REVIEW_FILE = "review.json";

const ReviewInfoSchema = z.object({
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  demo: z
    .object({
      required: z.boolean(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (val.required && (!val.username || !val.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "demo.required is true but username/password are missing",
        });
      }
    }),
  notes: z.string(),
});

function getReviewPath(): string {
  return join(getAppstoreDir(), REVIEW_FILE);
}

export async function readReview(): Promise<ReviewInfo | null> {
  const path = getReviewPath();
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as ReviewInfo;
}

export async function writeReview(cfg: ReviewInfo): Promise<void> {
  ReviewInfoSchema.parse(cfg);
  await ensureAppstoreDir();
  await writeFile(getReviewPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

export function defaultReviewInfo(): ReviewInfo {
  return {
    contact: { firstName: "", lastName: "", email: "", phone: "" },
    demo: { required: false },
    notes: "",
  };
}
