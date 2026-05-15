import { describe, it, expect } from "vitest";
import { loadRules, matchAll } from "../review-phrase-rules.js";

describe("review-phrase-rules", () => {
  it("loadRules returns at least the seed rules", () => {
    const rules = loadRules();
    expect(rules.length).toBeGreaterThanOrEqual(3);
    expect(rules.every((r) => typeof r.pattern === "string")).toBe(true);
  });

  it("each rule's pattern compiles to a valid RegExp", () => {
    for (const rule of loadRules()) {
      expect(() => new RegExp(rule.pattern, "i")).not.toThrow();
    }
  });

  it("matchAll finds the diagnose rule in medical-sounding text", () => {
    const hits = matchAll("Helps doctors diagnose conditions faster.");
    expect(hits.some((h) => h.rule.pattern.includes("diagnose"))).toBe(true);
  });

  it("matchAll respects word boundaries — does not match 'undiagnosed' for the diagnose rule", () => {
    const hits = matchAll("Many cases remain undiagnosed.");
    const matched = hits.find((h) => h.rule.pattern.includes("diagnose"));
    expect(matched).toBeUndefined();
  });

  it("snapshot of seed rules", () => {
    expect(loadRules()).toMatchInlineSnapshot(`
      [
        {
          "ignore_inside": [
            "quotedTestimonial",
          ],
          "pattern": "\\b(diagnose|diagnosis)\\b",
          "reason": "Medical claims trigger App Review escalation. Reword unless cleared with Apple.",
          "severity": "blocker",
        },
        {
          "pattern": "\\bguarantee(s|d)?\\b",
          "reason": "Unconditional guarantees attract reviewer attention.",
          "severity": "quality",
        },
        {
          "pattern": "\\b(doctor[- ]ready|FDA[- ]approved)\\b",
          "reason": "Regulatory claims need substantiation.",
          "severity": "blocker",
        },
      ]
    `);
  });
});
