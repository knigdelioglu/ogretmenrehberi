import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLessonPptx, pptxFilename } from "../src/pptx-export.js";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtIndex = fs.readFileSync(path.join(appRoot, "dist/index.html"), "utf8");
const builtWorker = fs.readFileSync(path.join(appRoot, "dist/sw.js"), "utf8");
assert.match(builtIndex, /menu-export-pptx/);
assert.match(builtWorker, /pptx-export\.js/, "offline shell precaches the exporter module");
assert.ok(fs.existsSync(path.join(appRoot, "dist/pptx-export.js")), "build ships the PPTX module");

const lesson = {
  slug: "dinleme-izleme",
  title: "Metin Tahlili-3 — Dinleme / İzleme",
  subtitle: "1. Tema · 11. Sınıf",
  pages: "59-73",
  steps: [
    {
      prompt: "Başlık ve görselden hareketle tahminde bulunun.",
      page: "64",
      heading: "Dinleme öncesi",
      content: { lead: "Düşüncelerinizi paylaşın.", items: ["İlk soru", "İkinci soru & kanıt"] },
      reveals: ["answer", "evidence"],
      answer: {
        answer: "İletişim araçlarının gelişimi.",
        evidence_quotes: ["‘İletişim, bir medenileşme hareketidir.’"]
      }
    }
  ]
};

const blob = createLessonPptx(lesson);
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04], "PPTX is a ZIP package");
assert.equal(pptxFilename(lesson), "dinleme-izleme.pptx");

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
  files.set(name, decoder.decode(bytes.slice(dataStart, dataStart + size)));
  offset = dataStart + size;
}

assert.ok(files.has("[Content_Types].xml"));
assert.ok(files.has("ppt/presentation.xml"));
assert.equal([...files.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length, 4);
const slides = [...files.entries()].filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).map(([, xml]) => xml).join("\n");
assert.match(slides, /Metin Tahlili-3/);
assert.match(slides, /Başlık ve görselden hareketle tahminde bulunun/);
assert.match(slides, /İletişim araçlarının gelişimi/);
assert.match(slides, /İletişim, bir medenileşme hareketidir/);
assert.match(slides, /&amp;/, "XML special characters are escaped");
console.log("PPTX export package checks passed.");
