import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readPngDimensions, readMp4Dimensions } from "../dimensions.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/** Build a minimal valid PNG with the given dimensions (IHDR + IDAT + IEND). */
function makePng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;     // bit depth
  ihdr[9] = 6;     // color type (RGBA)
  ihdr[10] = 0;    // compression
  ihdr[11] = 0;    // filter
  ihdr[12] = 0;    // interlace
  return Buffer.concat([signature, makeChunk("IHDR", ihdr), makeChunk("IDAT", Buffer.alloc(0)), makeChunk("IEND", Buffer.alloc(0))]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  // CRC is required by spec but parsers tolerant of 0 are fine for our test
  const crc = Buffer.alloc(4);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Build a minimal MP4 with a tkhd box declaring the given dimensions. */
function makeMp4(width: number, height: number): Buffer {
  // ftyp box
  const ftyp = box("ftyp", Buffer.concat([
    Buffer.from("isom", "ascii"),
    Buffer.alloc(4),
    Buffer.from("isomavc1mp41", "ascii"),
  ]));
  // moov > trak > tkhd
  const tkhd = Buffer.alloc(92);
  tkhd.writeUInt8(0, 0);                              // version=0
  tkhd.writeUIntBE(0, 1, 3);                          // flags
  // skip the 16 bytes of creation/modification/track_id/reserved/duration
  // for version=0 the layout after 4 bytes of version/flags is:
  // creation(4), modification(4), trackID(4), reserved(4), duration(4), reserved(8), layer(2), altGroup(2), volume(2), reserved(2), matrix(36), width(4), height(4)
  // width offset: 4+4+4+4+4+4+8+2+2+2+2+36 = 76
  // height offset: 80
  tkhd.writeUInt32BE(width << 16, 76);                // fixed-point 16.16
  tkhd.writeUInt32BE(height << 16, 80);
  const trak = box("trak", box("tkhd", tkhd));
  const moov = box("moov", trak);
  return Buffer.concat([ftyp, moov]);
}

function box(type: string, payload: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length + 8, 0);
  return Buffer.concat([size, Buffer.from(type, "ascii"), payload]);
}

beforeAll(async () => {
  await rm(FIXTURES, { recursive: true, force: true });
  await mkdir(FIXTURES, { recursive: true });
  await writeFile(join(FIXTURES, "iphone-67.png"), makePng(1290, 2796));
  await writeFile(join(FIXTURES, "tour.mp4"), makeMp4(886, 1920));
});

describe("readPngDimensions", () => {
  it("reads width and height from a PNG IHDR", async () => {
    const dim = await readPngDimensions(join(FIXTURES, "iphone-67.png"));
    expect(dim).toEqual({ width: 1290, height: 2796 });
  });

  it("rejects non-PNG files", async () => {
    const path = join(FIXTURES, "not-a-png.bin");
    await writeFile(path, Buffer.from("hello"));
    await expect(readPngDimensions(path)).rejects.toThrow(/not a valid PNG/);
  });
});

describe("readMp4Dimensions", () => {
  it("reads width and height from an MP4 tkhd", async () => {
    const dim = await readMp4Dimensions(join(FIXTURES, "tour.mp4"));
    expect(dim).toEqual({ width: 886, height: 1920 });
  });
});
