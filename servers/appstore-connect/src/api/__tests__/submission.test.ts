import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";
import { submitForReview, getSubmissionState } from "../submission.js";

beforeEach(() => vi.clearAllMocks());

describe("submitForReview", () => {
  it("POSTs /v1/appStoreVersionSubmissions with the version relationship", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "sub_xyz", attributes: { submittedDate: "2026-05-15T18:43:00Z" } },
    });
    const out = await submitForReview("v_1");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appStoreVersionSubmissions", {
      method: "POST",
      body: {
        data: {
          type: "appStoreVersionSubmissions",
          relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: "v_1" } } },
        },
      },
    });
    expect(out).toEqual({ submission_id: "sub_xyz", submitted_at: "2026-05-15T18:43:00Z" });
  });
});

describe("getSubmissionState", () => {
  it("GETs the version and returns appStoreState", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "v_1", attributes: { appStoreState: "WAITING_FOR_REVIEW" } },
    });
    const state = await getSubmissionState("v_1");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appStoreVersions/v_1", { params: { "fields[appStoreVersions]": "appStoreState" } });
    expect(state).toBe("WAITING_FOR_REVIEW");
  });
});
