import { z } from "zod";
import taxonomyJson from "./privacy-taxonomy.json" with { type: "json" };

interface TaxonomyJson {
  dataTypes: { category: string; fields: string[] }[];
  purposes: string[];
}

const taxonomy = taxonomyJson as TaxonomyJson;

/** Flat list of every data field across all categories */
export const ALL_DATA_FIELDS: readonly string[] = taxonomy.dataTypes.flatMap(
  (c) => c.fields
);

/** Flat list of every purpose Apple recognizes */
export const ALL_PURPOSES: readonly string[] = taxonomy.purposes;

/** Map data field → its parent category (for grouping in UI/diff) */
export const DATA_FIELD_TO_CATEGORY: Readonly<Record<string, string>> =
  Object.fromEntries(
    taxonomy.dataTypes.flatMap((c) => c.fields.map((f) => [f, c.category]))
  );

/** zod schemas — derived from JSON so taxonomy edits flow through automatically */
export const DataFieldSchema = z.enum(ALL_DATA_FIELDS as [string, ...string[]]);
export const PurposeSchema = z.enum(ALL_PURPOSES as [string, ...string[]]);

export type DataField = z.infer<typeof DataFieldSchema>;
export type Purpose = z.infer<typeof PurposeSchema>;

/** Runtime predicate for code that doesn't want to throw */
export function isValidDataField(field: string): field is DataField {
  return ALL_DATA_FIELDS.includes(field);
}

export function isValidPurpose(purpose: string): purpose is Purpose {
  return ALL_PURPOSES.includes(purpose);
}
