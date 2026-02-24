import type { MetadataField, ValidationResult } from "../store/types.js";

/** Character limits for App Store Connect metadata fields */
export const CHAR_LIMITS: Record<MetadataField, number> = {
  name: 30,
  subtitle: 30,
  keywords: 100,
  promotional_text: 170,
  description: 4000,
  release_notes: 4000,
  iap_display_name: 30,
  iap_description: 45,
};

/** Validate a single field's content against its character limit */
export function validateField(
  field: MetadataField,
  content: string,
  locale: string,
  platform?: string
): ValidationResult {
  const limit = CHAR_LIMITS[field];
  // Use string length (Unicode-aware character count)
  const length = content.length;

  return {
    field,
    locale,
    platform,
    content,
    length,
    limit,
    valid: length <= limit,
  };
}

/** Get the character limit for a field */
export function getLimit(field: MetadataField): number {
  return CHAR_LIMITS[field];
}

/** Format validation results as a readable summary */
export function formatValidationResults(results: ValidationResult[]): string {
  if (results.length === 0) return "No fields to validate.";

  const lines: string[] = [];
  const failures = results.filter((r) => !r.valid);
  const passes = results.filter((r) => r.valid);

  if (failures.length === 0) {
    lines.push(`All ${results.length} fields pass validation.`);
  } else {
    lines.push(`${failures.length} of ${results.length} fields exceed limits:\n`);
    for (const f of failures) {
      const loc = f.platform ? `${f.locale}/${f.platform}` : f.locale;
      lines.push(
        `  FAIL: ${f.field} (${loc}): ${f.length}/${f.limit} chars (+${f.length - f.limit} over)`
      );
    }
  }

  if (passes.length > 0 && failures.length > 0) {
    lines.push(`\n${passes.length} fields pass.`);
  }

  return lines.join("\n");
}
