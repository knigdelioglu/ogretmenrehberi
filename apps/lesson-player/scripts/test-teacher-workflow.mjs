import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const workflow = JSON.parse(
  fs.readFileSync(path.resolve(dir, "../src/teacher-workflow.json"), "utf8")
);

assert.equal(workflow.themes.length, 4, "11. sınıfın dört teması tanımlı olmalı");
assert.equal(workflow.annual.items.length, 5, "Dört eser ve bir film tanımlı olmalı");
assert.deepEqual(
  workflow.annual.items.map((item) => item.id),
  ["book-1", "book-2", "book-3", "film", "book-4"]
);
assert.deepEqual(
  workflow.annual.items.filter((item) => item.term === 1).map((item) => item.id),
  ["book-1", "book-2"]
);
assert.deepEqual(
  workflow.annual.items.filter((item) => item.term === 2).map((item) => item.id),
  ["book-3", "film", "book-4"]
);

// Proposed presentation windows must remain labelled as guidance, not mandatory dates.
const expectedWeeks = [
  ["book-1", "2026-11-23", "2026-11-27", "23–27 Kasım 2026"],
  ["book-2", "2027-01-11", "2027-01-15", "11–15 Ocak 2027"],
  ["book-3", "2027-03-22", "2027-03-26", "22–26 Mart 2027"],
  ["film", "2027-05-03", "2027-05-07", "3–7 Mayıs 2027"],
  ["book-4", "2027-05-24", "2027-05-28", "24–28 Mayıs 2027"]
];
for (const [id, start, end, label] of expectedWeeks) {
  const item = workflow.annual.items.find((candidate) => candidate.id === id);
  assert.deepEqual(item?.suggested_presentation, { start, end, label });
  assert.equal(new Date(`${start}T00:00:00Z`).getUTCDay(), 1, `${id} begins Monday`);
  assert.equal(new Date(`${end}T00:00:00Z`).getUTCDay(), 5, `${id} ends Friday`);
}
assert.match(workflow.annual.note, /resmî zorunlu tarih değildir/);
assert.match(workflow.annual.note, /zümre kararı/);
assert.match(workflow.annual.preparation_note, /bir hafta önce/);
assert.match(workflow.annual.exam_fallback, /18–21 Ocak 2027/);

// Each proposed reading/film slot is tied to exactly one theme in the four-theme guide.
const themeAssignments = [
  ["book-1", "TEMA_01"],
  ["book-2", "TEMA_02"],
  ["book-3", "TEMA_03"],
  ["film", "TEMA_04"],
  ["book-4", "TEMA_04"]
];
for (const [id, themeId] of themeAssignments) {
  const item = workflow.annual.items.find((candidate) => candidate.id === id);
  assert.equal(item?.recommended_theme_id, themeId);
  assert.ok(workflow.themes.some((theme) => theme.id === themeId));
}
assert.deepEqual(
  workflow.themes.map((theme) =>
    workflow.annual.items.filter((item) => item.recommended_theme_id === theme.id).length
  ),
  [1, 1, 1, 2],
  "Every theme gets a reading/film planning slot without duplicating any annual item"
);

const seen = new Set();
for (const [index, theme] of workflow.themes.entries()) {
  assert.equal(theme.id, `TEMA_0${index + 1}`);
  assert.equal(theme.term, index < 2 ? 1 : 2);
  assert.equal(theme.tasks.length, 2, `${theme.id}: konuşma + yazma`);
  assert.deepEqual(theme.tasks.map((task) => task.skill), ["Konuşma", "Yazma"]);
  assert.ok(theme.source.startsWith("https://tymm.meb.gov.tr/"));
  for (const task of theme.tasks) {
    assert.ok(!seen.has(task.id), `Duplicate task id ${task.id}`);
    seen.add(task.id);
    assert.ok(Number.isInteger(task.from) && task.from > 0);
    assert.ok(Number.isInteger(task.to) && task.to >= task.from);
    assert.ok(task.portfolio && task.assessment && task.timing);
  }
  assert.ok(theme.reflection.portfolio && theme.reflection.page);
}
assert.equal(seen.size, 8, "Yıllık sekiz tema içi atölye ürünü");
assert.match(workflow.annual.assessment, /zümre kararı/);
assert.match(workflow.annual.note, /ayrı takip/);
console.log("Teacher workflow data: 4 themes / 8 workshops / 4 books + 1 film PASS");
