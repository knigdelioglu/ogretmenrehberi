// dist/ içindeki şifreli veriyi çözüp kanonik ders kataloğuyla karşılaştırır.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const dist = path.join(appRoot, "dist");
const password = process.env.SUNUM_SIFRE || "sunum";

const file = fs.readdirSync(dist).find((n) => /^data\.[0-9a-f]+\.bin$/.test(n));
assert.ok(file, "dist/data.*.bin yok");
const buf = fs.readFileSync(path.join(dist, file));
assert.equal(buf.subarray(0, 4).toString("ascii"), "SNM1");
const iterations = buf.readUInt32BE(4);
const salt = buf.subarray(8, 24);
const iv = buf.subarray(24, 36);
const body = buf.subarray(36, buf.length - 16);
const tag = buf.subarray(buf.length - 16);
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
const catalog = JSON.parse(zlib.gunzipSync(Buffer.concat([decipher.update(body), decipher.final()])).toString("utf8"));

const canonical = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/lesson-player/src/generated/lessons.json"), "utf8"));
assert.equal(catalog.lessons.length, canonical.length, "ders sayısı");
let themeOneSteps = 0;
let otherThemeSupportLayers = 0;
for (const [i, lesson] of canonical.entries()) {
  const out = catalog.lessons[i];
  assert.equal(out.slug, lesson.lesson_slug);
  assert.equal(out.steps.length, lesson.steps.length, `${lesson.lesson_slug} adım sayısı`);
  for (const [j, step] of lesson.steps.entries()) {
    const s = out.steps[j];
    assert.equal(s.id, step.id);
    assert.equal(s.prompt, step.display_prompt);
    assert.ok(!s.reveals.includes("note"), "öğretmen notu sunuma sızmamalı");
    if (step.answer?.answer) assert.equal(s.answer.answer, step.answer.answer, `${s.id} cevap`);
    if (lesson.theme_id === "TEMA_01") {
      themeOneSteps += 1;
      assert.ok(!s.reveals.includes("guidance"), `${s.id} öğretmen yönlendirmesi sunuma sızmamalı`);
      assert.ok(!s.reveals.includes("explanation"), `${s.id} öğretmen açıklaması sunuma sızmamalı`);
      assert.equal(s.answer?.guidance, undefined, `${s.id} öğretmen yönlendirmesi veriden çıkarılmalı`);
      assert.equal(s.answer?.explanation, undefined, `${s.id} öğretmen açıklaması veriden çıkarılmalı`);
    } else if (s.answer?.guidance || s.answer?.explanation) {
      otherThemeSupportLayers += 1;
    }
  }
}
assert.ok(themeOneSteps > 0, "TEMA_01 adımları kapsanmalı");
assert.ok(otherThemeSupportLayers > 0, "Diğer temaların mevcut destek katmanları korunmalı");
assert.ok(!JSON.stringify(catalog).includes('"note"'), "note alanı sunum verisinde olmamalı");
console.log(`[sunum-web] Veri testi geçti: ${catalog.lessons.length} ders.`);
