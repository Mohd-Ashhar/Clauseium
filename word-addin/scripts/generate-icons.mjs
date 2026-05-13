// Generate placeholder PNG icons for the Word add-in ribbon button.
//
// Office's manifest requires PNG files at known URLs (icon-{16,32,64,80,128}.png).
// This script writes a brand-purple square with a centered "§" mark at each
// size, using only Node stdlib — no external deps. The output is committable
// and gets replaced by real branded artwork later by simply overwriting the
// files in word-addin/assets/.
//
// Idempotent: if a file already exists, we skip it. That way real artwork
// dropped in by a designer is never clobbered.
//
// PNG file format (RFC 2083 / W3C PNG spec):
//   8-byte signature
//   IHDR chunk (width, height, bit depth=8, color type=2 RGB)
//   IDAT chunk(s) — zlib-compressed scanline data
//   IEND chunk
// Each chunk: length(4) + type(4) + data(length) + CRC32(4).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DIR = join(__dirname, "..", "assets");

const SIZES = [16, 32, 64, 80, 128];

// Brand palette
const BG = [0x7c, 0x5c, 0xff]; // brand-500 (#7c5cff)
const FG = [0xff, 0xff, 0xff]; // white

// 7-row × 5-col bitmap of the "§" mark. 1 = foreground, 0 = background.
// Drawn by hand to read as a section symbol at small sizes.
const GLYPH = [
  [0, 1, 1, 1, 0],
  [1, 1, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 1, 1],
  [0, 1, 1, 1, 0],
];
const GLYPH_W = 5;
const GLYPH_H = 7;

// CRC32 table (IEEE polynomial 0xEDB88320). Computed once.
const CRC_TABLE = new Uint32Array(256);
(function buildCrcTable() {
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    CRC_TABLE[n] = c >>> 0;
  }
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32BE(value, into, offset) {
  into[offset] = (value >>> 24) & 0xff;
  into[offset + 1] = (value >>> 16) & 0xff;
  into[offset + 2] = (value >>> 8) & 0xff;
  into[offset + 3] = value & 0xff;
}

function chunk(typeStr, data) {
  const type = Buffer.from(typeStr, "ascii");
  const lenBuf = Buffer.alloc(4);
  writeUint32BE(data.length, lenBuf, 0);
  const crcInput = Buffer.concat([type, data]);
  const crcBuf = Buffer.alloc(4);
  writeUint32BE(crc32(crcInput), crcBuf, 0);
  return Buffer.concat([lenBuf, type, data, crcBuf]);
}

// Build the raw RGB pixel data for one icon at the given size. The glyph is
// centered and scaled proportionally; everything else is the brand color.
function buildPixels(size) {
  // Scale the 5×7 glyph to fit roughly 60% of the icon.
  const targetGlyphHeight = Math.max(7, Math.round(size * 0.6));
  const scale = Math.max(1, Math.floor(targetGlyphHeight / GLYPH_H));
  const drawnH = GLYPH_H * scale;
  const drawnW = GLYPH_W * scale;
  const offsetX = Math.floor((size - drawnW) / 2);
  const offsetY = Math.floor((size - drawnH) / 2);

  // scanlines = [filterByte=0, R0, G0, B0, R1, G1, B1, ...]
  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(rowBytes * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // PNG filter type "None" for this scanline.
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * 3;
      let onGlyph = false;
      const gx = Math.floor((x - offsetX) / scale);
      const gy = Math.floor((y - offsetY) / scale);
      if (gx >= 0 && gx < GLYPH_W && gy >= 0 && gy < GLYPH_H) {
        onGlyph = GLYPH[gy][gx] === 1;
      }
      const [r, g, b] = onGlyph ? FG : BG;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  return raw;
}

function buildPng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  writeUint32BE(size, ihdr, 0); // width
  writeUint32BE(size, ihdr, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(buildPixels(size));
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main() {
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  let wrote = 0;
  let skipped = 0;
  for (const size of SIZES) {
    const path = join(ASSETS_DIR, `icon-${size}.png`);
    if (existsSync(path)) {
      skipped += 1;
      continue;
    }
    writeFileSync(path, buildPng(size));
    wrote += 1;
  }

  if (wrote === 0) {
    console.log(`[icons] ${skipped}/${SIZES.length} icons already present, skipped.`);
  } else {
    console.log(
      `[icons] wrote ${wrote} icon${wrote === 1 ? "" : "s"} to word-addin/assets/ (${skipped} already present).`,
    );
  }
}

main();
