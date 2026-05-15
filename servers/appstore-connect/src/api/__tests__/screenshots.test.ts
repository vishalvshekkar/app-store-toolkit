import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";
import { reserveScreenshot, commitScreenshot, putScreenshotBytes } from "../screenshots.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reserveScreenshot", () => {
  it("POSTs to /v1/appScreenshots with fileSize, fileName, and the set relationship", async () => {
    (ascRequest as any).mockResolvedValue({
      data: {
        id: "ss_1",
        attributes: {
          fileName: "01.png",
          uploadOperations: [
            {
              method: "PUT",
              url: "https://signed-upload.example/01",
              length: 1234,
              offset: 0,
              requestHeaders: [{ name: "Content-Type", value: "image/png" }],
            },
          ],
        },
      },
    });

    const result = await reserveScreenshot({
      setId: "set_1",
      fileName: "01.png",
      fileSize: 1234,
    });

    expect(ascRequest).toHaveBeenCalledWith("/v1/appScreenshots", {
      method: "POST",
      body: {
        data: {
          type: "appScreenshots",
          attributes: { fileName: "01.png", fileSize: 1234 },
          relationships: {
            appScreenshotSet: { data: { type: "appScreenshotSets", id: "set_1" } },
          },
        },
      },
    });
    expect(result.id).toBe("ss_1");
    expect(result.uploadOperations[0].url).toBe("https://signed-upload.example/01");
  });
});

describe("commitScreenshot", () => {
  it("PATCHes /v1/appScreenshots/{id} with uploaded=true and sourceFileChecksum", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "ss_1", attributes: {} } });

    await commitScreenshot("ss_1", "md5_hex_value");

    expect(ascRequest).toHaveBeenCalledWith("/v1/appScreenshots/ss_1", {
      method: "PATCH",
      body: {
        data: {
          type: "appScreenshots",
          id: "ss_1",
          attributes: {
            uploaded: true,
            sourceFileChecksum: "md5_hex_value",
          },
        },
      },
    });
  });
});

describe("putScreenshotBytes", () => {
  it("PUTs the byte range to the operation URL with the given headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 })
    );
    const bytes = Buffer.from("hello");
    await putScreenshotBytes(
      {
        method: "PUT",
        url: "https://signed/01",
        length: 5,
        offset: 0,
        requestHeaders: [{ name: "Content-Type", value: "image/png" }],
      },
      bytes
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://signed/01",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/png" },
      })
    );
    fetchSpy.mockRestore();
  });

  it("throws when the PUT returns non-2xx", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("server error", { status: 500 })
    );
    await expect(
      putScreenshotBytes(
        { method: "PUT", url: "https://signed/01", length: 5, offset: 0, requestHeaders: [] },
        Buffer.from("hello")
      )
    ).rejects.toThrow(/HTTP 500/);
    fetchSpy.mockRestore();
  });
});
