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

function collectPresentationText(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPresentationText(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      collectPresentationText(item, out);
    }
  }
  return out;
}

const forbiddenPresentationMeta = [
  /öğrencinin[^\n]*(?:cevap|yanıt|görüş|kabul|tamamlam)/i,
  /öğrenci(?:ler)?[^\n]*(?:kabul edilir|kabul edilebilir|beklenir|tamamlamalıdır)/i,
  /öğretmen rehberi/i,
  /öğretmen değerlendirme rubriği/i,
  /kabul edilebilir alternatifler/i,
  /bu soru kişisel tercihe açıktır/i,
];
assert.equal(catalog.lessons.length, canonical.length, "ders sayısı");
let studentFacingThemeSteps = 0;
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
    if (lesson.theme_id === "TEMA_01" || lesson.theme_id === "TEMA_02") {
      studentFacingThemeSteps += 1;
      assert.ok(!s.reveals.includes("guidance"), `${s.id} öğretmen yönlendirmesi sunuma sızmamalı`);
      assert.ok(!s.reveals.includes("explanation"), `${s.id} öğretmen açıklaması sunuma sızmamalı`);
      assert.equal(s.answer?.guidance, undefined, `${s.id} öğretmen yönlendirmesi veriden çıkarılmalı`);
      assert.equal(s.answer?.explanation, undefined, `${s.id} öğretmen açıklaması veriden çıkarılmalı`);

      const presentationAnswerText = collectPresentationText({
        answer: s.answer?.answer,
        answer_sections: s.answer?.answer_sections,
      }).join("\n");
      for (const pattern of forbiddenPresentationMeta) {
        assert.ok(
          !pattern.test(presentationAnswerText),
          `${s.id} cevap alanında sunuma uygun olmayan öğretmen/değerlendirme dili var: ${pattern}`
        );
      }
    } else if (s.answer?.guidance || s.answer?.explanation) {
      otherThemeSupportLayers += 1;
    }
  }
}
assert.ok(studentFacingThemeSteps > 0, "TEMA_01 ve TEMA_02 sunum adımları kapsanmalı");
assert.ok(otherThemeSupportLayers > 0, "Diğer temaların mevcut destek katmanları korunmalı");
assert.ok(!JSON.stringify(catalog).includes('"note"'), "note alanı sunum verisinde olmamalı");
console.log(`[sunum-web] Veri testi geçti: ${catalog.lessons.length} ders.`);
