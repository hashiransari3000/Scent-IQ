// Generates the ScentIQ app icons as PNGs without any native dependencies.
// The mark mirrors the in-app logo: concentric rings with an amber centre dot.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps", "web", "public");
mkdirSync(outDir, { recursive: true });

const INK = [14, 13, 11];
const IVORY = [245, 240, 230];
const AMBER = [200, 150, 62];

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function blend(base, over, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + over[0] * alpha),
    Math.round(base[1] * (1 - alpha) + over[1] * alpha),
    Math.round(base[2] * (1 - alpha) + over[2] * alpha),
  ];
}

function sample(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const d = Math.hypot(x - cx, y - cy);
  let color = INK;

  const outerRadius = size * 0.4;
  const outerWidth = size * 0.014;
  if (Math.abs(d - outerRadius) <= outerWidth / 2) {
    color = blend(color, IVORY, 0.3);
  }

  const innerRadius = size * 0.252;
  const innerWidth = size * 0.01;
  const angle = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360) % 360;
  const dash = angle % 22 < 8;
  if (dash && Math.abs(d - innerRadius) <= innerWidth / 2) {
    color = blend(color, IVORY, 0.62);
  }

  if (d <= size * 0.098) color = AMBER;

  return color;
}

function render(size, supersample = 3) {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const offset = y * (size * 4 + 1);
    rows[offset] = 0;
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const color = sample(
            x + (sx + 0.5) / supersample,
            y + (sy + 0.5) / supersample,
            size,
          );
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const count = supersample * supersample;
      const index = offset + 1 + x * 4;
      rows[index] = Math.round(r / count);
      rows[index + 1] = Math.round(g / count);
      rows[index + 2] = Math.round(b / count);
      rows[index + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), render(size));
}
writeFileSync(join(outDir, "icon-maskable-512.png"), render(512));
console.log("Wrote icon-192.png, icon-512.png and icon-maskable-512.png");
