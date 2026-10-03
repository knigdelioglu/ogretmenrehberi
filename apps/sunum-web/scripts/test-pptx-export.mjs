import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { createLessonPptx, pptxFilename } from "../src/pptx-export.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtIndex = fs.readFileSync(path.join(appRoot, "dist/index.html"), "utf8");
const builtWorker = fs.readFileSync(path.join(appRoot, "dist/sw.js"), "utf8");
assert.match(builtIndex, /menu-export-pptx/);
assert.match(builtWorker, /pptx-export\.js/, "offline shell precaches the exporter module");
assert.ok(fs.existsSync(path.join(appRoot, "dist/pptx-export.js")), "build ships the PPTX module");

function pngCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
const transparentPixel = Uint8Array.from(Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk("IHDR", ihdr),
  pngChunk("IDAT", deflateSync(Buffer.from([0, 255, 255, 255, 255]))),
  pngChunk("IEND", Buffer.alloc(0))
]));
const blob = createLessonPptx([transparentPixel, transparentPixel, transparentPixel]);
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], "PPTX is a ZIP package");
assert.equal(pptxFilename({ slug: "dinleme-izleme" }), "dinleme-izleme.pptx");
const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), "sunum-pptx-test-"));
try {
  const packagePath = path.join(packageDir, "export.pptx");
  fs.writeFileSync(packagePath, bytes);
  execFileSync("unzip", ["-t", packagePath], { stdio: "ignore" });
} finally {
  fs.rmSync(packageDir, { recursive: true, force: true });
}

const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const decoder = new TextDecoder();
const files = new Map();
let offset = 0;
while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
  const size = view.getUint32(offset + 18, true);
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const nameStart = offset + 30;
  const dataStart = nameStart + nameLength + extraLength;
  const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
  files.set(name, bytes.slice(dataStart, dataStart + size));
  offset = dataStart + size;
}

assert.ok(files.has("[Content_Types].xml"));
assert.ok(files.has("ppt/presentation.xml"));
assert.equal([...files.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length, 3);
assert.equal([...files.keys()].filter((name) => /^ppt\/media\/slide\d+\.png$/.test(name)).length, 3);
assert.match(decoder.decode(files.get("ppt/slides/slide1.xml")), /<p:pic>/, "each exported slide uses the rendered slide image");
assert.match(decoder.decode(files.get("ppt/slides/_rels/slide1.xml.rels")), /Target="\.\.\/media\/slide1\.png"/);
assert.deepEqual(files.get("ppt/media/slide1.png"), transparentPixel);
console.log("PPTX image export package checks passed.");
