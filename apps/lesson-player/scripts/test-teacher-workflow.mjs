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
