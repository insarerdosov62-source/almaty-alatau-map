#!/usr/bin/env node
/*
 * Генерация PNG-иконок без внешних зависимостей.
 * Запуск: node generate-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZES = [192, 512];
const SS = 3; // суперсэмплинг для сглаживания краёв

let crcTable;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([len, name, data, crc]);
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    let o = y * (1 + size * 4);
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      raw[o++] = Math.max(0, Math.min(255, Math.round(pixels[i])));
      raw[o++] = Math.max(0, Math.min(255, Math.round(pixels[i + 1])));
      raw[o++] = Math.max(0, Math.min(255, Math.round(pixels[i + 2])));
      raw[o++] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function polygon(points, color) {
  return {
    color,
    has(x, y) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
  };
}

function circle(cx, cy, r, color) {
  return {
    color,
    has(x, y) {
      return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    }
  };
}

const shapes = [
  circle(0.68, 0.30, 0.105, [244, 185, 120]),
  polygon(
    [[0.12, 0.80], [0.37, 0.28], [0.50, 0.48], [0.65, 0.20], [0.88, 0.80]],
    [242, 141, 87]
  ),
  polygon(
    [[0.37, 0.28], [0.32, 0.40], [0.35, 0.375], [0.38, 0.43], [0.405, 0.375], [0.44, 0.405]],
    [246, 243, 232]
  ),
  polygon(
    [[0.65, 0.20], [0.60, 0.32], [0.63, 0.30], [0.65, 0.355], [0.675, 0.30], [0.70, 0.335]],
    [246, 243, 232]
  ),
  polygon(
    [[0, 0.88], [0.20, 0.68], [0.36, 0.82], [0.56, 0.60], [0.78, 0.84], [1, 0.72], [1, 1], [0, 1]],
    [36, 58, 49]
  )
];

function background(y) {
  const t = Math.max(0, Math.min(1, y));
  return [20 + 10 * t, 25 + 15 * t, 24 + 12 * t];
}

function render(size) {
  const pixels = new Float32Array(size * size * 3);
  const s = size * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x * SS + sx + 0.5) / s;
          const py = (y * SS + sy + 0.5) / s;
          let color = background(py);
          for (const shape of shapes) if (shape.has(px, py)) color = shape.color;
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const i = (y * size + x) * 3;
      pixels[i] = r / (SS * SS);
      pixels[i + 1] = g / (SS * SS);
      pixels[i + 2] = b / (SS * SS);
    }
  }
  return encodePNG(size, pixels);
}

for (const size of SIZES) {
  const file = path.join(__dirname, `icon-${size}.png`);
  fs.writeFileSync(file, render(size));
  console.log(`Готово: ${path.basename(file)}`);
}
