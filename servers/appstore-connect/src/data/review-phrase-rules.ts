import rulesJson from "./review-phrase-rules.json" with { type: "json" };

export type Severity = "blocker" | "quality";

export interface PhraseRule {
  pattern: string;
  severity: Severity;
  reason: string;
  ignore_inside?: string[];
}

interface RulesJson {
  rules: PhraseRule[];
}

const rules = (rulesJson as RulesJson).rules;

/** Read all rules from the bundled data file. */
export function loadRules(): PhraseRule[] {
  return rules.slice();
}

export interface PhraseHit {
  rule: PhraseRule;
  match: string;
  index: number;
}

/** Run every rule against `text` and return all matches. Uses String.matchAll for iteration. */
export function matchAll(text: string): PhraseHit[] {
  const hits: PhraseHit[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.pattern, "gi");
    for (const m of text.matchAll(re)) {
      hits.push({ rule, match: m[0], index: m.index ?? 0 });
    }
  }
  return hits;
}
