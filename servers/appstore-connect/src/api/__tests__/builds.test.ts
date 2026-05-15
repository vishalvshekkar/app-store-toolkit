import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";
import { listBuilds, attachBuildToVersion } from "../builds.js";

beforeEach(() => vi.clearAllMocks());

describe("listBuilds", () => {
  it("GETs /v1/builds with filter[app] and returns flattened entries", async () => {
    (ascRequest as any).mockResolvedValue({
      data: [
        {
          id: "b_1",
          attributes: {
            version: "1",
            buildVersion: "1.0",
            processingState: "VALID",
            expirationDate: "2026-08-15T00:00:00Z",
          },
        },
        {
          id: "b_2",
          attributes: {
            version: "2",
            buildVersion: "1.0",
            processingState: "PROCESSING",
            expirationDate: null,
          },
        },
      ],
    });

    const builds = await listBuilds("app_1");

    expect(ascRequest).toHaveBeenCalledWith(
      "/v1/builds",
      expect.objectContaining({
        params: expect.objectContaining({ "filter[app]": "app_1" }),
      })
    );
    expect(builds).toHaveLength(2);
    expect(builds[0]).toEqual({
      id: "b_1",
      build_number: "1",
      version: "1.0",
      processing_state: "VALID",
      valid: true,
      expires_at: "2026-08-15T00:00:00Z",
    });
    expect(builds[1].valid).toBe(false);
  });
});

describe("attachBuildToVersion", () => {
  it("PATCHes the version's build relationship", async () => {
    (ascRequest as any).mockResolvedValue({ data: null });
    await attachBuildToVersion("v_1", "b_1");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appStoreVersions/v_1/relationships/build", {
      method: "PATCH",
      body: {
        data: { type: "builds", id: "b_1" },
      },
    });
  });
});
