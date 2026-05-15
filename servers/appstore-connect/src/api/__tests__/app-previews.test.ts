import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";
import { reserveAppPreview, commitAppPreview, listAppPreviews, deleteAppPreview } from "../app-previews.js";

beforeEach(() => vi.clearAllMocks());

describe("reserveAppPreview", () => {
  it("POSTs /v1/appPreviews with fileSize, fileName, mimeType, and set relationship", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "pv_1", attributes: { fileName: "tour.mp4", uploadOperations: [] } },
    });
    const result = await reserveAppPreview({
      setId: "pset_1",
      fileName: "tour.mp4",
      fileSize: 4_000_000,
      mimeType: "video/mp4",
    });
    expect(ascRequest).toHaveBeenCalledWith("/v1/appPreviews", {
      method: "POST",
      body: {
        data: {
          type: "appPreviews",
          attributes: {
            fileName: "tour.mp4",
            fileSize: 4_000_000,
            mimeType: "video/mp4",
          },
          relationships: {
            appPreviewSet: { data: { type: "appPreviewSets", id: "pset_1" } },
          },
        },
      },
    });
    expect(result.id).toBe("pv_1");
  });
});

describe("commitAppPreview", () => {
  it("PATCHes with uploaded=true, sourceFileChecksum, and optional previewFrameTimeCode", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "pv_1", attributes: {} } });
    await commitAppPreview("pv_1", "md5_value", "00:00:02.500");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appPreviews/pv_1", {
      method: "PATCH",
      body: {
        data: {
          type: "appPreviews",
          id: "pv_1",
          attributes: {
            uploaded: true,
            sourceFileChecksum: "md5_value",
            previewFrameTimeCode: "00:00:02.500",
          },
        },
      },
    });
  });

  it("omits previewFrameTimeCode when not provided", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "pv_1", attributes: {} } });
    await commitAppPreview("pv_1", "md5_value");
    const call = (ascRequest as any).mock.calls[0][1];
    expect(call.body.data.attributes).not.toHaveProperty("previewFrameTimeCode");
  });
});

describe("listAppPreviews", () => {
  it("GETs /v1/appPreviewSets/{id}/appPreviews", async () => {
    (ascRequest as any).mockResolvedValue({
      data: [
        { id: "pv_1", attributes: { fileName: "tour.mp4", sourceFileChecksum: "md5", previewFrameTimeCode: "00:00:02.500" } },
      ],
    });
    const items = await listAppPreviews("pset_1");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appPreviewSets/pset_1/appPreviews");
    expect(items[0].fileName).toBe("tour.mp4");
  });
});

describe("deleteAppPreview", () => {
  it("DELETEs /v1/appPreviews/{id}", async () => {
    (ascRequest as any).mockResolvedValue({ data: [] });
    await deleteAppPreview("pv_1");
    expect(ascRequest).toHaveBeenCalledWith("/v1/appPreviews/pv_1", { method: "DELETE" });
  });
});
