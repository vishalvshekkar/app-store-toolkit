import { describe, it, expect } from "vitest";
import {
  ALL_DATA_FIELDS,
  ALL_PURPOSES,
  DataFieldSchema,
  PurposeSchema,
  isValidDataField,
} from "../privacy-taxonomy.js";

describe("privacy taxonomy", () => {
  it("exports a non-empty list of data fields", () => {
    expect(ALL_DATA_FIELDS.length).toBeGreaterThan(20);
    expect(ALL_DATA_FIELDS).toContain("PRECISE_LOCATION");
    expect(ALL_DATA_FIELDS).toContain("CRASH_DATA");
  });

  it("exports the purpose enum from Apple", () => {
    expect(ALL_PURPOSES).toContain("ANALYTICS");
    expect(ALL_PURPOSES).toContain("APP_FUNCTIONALITY");
  });

  it("DataFieldSchema accepts known values and rejects unknown", () => {
    expect(() => DataFieldSchema.parse("PRECISE_LOCATION")).not.toThrow();
    expect(() => DataFieldSchema.parse("MADE_UP_FIELD")).toThrow();
  });

  it("PurposeSchema accepts known purposes and rejects unknown", () => {
    expect(() => PurposeSchema.parse("ANALYTICS")).not.toThrow();
    expect(() => PurposeSchema.parse("MARKETING_UNCLASSIFIED")).toThrow();
  });

  it("isValidDataField is a runtime predicate", () => {
    expect(isValidDataField("EMAIL_ADDRESS")).toBe(true);
    expect(isValidDataField("MADE_UP_FIELD")).toBe(false);
  });
});
