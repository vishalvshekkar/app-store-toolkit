import { describe, it, expect } from "vitest";
import {
  getSpec,
  inferDeviceFromDimensions,
  listDevices,
  type DeviceKey,
} from "../asc-asset-specs.js";

describe("asc-asset-specs catalog", () => {
  it("listDevices returns the five iOS device keys", () => {
    const devices = listDevices("ios");
    expect(devices).toEqual([
      "iphone-6.7",
      "iphone-6.5",
      "iphone-5.5",
      "ipad-pro-12.9",
      "ipad-pro-11",
    ]);
  });

  it("getSpec returns expected screenshot dimensions for iphone-6.7", () => {
    const spec = getSpec("ios", "iphone-6.7");
    expect(spec.ascDisplayTarget).toBe("APP_IPHONE_67");
    expect(spec.screenshotDimensions).toContainEqual({ width: 1290, height: 2796 });
    expect(spec.screenshotDimensions).toContainEqual({ width: 2796, height: 1290 });
  });

  it("inferDeviceFromDimensions detects iphone-6.7 in portrait", () => {
    expect(inferDeviceFromDimensions("ios", 1290, 2796)).toBe("iphone-6.7");
  });

  it("inferDeviceFromDimensions detects iphone-6.7 in landscape", () => {
    expect(inferDeviceFromDimensions("ios", 2796, 1290)).toBe("iphone-6.7");
  });

  it("inferDeviceFromDimensions returns null for unknown sizes", () => {
    expect(inferDeviceFromDimensions("ios", 100, 100)).toBeNull();
  });

  it("snapshot of the full catalog", () => {
    const snapshot: Record<string, Record<string, unknown>> = {};
    for (const device of listDevices("ios")) {
      snapshot[device] = getSpec("ios", device) as unknown as Record<string, unknown>;
    }
    expect(snapshot).toMatchInlineSnapshot(`
      {
        "ipad-pro-11": {
          "ascDisplayTarget": "APP_IPAD_PRO_11",
          "previewDimensions": [
            {
              "height": 1668,
              "width": 2388,
            },
          ],
          "screenshotDimensions": [
            {
              "height": 2388,
              "width": 1668,
            },
            {
              "height": 1668,
              "width": 2388,
            },
          ],
        },
        "ipad-pro-12.9": {
          "ascDisplayTarget": "APP_IPAD_PRO_129",
          "previewDimensions": [
            {
              "height": 2048,
              "width": 2732,
            },
          ],
          "screenshotDimensions": [
            {
              "height": 2732,
              "width": 2048,
            },
            {
              "height": 2048,
              "width": 2732,
            },
          ],
        },
        "iphone-5.5": {
          "ascDisplayTarget": "APP_IPHONE_55",
          "previewDimensions": [
            {
              "height": 1920,
              "width": 1080,
            },
          ],
          "screenshotDimensions": [
            {
              "height": 2208,
              "width": 1242,
            },
            {
              "height": 1242,
              "width": 2208,
            },
          ],
        },
        "iphone-6.5": {
          "ascDisplayTarget": "APP_IPHONE_65",
          "previewDimensions": [
            {
              "height": 1920,
              "width": 886,
            },
          ],
          "screenshotDimensions": [
            {
              "height": 2778,
              "width": 1284,
            },
            {
              "height": 1284,
              "width": 2778,
            },
          ],
        },
        "iphone-6.7": {
          "ascDisplayTarget": "APP_IPHONE_67",
          "previewDimensions": [
            {
              "height": 1920,
              "width": 886,
            },
          ],
          "screenshotDimensions": [
            {
              "height": 2796,
              "width": 1290,
            },
            {
              "height": 1290,
              "width": 2796,
            },
          ],
        },
      }
    `);
  });
});
