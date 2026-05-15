import { open } from "node:fs/promises";

export interface Dimensions {
  width: number;
  height: number;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Read width/height from a PNG's IHDR chunk (first 24 bytes). */
export async function readPngDimensions(path: string): Promise<Dimensions> {
  const fh = await open(path, "r");
  try {
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error(`${path} is not a valid PNG (signature mismatch)`);
    }
    // IHDR chunk starts at byte 8: 4 bytes length, 4 bytes type "IHDR", then data
    const ihdrType = buf.subarray(12, 16).toString("ascii");
    if (ihdrType !== "IHDR") {
      throw new Error(`${path} is not a valid PNG (no IHDR chunk)`);
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    await fh.close();
  }
}

/**
 * Read width/height from an MP4 by walking top-level boxes until tkhd is found.
 * Apple's App Preview videos are short (~30s), so we scan up to 2 MB.
 */
export async function readMp4Dimensions(path: string): Promise<Dimensions> {
  const fh = await open(path, "r");
  try {
    const SCAN_LIMIT = 2 * 1024 * 1024;
    const stat = await fh.stat();
    const size = Math.min(stat.size, SCAN_LIMIT);
    const buf = Buffer.alloc(size);
    await fh.read(buf, 0, size, 0);

    let pos = 0;
    while (pos + 8 < buf.length) {
      const boxSize = buf.readUInt32BE(pos);
      const boxType = buf.subarray(pos + 4, pos + 8).toString("ascii");
      if (boxType === "tkhd") {
        // version is at boxData[0]
        const dataStart = pos + 8;
        const version = buf[dataStart];
        // width is fixed-point 16.16 at offset 76 (v0) or 88 (v1)
        const widthOffset = version === 0 ? 76 : 88;
        const heightOffset = widthOffset + 4;
        const width = buf.readUInt32BE(dataStart + widthOffset) >>> 16;
        const height = buf.readUInt32BE(dataStart + heightOffset) >>> 16;
        return { width, height };
      }
      // Descend into container boxes that hold tkhd
      if (boxType === "moov" || boxType === "trak") {
        pos += 8;
        continue;
      }
      if (boxSize === 0) break; // box extends to EOF
      pos += boxSize;
    }
    throw new Error(`${path}: no tkhd box found in first ${SCAN_LIMIT} bytes`);
  } finally {
    await fh.close();
  }
}
