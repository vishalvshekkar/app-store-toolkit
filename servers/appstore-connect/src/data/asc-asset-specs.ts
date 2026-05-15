import specsJson from "./asc-asset-specs.json" with { type: "json" };

export type Platform = "ios";
export type DeviceKey =
  | "iphone-6.7"
  | "iphone-6.5"
  | "iphone-5.5"
  | "ipad-pro-12.9"
  | "ipad-pro-11";

export interface Dimensions {
  width: number;
  height: number;
}

export interface DeviceSpec {
  ascDisplayTarget: string;
  screenshotDimensions: Dimensions[];
  previewDimensions: Dimensions[];
}

interface SpecsJson {
  [platform: string]: { [device: string]: DeviceSpec };
}

const specs = specsJson as SpecsJson;

export function listDevices(platform: Platform): DeviceKey[] {
  return Object.keys(specs[platform] ?? {}) as DeviceKey[];
}

export function getSpec(platform: Platform, device: DeviceKey): DeviceSpec {
  const spec = specs[platform]?.[device];
  if (!spec) {
    throw new Error(`Unknown device: ${platform}/${device}`);
  }
  return spec;
}

export function inferDeviceFromDimensions(
  platform: Platform,
  width: number,
  height: number
): DeviceKey | null {
  for (const device of listDevices(platform)) {
    const spec = getSpec(platform, device);
    const matches = spec.screenshotDimensions.some(
      (d) => d.width === width && d.height === height
    );
    if (matches) return device;
  }
  return null;
}

export function ascDisplayTarget(platform: Platform, device: DeviceKey): string {
  return getSpec(platform, device).ascDisplayTarget;
}
