import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../src/generated/lessons.json");
const lessons = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(lessons), "Lesson catalog bir dizi olmalı.");

const theme1Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_01");
const theme2Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_02");
const theme3Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_03");
const theme4Lessons = lessons.filter((lesson) => lesson.theme_id === "TEMA_04");

assert(
  theme1Lessons.length === 7,
  "1. Tema freeze kapsamı tam olarak yedi ders içermeli."
);
assert(
  theme2Lessons.length === 9,
  "Tema 2 üretiminde değerlendirme dâhil dokuz doğal blok bulunmalı."
);

assert(theme3Lessons.length === 18, "Tema 3 ölçme ve değerlendirme s.230–235 ile on sekiz doğal blok içermeli.");

const akif202 = lessons.find(lesson => lesson.lesson_id === "T11-T03-BIYOGRAFI-AKIF-COZUMLEME-202-205");
assert(akif202 && akif202.printed_page_range === "202-205" &&
  akif202.coverage.steps === 17 && akif202.coverage.source_records === 12 &&
  akif202.coverage.answer_entries === 12,
  "Âkif s.202–205 çözümleme bloğu 17 ekran, 12 kaynak ve 12 cevap içermeli.");
const akif202ById = new Map(akif202.steps.map(step => [step.id, step]));
assert(akif202ById.size === 17, "Âkif s.202–205 ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s202-q1", "T03-S0066", "T3-P202-Q01"],
  ["s202-q2", "T03-S0067", "T3-P202-Q02"],
  ["s203-q1", "T03-S0068", "T3-P203-Q01"],
  ["s203-q2", "T03-S0069", "T3-P203-Q02"],
  ["s204-q1", "T03-S0070", "T3-P204-Q01"],
  ["s204-q2", "T03-S0071", "T3-P204-Q02"],
  ["s205-q1", "T03-S0072", "T3-P205-Q01"],
  ["s205-q2", "T03-S0073", "T3-P205-Q02"],
  ["s205-q3", "T03-S0074", "T3-P205-Q03"],
  ["s205-q4", "T03-S0075", "T3-P205-Q04"],
  ["s205-asim-q1", "T03-S0076", "T3-P205-PERF01"],
  ["s205-asim-q2", "T03-S0077", "T3-P205-PERF02"]
]) {
  assert(akif202ById.get(id)?.source?.source_record_id === sourceId &&
    akif202ById.get(id)?.answer?.question_id === answerId,
    `Âkif s.202–205 kanonik kaynak/cevap bağlantısı: ${id}`);
}
assert(akif202ById.get("s204-q1")?.layout === "comparison" &&
  akif202ById.get("s204-q1")?.content?.items?.length === 7 &&
  Object.keys(akif202ById.get("s204-q1")?.answer?.answer_sections ?? {}).length === 7,
  "Huzur–Âkif karşılaştırmasında kitabın yedi ölçütü korunmalı.");
assert(akif202ById.get("s202-q1-criterion")?.answer === null &&
  akif202ById.get("s203-types")?.answer === null &&
  akif202ById.get("s204-q1-first")?.answer === null &&
  akif202ById.get("s204-q1-second")?.answer === null &&
  akif202ById.get("s205-q1-chronology")?.answer === null,
  "Ek süreç ve bilgi ekranları yeni cevap üretmemeli.");
assert(akif202ById.get("s205-asim-q1")?.answer?.entry_type === "performance_support" &&
  akif202ById.get("s205-asim-q2")?.answer?.entry_type === "performance_support",
  "Âsım'ın nesli soruları örnek performans desteği olarak kalmalı.");
for (const step of akif202.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Âkif s.202–205 kaynak doğrulaması: ${step.source.source_record_id}`);
}

const usuli = lessons.find(lesson => lesson.lesson_id === "T11-T03-USULI-TEZKIRE-206-209");
assert(usuli && usuli.printed_page_range === "206-209" &&
  usuli.coverage.steps === 15 && usuli.coverage.source_records === 11 &&
  usuli.coverage.answer_entries === 10,
  "Usûlî s.206–209, 15 ekran / 11 kaynak / 10 cevap içermeli.");
const usuliById = new Map(usuli.steps.map(step => [step.id, step]));
assert(usuliById.size === 15, "Usûlî s.206–209 ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s208-q1", "T03-S0079", "T3-P208-PERF01"],
  ["s208-q2", "T03-S0080", "T3-P208-Q02"],
  ["s208-q3", "T03-S0081", "T3-P208-Q03"],
  ["s208-q4", "T03-S0082", "T3-P208-Q04"],
  ["s208-q5", "T03-S0083", "T3-P208-Q05"],
  ["s208-q6", "T03-S0084", "T3-P208-Q06"],
  ["s209-q1", "T03-S0085", "T3-P209-PERF01"],
  ["s209-q2", "T03-S0086", "T3-P209-PERF02"],
  ["s209-q3", "T03-S0087", "T3-P209-PERF03"],
  ["s209-q4", "T03-S0088", "T3-P209-Q04"]
]) {
  assert(usuliById.get(id)?.source?.source_record_id === sourceId &&
    usuliById.get(id)?.answer?.question_id === answerId,
    `Usûlî s.206–209 kanonik kaynak/cevap bağlantısı: ${id}`);
}
assert(usuliById.get("s206-reference")?.answer === null &&
  usuliById.get("s207-reading")?.answer === null &&
  usuliById.get("s208-word-method")?.answer === null &&
  usuliById.get("s208-q3-layout")?.answer === null &&
  usuliById.get("s209-criteria")?.answer === null,
  "Usûlî yardımcı süreç ve bilgi ekranları cevap uydurmamalı.");
assert(usuliById.get("s208-q1")?.layout === "structure" &&
  Object.keys(usuliById.get("s208-q1")?.answer?.answer_sections ?? {}).length === 10,
  "Usûlî on kelimenin yapılandırılmış anlam/örnek verisi kaybolmamalı.");
assert(usuliById.get("s209-q1")?.answer?.entry_type === "performance_support" &&
  usuliById.get("s209-q2")?.answer?.entry_type === "performance_support" &&
  usuliById.get("s209-q3")?.answer?.entry_type === "performance_support",
  "Usûlî değerlendirme sorularında öğrenci görüşü tek doğruya indirgenmemeli.");
for (const step of usuli.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Usûlî s.206–209 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const kemalInterview = lessons.find(lesson => lesson.lesson_id === "T11-T03-KEMAL-TAHIR-MULAKAT-210-214");
assert(kemalInterview && kemalInterview.printed_page_range === "210-214" &&
  kemalInterview.coverage.steps === 19 && kemalInterview.coverage.source_records === 8 &&
  kemalInterview.coverage.answer_entries === 9,
  "Kemal Tahir / hayalî mülakat s.210–214 19 ekran / 8 kaynak / 9 cevap içermeli.");
const kemalById = new Map(kemalInterview.steps.map(step => [step.id, step]));
assert(kemalById.size === 19, "Mülakat s.210–214 ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s210-q1","T03-S0089","T3-P210-Q01"],
  ["s210-q2","T03-S0090","T3-P210-Q02"],
  ["s211-plan","T03-S0091","T3-P211-PERF01"],
  ["s212-perf-questions","T03-S0092","T3-P212-PERF01"],
  ["s212-sample","T03-S0092","T3-P212-PERF02"],
  ["s213-perf","T03-S0093","T3-P213-PERF01"],
  ["s214-q1","T03-S0094","T3-P214-Q01"],
  ["s214-q2","T03-S0095","T3-P214-Q02"],
  ["s214-eval","T03-S0096","T3-P214-PERF01"]
]) {
  assert(kemalById.get(id)?.source?.source_record_id === sourceId &&
    kemalById.get(id)?.answer?.question_id === answerId,
    `Mülakat s.210–214 kanonik kaynak/cevap bağlantısı: ${id}`);
}
assert(kemalById.get("s211-six-people")?.content?.items?.length === 6 &&
  kemalById.get("s214-eval")?.content?.items?.length === 6,
  "s.211 altı kişi ve s.214 altı öz değerlendirme ölçütü eksiksiz olmalı.");
assert(kemalById.get("s212-sample")?.answer?.explanation?.includes("birebir") &&
  kemalById.get("s214-eval")?.answer?.guidance?.includes("QR"),
  "Hayalî mülakatın kaynak sınırı ve QR rubrik uyarısı korunmalı.");
assert(kemalById.get("s211-six-people")?.answer === null &&
  kemalById.get("s214-feedback")?.answer === null,
  "Süreç ekranlarında kişilik yargısı veya rubrik puanı uydurulmamalı.");
for (const step of kemalInterview.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Mülakat s.210–214 doğrulanmış kaynak kaydı: ${step.source.source_record_id}`);
}

const direnisin = lessons.find(lesson => lesson.lesson_id === "T11-T03-DIRENISIN-USTALARI-215-220");
assert(direnisin && direnisin.printed_page_range === "215-220" &&
  direnisin.coverage.steps === 21 && direnisin.coverage.source_records === 15 &&
  direnisin.coverage.answer_entries === 15,
  "Direnişin Ustaları s.215–220 21 ekran / 15 kaynak / 15 cevap içermeli.");
const direnisinById = new Map(direnisin.steps.map(step => [step.id, step]));
assert(direnisinById.size === 21, "Direnişin Ustaları s.215–220 ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s215-q1","T03-S0097","T3-P215-Q01"],
  ["s215-q2","T03-S0098","T3-P215-Q02"],
  ["s215-q3","T03-S0099","T3-P215-Q03"],
  ["s216-plan","T03-S0100","T3-P216-PERF01"],
  ["s217-vocabulary","T03-S0101","T3-P217-VOC01"],
  ["s218-qh1","T03-S0102","T3-P218-QH01"],
  ["s218-qh2","T03-S0103","T3-P218-QH02"],
  ["s218-q1","T03-S0104","T3-P218-Q01"],
  ["s219-q2","T03-S0105","T3-P219-Q02"],
  ["s219-q3","T03-S0106","T3-P219-Q03"],
  ["s219-q4","T03-S0107","T3-P219-Q04"],
  ["s219-q5","T03-S0108","T3-P219-Q05"],
  ["s220-comp","T03-S0109","T3-P220-COMP01"],
  ["s220-q2","T03-S0110","T3-P220-Q02"],
  ["s220-q3","T03-S0111","T3-P220-Q03"]
]) {
  assert(direnisinById.get(id)?.source?.source_record_id === sourceId &&
    direnisinById.get(id)?.answer?.question_id === answerId,
    `Direnişin Ustaları s.215–220 kanonik bağlantı: ${id}`);
}
assert(direnisinById.get("s217-vocabulary")?.content?.items?.length === 5 &&
  direnisinById.get("s217-vocabulary")?.answer?.entry_type === "source_limited" &&
  direnisinById.get("s217-vocabulary")?.layout !== "vocabulary",
  "Ses kaydına bağlı beş kelime sahte sözlük tanımlarıyla doldurulmamalı.");
assert(direnisinById.get("s220-comp")?.answer?.entry_type === "source_limited" &&
  (direnisinById.get("s220-comp")?.content?.items?.length ?? 0) +
  (direnisinById.get("s220-comp-continued")?.content?.items?.length ?? 0) === 9 &&
  direnisinById.get("s220-comp-continued")?.answer === null,
  "Osmancık / Direnişin Ustaları karşılaştırmasının dokuz ölçütü korunmalı.");
for (const id of ["s218-q1","s219-q2","s219-q3","s219-q4","s219-q5","s220-q3"]) {
  assert(direnisinById.get(id)?.answer?.entry_type === "source_limited",
    `QR içeriği görülmeden kesin cevap verilmemeli: ${id}`);
}
for (const step of direnisin.steps) {
  assert(step.source.source_status === "VERIFIED",
    `s.215–220 ders kitabı kaynak doğrulaması: ${step.source.source_record_id}`);
}

const direnisinAnalysis = lessons.find(lesson => lesson.lesson_id === "T11-T03-DIRENISIN-USTALARI-221-224");
assert(direnisinAnalysis && direnisinAnalysis.printed_page_range === "221-224" &&
  direnisinAnalysis.coverage.steps === 17 &&
  direnisinAnalysis.coverage.source_records === 12 &&
  direnisinAnalysis.coverage.answer_entries === 12,
  "Direnişin Ustaları s.221–224 17 ekran / 12 kaynak / 12 cevap içermeli.");
const analysisById = new Map(direnisinAnalysis.steps.map(step => [step.id, step]));
assert(analysisById.size === 17, "Radyo tiyatrosu çözümleme ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s221-q1","T03-S0112","T3-P221-Q01"],
  ["s221-q2","T03-S0113","T3-P221-Q02"],
  ["s221-q3","T03-S0114","T3-P221-Q03"],
  ["s221-q4","T03-S0115","T3-P221-Q04"],
  ["s222-perf","T03-S0116","T3-P222-PERF01"],
  ["s223-research","T03-S0117","T3-P223-PERF01"],
  ["s223-criteria","T03-S0118","T3-P223-PERF02"],
  ["s223-q2","T03-S0119","T3-P223-Q02"],
  ["s223-q3","T03-S0120","T3-P223-Q03"],
  ["s224-q4","T03-S0121","T3-P224-PERF01"],
  ["s224-q5","T03-S0122","T3-P224-Q05"],
  ["s224-journal","T03-S0123","T3-P224-PERF02"]
]) {
  assert(analysisById.get(id)?.source?.source_record_id === sourceId &&
    analysisById.get(id)?.answer?.question_id === answerId,
    `Radyo tiyatrosu s.221–224 kanonik eşleşme: ${id}`);
}
assert(analysisById.get("s221-q1")?.content?.items?.length === 5 &&
  analysisById.get("s222-stance")?.content?.items?.length === 5 &&
  analysisById.get("s222-map")?.content?.items?.length === 5 &&
  analysisById.get("s224-journal")?.content?.items?.length === 5,
  "Yapı unsurları, görüş kartları, değer haritası ve günlük beşli yapıları korunmalı.");
for (const id of ["s221-q1","s221-q2","s221-q3","s221-q4","s223-q2","s223-q3","s224-q5"]) {
  assert(analysisById.get(id)?.answer?.entry_type === "source_limited",
    `Radyo tiyatrosu kaydı görülmeden kesin cevap verilmemeli: ${id}`);
}
assert(analysisById.get("s223-research")?.answer?.entry_type === "performance_support" &&
  analysisById.get("s223-criteria")?.answer?.entry_type === "performance_support" &&
  analysisById.get("s224-journal")?.answer?.entry_type === "performance_support",
  "Araştırma, değerlendirme ve öğrenme günlüğü hazır cevap gibi sunulmamalı.");
for (const step of direnisinAnalysis.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Radyo tiyatrosu s.221–224 kaynak doğrulaması: ${step.source.source_record_id}`);
}

const dialogueWriting = lessons.find(lesson => lesson.lesson_id === "T11-T03-RADYO-DIYALOG-YAZMA-225-229");
assert(dialogueWriting && dialogueWriting.printed_page_range === "225-229" &&
  dialogueWriting.coverage.steps === 16 && dialogueWriting.coverage.source_records === 7 &&
  dialogueWriting.coverage.answer_entries === 6,
  "Radyo tiyatrosu yazma s.225–229 16 ekran / 7 kaynak / 6 cevap içermeli.");
const dialogueById = new Map(dialogueWriting.steps.map(step => [step.id, step]));
assert(dialogueById.size === 16, "Radyo tiyatrosu yazma ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s225-choice","T03-S0125","T3-P225-PERF01"],
  ["s226-task","T03-S0126","T3-P226-PERF01"],
  ["s226-plan","T03-S0126","T3-P226-PERF02"],
  ["s227-rules","T03-S0127","T3-P227-PERF01"],
  ["s228-reflection","T03-S0128","T3-P228-PERF01"],
  ["s229-self","T03-S0129","T3-P229-PERF01"]
]) {
  assert(dialogueById.get(id)?.source?.source_record_id === sourceId &&
    dialogueById.get(id)?.answer?.question_id === answerId,
    `Radyo tiyatrosu yazma kanonik eşleşme: ${id}`);
}
assert(dialogueById.get("s229-self")?.content?.items?.length === 6 &&
  dialogueById.get("s229-exit")?.content?.sections?.length === 3 &&
  dialogueById.get("s229-exit")?.source?.source_record_id === "T03-S0130" &&
  dialogueById.get("s229-exit")?.answer === null,
  "Altı öz değerlendirme ölçütü ve 3-2-1 çıkış kartı ayrı tutulmalı.");
assert(dialogueById.get("s225-reference")?.answer === null &&
  dialogueById.get("s228-reflection")?.answer?.guidance?.includes("QR") &&
  dialogueById.get("s229-self")?.answer?.entry_type === "performance_support",
  "Kitap referansı, QR rubrik sınırı ve gerçek öz değerlendirme korunmalı.");
for (const step of dialogueWriting.steps) {
  assert(step.source.source_status === "VERIFIED",
    `s.225–229 kitap doğrulaması: ${step.source.source_record_id}`);
}

const theme3Assessment = lessons.find(lesson => lesson.lesson_id === "T11-T03-DEGERLENDIRME-230-235");
assert(theme3Assessment && theme3Assessment.printed_page_range === "230-235" &&
  theme3Assessment.coverage.steps === 24 && theme3Assessment.coverage.source_records === 16 &&
  theme3Assessment.coverage.answer_entries === 16,
  "Tema 3 s.230–235 değerlendirme bloğu 24 ekran / 16 kaynak / 16 cevap içermeli.");
const t3AssessmentById = new Map(theme3Assessment.steps.map(step => [step.id, step]));
assert(t3AssessmentById.size === 24,
  "Tema 3 değerlendirme ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s230-q1","T03-S0131","T3-P230-Q01"],
  ["s230-q2","T03-S0132","T3-P230-Q02"],
  ["s231-q3","T03-S0133","T3-P231-Q03"],
  ["s231-q4","T03-S0134","T3-P231-Q04"],
  ["s231-q5","T03-S0135","T3-P231-Q05"],
  ["s231-q6","T03-S0136","T3-P231-Q06"],
  ["s232-q7","T03-S0137","T3-P232-Q07"],
  ["s233-q8","T03-S0138","T3-P233-Q08"],
  ["s233-q9","T03-S0139","T3-P233-Q09"],
  ["s233-q10","T03-S0140","T3-P233-Q10"],
  ["s233-q11","T03-S0141","T3-P233-Q11"],
  ["s234-q12","T03-S0142","T3-P234-Q12"],
  ["s234-q13","T03-S0143","T3-P234-Q13"],
  ["s234-q14","T03-S0144","T3-P234-Q14"],
  ["s234-q15","T03-S0145","T3-P234-Q15"],
  ["s235-q16","T03-S0146","T3-P235-Q16"]
]) {
  assert(t3AssessmentById.get(id)?.source?.source_record_id === sourceId &&
    t3AssessmentById.get(id)?.answer?.question_id === answerId,
    `Tema 3 değerlendirme kanonik eşleşmesi: ${id}`);
}
assert(t3AssessmentById.get("s230-q1")?.content?.items?.length === 3 &&
  Object.keys(t3AssessmentById.get("s230-q1")?.answer?.answer_sections ?? {}).length === 3,
  "Venn diyagramında tez, antitez ve kesişim korunmalı.");
assert(t3AssessmentById.get("s232-veli-chart")?.content?.sections?.length === 5 &&
  t3AssessmentById.get("s234-q13")?.content?.items?.length === 8 &&
  Object.keys(t3AssessmentById.get("s234-q13")?.answer?.answer_sections ?? {}).length === 8,
  "Orhan Veli tablosu beş tema, Mustafa İnan tablosu sekiz satır içermeli.");
assert(t3AssessmentById.get("s233-q10")?.answer?.answer_sections?.toplam === "13 puan" &&
  t3AssessmentById.get("s233-q11")?.answer?.answer_sections?.dogru_olanlar?.length === 2,
  "Biyografi yarışması puanı ve düzeltilecek kavramlar korunmalı.");
for (const id of ["s234-q14","s234-q15"]) {
  assert(t3AssessmentById.get(id)?.answer?.entry_type === "source_limited",
    `Aile Bağları QR videosu olmadan cevap kesinleştirilmemeli: ${id}`);
}
for (const step of theme3Assessment.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Tema 3 s.230–235 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

assert(theme4Lessons.length === 7,
  "Tema 4 s.236–270 Mimar Sinan ve Merdiven bloklarını içermeli.");
const theme4Intro = lessons.find(lesson => lesson.lesson_id === "T11-T04-GIRIS-236-242");
assert(theme4Intro && theme4Intro.printed_page_range === "236-242" &&
  theme4Intro.coverage.steps === 17 && theme4Intro.coverage.source_records === 9 &&
  theme4Intro.coverage.answer_entries === 7,
  "Tema 4 açılışı s.236–242, 17 ekran / 9 kaynak / 7 cevap içermeli.");
const theme4IntroById = new Map(theme4Intro.steps.map(step => [step.id, step]));
assert(theme4IntroById.size === 17, "Tema 4 giriş ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s238-q1","T04-S0003","T4-P238-Q01"],
  ["s238-q2","T04-S0004","T4-P238-Q02"],
  ["s239-q3","T04-S0005","T4-P239-Q03"],
  ["s239-q4","T04-S0006","T4-P239-PERF01"],
  ["s239-q5","T04-S0007","T4-P239-PERF02"],
  ["s240-performance","T04-S0008","T4-P240-PERF01"],
  ["s241-preview","T04-S0009","T4-P241-PERF01"]
]) {
  assert(theme4IntroById.get(id)?.source?.source_record_id === sourceId &&
    theme4IntroById.get(id)?.answer?.question_id === answerId,
    `Tema 4 giriş kanonik kaynak / cevap eşleşmesi: ${id}`);
}
assert(theme4IntroById.get("s236-map")?.source?.source_record_id === "T04-S0001" &&
  theme4IntroById.get("s237-threshold")?.source?.source_record_id === "T04-S0002" &&
  theme4IntroById.get("s237-threshold")?.answer === null,
  "Tema çerçevesi ve Yunus Emre eşiğinde uydurma soru/cevap olmamalı.");
assert(theme4IntroById.get("s241-core-roles")?.content?.sections?.length === 4 &&
  theme4IntroById.get("s242-optional-roles")?.content?.sections?.length === 5,
  "Okuma çemberi dört temel ve beş seçimlik rolü korumalı.");
assert(theme4IntroById.get("s240-infographic")?.content?.note?.includes("kesin doğum tarihi belirtilmez") &&
  theme4IntroById.get("s240-performance")?.answer?.guidance?.includes("hayalî"),
  "Mimar Sinan bilgi görseli ve hayalî konuşma arasında kaynak ayrımı korunmalı.");
for (const step of theme4Intro.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Tema 4 açılışında doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const mimarReading = lessons.find(lesson => lesson.lesson_id === "T11-T04-BEN-MIMAR-SINAN-OKUMA-243-250");
assert(mimarReading && mimarReading.printed_page_range === "243-250" &&
  mimarReading.coverage.steps === 14 && mimarReading.coverage.source_records === 6 &&
  mimarReading.coverage.answer_entries === 6,
  "Mimar Sinan okuma s.243–250 14 ekran / 6 kaynak / 6 cevap içermeli.");
const mimarReadingById = new Map(mimarReading.steps.map(step => [step.id, step]));
assert(mimarReadingById.size === 14, "Mimar Sinan okuma ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s247-vocab","T04-S0011","T4-P247-VOC01"],
  ["s248-prediction","T04-S0012","T4-P248-PERF01"],
  ["s249-buzz","T04-S0012","T4-P249-PERF01"],
  ["s249-comp-q1","T04-S0013","T4-P249-Q01"],
  ["s249-comp-q2","T04-S0014","T4-P249-Q02"],
  ["s250-social-table","T04-S0015","T4-P250-TABLE01"]
]) {
  assert(mimarReadingById.get(id)?.source?.source_record_id === sourceId &&
    mimarReadingById.get(id)?.answer?.question_id === answerId,
    `Mimar Sinan s.243–250 kanonik kaynak / cevap eşleşmesi: ${id}`);
}
assert(mimarReadingById.get("s247-vocab")?.content?.items?.length === 6 &&
  Object.keys(mimarReadingById.get("s247-vocab")?.answer?.answer_sections ?? {}).length === 6,
  "Mimar Sinan kelime duvarı altı sözcüğü korumalı.");
assert(mimarReadingById.get("s249-comp-q1")?.content?.items?.length === 4 &&
  Object.keys(mimarReadingById.get("s249-comp-q1")?.answer?.answer_sections ?? {}).length === 4,
  "Gerçek hayat / tiyatro karşılaştırması dört ölçütü korumalı.");
assert(mimarReadingById.get("s250-social-table")?.content?.items?.length === 7 &&
  mimarReadingById.get("s250-social-table-rest")?.content?.items?.length === 6 &&
  mimarReadingById.get("s250-social-table-rest")?.answer === null &&
  Object.keys(mimarReadingById.get("s250-social-table")?.answer?.answer_sections ?? {}).length === 13,
  "Sosyal hayat tablosunun on üç ifadesi tek kanonik cevaba bağlı olmalı.");
for (const step of mimarReading.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Mimar Sinan s.243–250 doğrulanmış kaynak: ${step.source.source_record_id}`);
}
assert(theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.steps,0) === 104 &&
  theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.source_records,0) === 55 &&
  theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.answer_entries,0) === 56,
  "Tema 4 s.236–270 toplam 7 ders / 104 ekran / 55 kaynak / 56 cevap olmalı.");

const mimarAnalysis = lessons.find(lesson => lesson.lesson_id === "T11-T04-BEN-MIMAR-SINAN-ANLAMA-251-255");
assert(mimarAnalysis && mimarAnalysis.printed_page_range === "251-255" &&
  mimarAnalysis.coverage.steps === 13 && mimarAnalysis.coverage.source_records === 8 &&
  mimarAnalysis.coverage.answer_entries === 9,
  "Mimar Sinan anlama s.251–255 13 ekran / 8 kaynak / 9 cevap içermeli.");
const mimarAnalysisById = new Map(mimarAnalysis.steps.map(step => [step.id, step]));
assert(mimarAnalysisById.size === 13, "Mimar Sinan anlama ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s251-q1","T04-S0016","T4-P251-Q01"],
  ["s251-q2a","T04-S0017","T4-P251-Q02A"],
  ["s252-q2bc","T04-S0017","T4-P252-PERF02BC"],
  ["s252-q3","T04-S0018","T4-P252-Q03"],
  ["s254-q1","T04-S0019","T4-P254-Q01"],
  ["s254-q2","T04-S0020","T4-P254-Q02"],
  ["s255-q1","T04-S0021","T4-P255-Q01"],
  ["s255-q2","T04-S0022","T4-P255-Q02"],
  ["s255-q3","T04-S0023","T4-P255-PERF03"]
]) {
  assert(mimarAnalysisById.get(id)?.source?.source_record_id === sourceId &&
    mimarAnalysisById.get(id)?.answer?.question_id === answerId,
    `Mimar Sinan s.251–255 kanonik kaynak/cevap eşleşmesi: ${id}`);
}
assert(mimarAnalysisById.get("s251-q2a")?.content?.items?.length === 4 &&
  mimarAnalysisById.get("s252-characters")?.content?.items?.length === 3 &&
  mimarAnalysisById.get("s252-characters")?.answer === null &&
  Object.keys(mimarAnalysisById.get("s251-q2a")?.answer?.answer_sections ?? {}).length === 7,
  "Karakter tablosu yedi satırda ve tek kanonik kayıtta kalmalı.");
assert(mimarAnalysisById.get("s251-q1")?.content?.items?.length === 3 &&
  mimarAnalysisById.get("s254-q1")?.content?.items?.length === 4 &&
  Object.keys(mimarAnalysisById.get("s254-q1")?.answer?.answer_sections ?? {}).length === 4,
  "Konu–amaç–yazar ve Cimri karşılaştırma ölçütleri korunmalı.");
assert(mimarAnalysisById.get("s254-caution")?.answer === null &&
  mimarAnalysisById.get("s255-q2")?.content?.note?.includes("kesinleşmemiş doğum tarihi") &&
  mimarAnalysisById.get("s255-q3")?.answer?.entry_type === "performance_support",
  "Tarihî kaynak sınırı ve dekorun açık uçlu niteliği korunmalı.");
for (const step of mimarAnalysis.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Mimar Sinan anlama doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const mimarStructure = lessons.find(lesson => lesson.lesson_id === "T11-T04-BEN-MIMAR-SINAN-COZUMLEME-256-259");
assert(mimarStructure && mimarStructure.printed_page_range === "256-259" &&
  mimarStructure.coverage.steps === 16 && mimarStructure.coverage.source_records === 7 &&
  mimarStructure.coverage.answer_entries === 7,
  "Mimar Sinan çözümleme s.256–259 16 ekran / 7 kaynak / 7 cevap içermeli.");
const mimarStructureById = new Map(mimarStructure.steps.map(step => [step.id, step]));
assert(mimarStructureById.size === 16, "s.256–259 ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s256-elements","T04-S0024","T4-P256-TABLE01"],
  ["s257-q1","T04-S0025","T4-P257-Q01"],
  ["s258-q2","T04-S0026","T4-P258-Q02"],
  ["s258-q1","T04-S0027","T4-P258-Q01"],
  ["s258-grammar","T04-S0028","T4-P258-GRAM01"],
  ["s259-q1","T04-S0029","T4-P259-Q01"],
  ["s259-q2","T04-S0030","T4-P259-Q02"]
]) {
  assert(mimarStructureById.get(id)?.source?.source_record_id === sourceId &&
    mimarStructureById.get(id)?.answer?.question_id === answerId,
    `Mimar Sinan s.256–259 kaynak/cevap eşleşmesi: ${id}`);
}
assert(mimarStructureById.get("s256-elements")?.content?.items?.length === 5 &&
  mimarStructureById.get("s256-relations")?.content?.items?.length === 4 &&
  mimarStructureById.get("s256-relations")?.answer === null,
  "Yapı unsurları beş alan, ilişkiler dört alan ve tek kanonik cevap olmalı.");
assert(mimarStructureById.get("s257-q1")?.content?.sections?.length === 2 &&
  mimarStructureById.get("s258-q2")?.content?.sections?.length === 2,
  "Monolog ve diyalog örneği ve işlevi ayrı sorularda korunmalı.");
assert(mimarStructureById.get("s258-grammar")?.content?.items?.length === 4 &&
  mimarStructureById.get("s258-grammar-apply")?.content?.items?.length === 6 &&
  mimarStructureById.get("s258-grammar-apply")?.answer === null &&
  Object.keys(mimarStructureById.get("s258-grammar")?.answer?.answer_sections ?? {}).length === 6,
  "Dil bilgisi tablosunda altı cümle ve dört sınıflandırma sütunu korunmalı.");
for (const step of mimarStructure.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Mimar Sinan s.256–259 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const mimarValues = lessons.find(lesson => lesson.lesson_id === "T11-T04-BEN-MIMAR-SINAN-DEGERLER-260-262");
assert(mimarValues && mimarValues.printed_page_range === "260-262" &&
  mimarValues.coverage.steps === 18 && mimarValues.coverage.source_records === 9 &&
  mimarValues.coverage.answer_entries === 10,
  "Mimar Sinan değerler s.260–262 18 ekran / 9 kaynak / 10 cevap içermeli.");
const mimarValuesById = new Map(mimarValues.steps.map(step => [step.id, step]));
assert(mimarValuesById.size === 18, "Mimar Sinan değerler ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s260-q1","T04-S0031","T4-P260-Q01"],
  ["s260-q2","T04-S0032","T4-P260-Q02"],
  ["s260-q3","T04-S0033","T4-P260-PERF03"],
  ["s260-q4","T04-S0034","T4-P260-Q04"],
  ["s260-groups","T04-S0035","T4-P260-PERF01"],
  ["s261-conflicts","T04-S0036","T4-P261-Q01"],
  ["s262-assessment","T04-S0037","T4-P262-PERF01"],
  ["s262-who","T04-S0037","T4-P262-PERF02"],
  ["s262-q1","T04-S0038","T4-P262-PERFQ01"],
  ["s262-q2","T04-S0039","T4-P262-PERFQ02"]
]) {
  assert(mimarValuesById.get(id)?.source?.source_record_id === sourceId &&
    mimarValuesById.get(id)?.answer?.question_id === answerId,
    `Mimar Sinan s.260–262 kanonik bağlantı: ${id}`);
}
assert(mimarValuesById.get("s260-q1")?.content?.items?.length === 3 &&
  Object.keys(mimarValuesById.get("s260-q1")?.answer?.answer_sections ?? {}).length === 3 &&
  mimarValuesById.get("s260-groups")?.content?.items?.length === 3,
  "Üç değer grubu ve üç disiplin araştırması korunmalı.");
assert(mimarValuesById.get("s261-conflicts")?.content?.items?.length === 5 &&
  mimarValuesById.get("s262-assessment")?.answer?.entry_type === "performance_support" &&
  mimarValuesById.get("s262-who")?.answer?.entry_type === "performance_support",
  "Beş çatışma ve açık uçlu değerlendirme/kimlik oyunu korunmalı.");
assert(mimarValuesById.get("s262-q1")?.answer?.entry_type === "performance_support" &&
  mimarValuesById.get("s262-q2")?.answer?.explanation?.includes("hayalî"),
  "Seçilen rol ve gündelik hayat senaryosu kanonik tarihî olay gibi sunulmamalı.");
for (const step of mimarValues.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Mimar Sinan s.260–262 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const merdivenIntro = lessons.find(lesson => lesson.lesson_id === "T11-T04-MERDIVEN-GIRIS-263-265");
assert(merdivenIntro && merdivenIntro.printed_page_range === "263-265" &&
  merdivenIntro.coverage.steps === 9 && merdivenIntro.coverage.source_records === 3 &&
  merdivenIntro.coverage.answer_entries === 2,
  "Merdiven giriş s.263–265 9 ekran / 3 kaynak / 2 cevap içermeli.");
const merdivenIntroById = new Map(merdivenIntro.steps.map(step => [step.id, step]));
assert(merdivenIntroById.size === 9,
  "Merdiven ön okuma ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s263-q","T04-S0040","T4-P263-PERF01"],
  ["s264-aim","T04-S0042","T4-P264-PERF01"]
]) {
  assert(merdivenIntroById.get(id)?.source?.source_record_id === sourceId &&
    merdivenIntroById.get(id)?.answer?.question_id === answerId,
    `Merdiven ön okuma kanonik bağlantı: ${id}`);
}
assert(merdivenIntroById.get("s264-short-story")?.source?.source_record_id === "T04-S0041" &&
  merdivenIntroById.get("s264-short-story")?.answer === null &&
  merdivenIntroById.get("s265-read")?.source?.source_record_id === "T04-S0042",
  "Küçürek hikâye Bilgi Köşesi ve ana metin kitap referansı olarak kalmalı.");
for (const step of merdivenIntro.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Merdiven s.263–265 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const merdivenAnalysis = lessons.find(lesson => lesson.lesson_id === "T11-T04-MERDIVEN-ANLAMA-266-270");
assert(merdivenAnalysis && merdivenAnalysis.printed_page_range === "266-270" &&
  merdivenAnalysis.coverage.steps === 17 &&
  merdivenAnalysis.coverage.source_records === 13 &&
  merdivenAnalysis.coverage.answer_entries === 15,
  "Merdiven anlama s.266–270 17 ekran / 13 kaynak / 15 cevap içermeli.");
const merdivenById = new Map(merdivenAnalysis.steps.map(step => [step.id, step]));
assert(merdivenById.size === 17, "Merdiven anlama ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s266-vocabulary","T04-S0043","T4-P266-VOC01"],
  ["s267-q4","T04-S0043","T4-P267-VOC02"],
  ["s268-q5","T04-S0043","T4-P268-VOC03"],
  ["s268-q1","T04-S0044","T4-P268-Q01"],
  ["s268-q2","T04-S0045","T4-P268-Q02"],
  ["s268-q3","T04-S0046","T4-P268-Q03"],
  ["s269-q1","T04-S0047","T4-P269-Q01"],
  ["s269-q2","T04-S0048","T4-P269-Q02"],
  ["s269-q3","T04-S0049","T4-P269-Q03"],
  ["s269-q4","T04-S0050","T4-P269-Q04"],
  ["s269-q5","T04-S0051","T4-P269-Q05"],
  ["s269-q6","T04-S0052","T4-P269-Q06"],
  ["s269-q7","T04-S0053","T4-P269-Q07"],
  ["s270-q8","T04-S0054","T4-P270-Q08"],
  ["s270-work","T04-S0055","T4-P270-WORK01"]
]) {
  assert(merdivenById.get(id)?.source?.source_record_id === sourceId &&
    merdivenById.get(id)?.answer?.question_id === answerId,
    `Merdiven s.266–270 kanonik bağlantı: ${id}`);
}
assert(merdivenById.get("s266-vocabulary")?.content?.items?.length === 6 &&
  Object.keys(merdivenById.get("s266-vocabulary")?.answer?.answer_sections ?? {}).length === 6 &&
  Object.keys(merdivenById.get("s267-q4")?.answer?.answer_sections ?? {}).length === 1 &&
  Object.keys(merdivenById.get("s268-q5")?.answer?.answer_sections ?? {}).length === 2,
  "Altı kelime ile Söz Varlığımız 4–5 üç ayrı cevap bölümü korunmalı.");
assert(merdivenById.get("s268-q5")?.answer?.question_id === "T4-P268-VOC03" &&
  merdivenById.get("s269-q7")?.content?.items?.length === 5 &&
  merdivenById.get("s270-work")?.content?.items?.length === 6 &&
  Object.keys(merdivenById.get("s270-work")?.answer?.answer_sections ?? {}).length === 6,
  "Çağrışım süreci ve altı başlıklı Merdiven çalışma kâğıdı korunmalı.");
for (const step of merdivenAnalysis.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Merdiven s.266–270 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const byLessonId = new Map(lessons.map((lesson) => [lesson.lesson_id, lesson]));
assert(
  byLessonId.size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_id olmamalı."
);
assert(
  new Set(lessons.map((lesson) => lesson.lesson_slug)).size === lessons.length,
  "Lesson catalog içinde yinelenen lesson_slug olmamalı."
);

const theme3Intro = byLessonId.get("T11-T03-GIRIS");
assert(theme3Intro, "3. Tema giriş dersi catalog içinde bulunamadı.");
assert(
  theme3Intro.printed_page_range === "160-163" &&
  theme3Intro.coverage.steps === 8 &&
  theme3Intro.coverage.source_records === 7 &&
  theme3Intro.coverage.answer_entries === 6,
  "Tema 3 girişi 8 adım / 7 source / 6 answer içermeli."
);
const theme3IntroById = new Map(theme3Intro.steps.map(step => [step.id, step]));
assert(
  theme3IntroById.get("s160-overview")?.answer === null &&
  theme3IntroById.get("s161-theme-presentation")?.answer === null &&
  theme3IntroById.get("s160-overview")?.layout === "reference",
  "s.160–161 kaynak açılışı soru gibi cevaplanmamalı."
);
assert(
  theme3IntroById.get("s162-q1")?.answer?.question_id === "T3-P162-Q01" &&
  theme3IntroById.get("s162-q4")?.answer?.question_id === "T3-P162-Q04" &&
  theme3IntroById.get("s163-q5")?.answer?.question_id === "T3-P163-Q05" &&
  theme3IntroById.get("s163-q6")?.answer?.question_id === "T3-P163-Q06",
  "s.162 dört ve s.163 iki sorunun kanonik cevapları bulunmalı."
);
assert(
  theme3IntroById.get("s163-q5")?.content?.sections?.length === 2 &&
  theme3IntroById.get("s163-q6")?.layout === "comparison" &&
  Object.keys(theme3IntroById.get("s163-q6")?.answer?.answer_sections ?? {}).length === 2,
  "Radyo/mülakat ve biyografi/tezkire karşılaştırmaları ayrı, yapılandırılmış olmalı."
);
for(const step of theme3Intro.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Tema 3 giriş source kaydı VERIFIED olmalı: ${step.source.source_record_id}`);
}


const huzurReading = byLessonId.get("T11-T03-HUZUR-OKUMA");
assert(huzurReading && huzurReading.printed_page_range === "164-174",
  "Huzur okuma s.164–174 doğal bloğu bulunmalı.");
assert(huzurReading.coverage.steps === 23 &&
  huzurReading.coverage.source_records === 8 &&
  huzurReading.coverage.answer_entries === 10,
  "Huzur okuma 23 adım / 8 source / 10 answer kapsamını korumalı.");
const huzurById = new Map(huzurReading.steps.map(step => [step.id, step]));
for(const [id, qid] of [
  ["s164-q1","T3-P164-Q01"],["s164-q2","T3-P164-Q02"],["s164-q3","T3-P164-Q03"],
  ["s165-research","T3-P165-PERF01"],["s165-166-fark","T3-P165-PERF02"],
  ["s166-predict","T3-P166-PERF01"],["s166-read-method","T3-P166-PERF02"],
  ["s172-vocabulary","T3-P172-VOC01"],["s172-other","T3-P172-PERF01"],
  ["s174-style","T3-P174-PERF01"]
]) {
  assert(huzurById.get(id)?.answer?.question_id === qid,
    `Huzur kanonik answer bağlantısı eksik: ${id}`);
}
assert(huzurById.get("s165-guess")?.answer === null &&
  huzurById.get("s165-share")?.answer === null &&
  huzurById.get("s165-research")?.answer?.entry_type === "performance_support",
  "İlk tahmin ile sonradan doğrulanan bilgi ayrı tutulmalı.");
assert(Object.keys(huzurById.get("s165-166-fark")?.answer?.answer_sections ?? {}).length === 6 &&
  huzurById.get("s165-166-fark")?.content?.items?.length === 6 &&
  huzurById.get("s165-166-fark")?.answer?.answer_sections?.saz?.length === 2,
  "Fark Edelim altı kelimenin iki farklı bağlamını korumalı.");
assert(huzurById.get("s166-wall")?.answer === null &&
  huzurById.get("s166-predict")?.answer?.entry_type === "performance_support",
  "Cümle duvarı ve kelime tahmininde tek-doğru cevap dayatılmamalı.");
for(const id of ["s167-reading","s168-reading","s169-reading","s170-reading","s171-author"]) {
  assert(huzurById.get(id)?.answer === null &&
    huzurById.get(id)?.source?.source_record_id === "T03-S0013",
    `Huzur metni telifli okumayı tekrar yayımlamadan işlenmeli: ${id}`);
}
assert(huzurById.get("s172-vocabulary")?.layout === "vocabulary" &&
  Object.keys(huzurById.get("s172-vocabulary")?.answer?.answer_sections ?? {}).length === 9 &&
  huzurById.get("s172-vocabulary")?.content?.items == null,
  "Söz Varlığımız dokuz kelimeyi eksiksiz kapsamalı.");
assert(huzurById.get("s172-other")?.answer?.entry_type === "performance_support",
  "Öğrencinin bilmediği kelimelere sabit liste dayatılmamalı.");
for(const id of ["s173-types-1","s173-types-2","s174-types-1","s174-types-2"]) {
  assert(huzurById.get(id)?.answer === null &&
    huzurById.get(id)?.source?.printed_page_range === "173-174",
    `Roman türleri s.173-174 gerçek kaynak aralığıyla sunulmalı: ${id}`);
}
assert(huzurById.get("s174-style")?.answer?.entry_type === "performance_support" &&
  Object.keys(huzurById.get("s174-style")?.answer?.answer_sections ?? {}).length === 6,
  "Huzur üslup kavram haritası korunmalı.");
for(const step of huzurReading.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Huzur source VERIFIED olmalı: ${step.source.source_record_id}`);
}
assert(theme3Lessons.reduce((sum,l)=>sum+l.coverage.steps,0)===310 &&
  theme3Lessons.reduce((sum,l)=>sum+l.coverage.source_records,0)===147 &&
  theme3Lessons.reduce((sum,l)=>sum+l.coverage.answer_entries,0)===147,
  "Tema 3 mevcut kapsamı 310 adım / 147 source / 147 answer olmalı.");


const huzurQuestions = byLessonId.get("T11-T03-HUZUR-ANLAMA-175-176");
assert(huzurQuestions && huzurQuestions.printed_page_range === "175-176",
  "Huzur Metni Anlayalım s.175–176 bulunmalı.");
assert(huzurQuestions.coverage.steps === 13 &&
  huzurQuestions.coverage.source_records === 13 &&
  huzurQuestions.coverage.answer_entries === 13,
  "Huzur Metni Anlayalım 13 ayrı soru / source / answer içermeli.");
const huzurQuestionMap = new Map(huzurQuestions.steps.map(s => [s.id,s]));
assert(huzurQuestionMap.size === 13, "Huzur Metni Anlayalım step id tekil olmalı.");
for(let n=1;n<=13;n++) {
  const page = n<=2 ? 175 : 176;
  const id = `s${page}-q${n}`;
  const s = huzurQuestionMap.get(id);
  const qid = n===12 ? "T3-P176-PERF12" :
    `T3-P${page}-Q${String(n).padStart(2,"0")}`;
  assert(s?.answer?.question_id === qid, `Huzur s.175–176 cevap eşleşmesi: ${id}`);
  assert(s?.source?.source_record_id ===
    `T03-S${String(n+15).padStart(4,"0")}`,
    `Huzur s.175–176 kaynak eşleşmesi: ${id}`);
  assert(s.source.source_status === "VERIFIED",
    `Huzur s.175–176 source VERIFIED olmalı: ${id}`);
}
assert(huzurQuestionMap.get("s175-q1")?.answer?.entry_type === "performance_support" &&
  huzurQuestionMap.get("s175-q1")?.answer?.guidance?.includes("gerçek tahmini"),
  "s.175 Q1 öğrencinin gerçek önceki tahminiyle çalışmalı.");
assert(huzurQuestionMap.get("s175-q2")?.layout === "structure" &&
  Object.keys(huzurQuestionMap.get("s175-q2")?.answer?.answer_sections??{}).length===3,
  "s.175 Q2 konu/tema/yazılış amacı üçlü tablosunu korumalı.");
assert(huzurQuestionMap.get("s176-q6")?.answer?.entry_type === "performance_support" &&
  huzurQuestionMap.get("s176-q6")?.content?.items?.length===3,
  "s.176 Q6 şehir örneği kişisel performans olarak kalmalı.");
assert(huzurQuestionMap.get("s176-q10")?.answer?.explanation?.includes("sözü Mümtaz'a atfeder"),
  "s.176 Q10 ders kitabı soru/metin konuşmacı atıf farkı gizlenmemeli.");
assert(huzurQuestionMap.get("s176-q12")?.answer?.entry_type === "performance_support" &&
  huzurQuestionMap.get("s176-q12")?.content?.lead?.includes("Kitapta özel eser adları"),
  "s.176 Q12 kitapta verilmeyen tarihî müzik adlarını kanonik metin gibi sunmamalı.");
assert(theme3Lessons.reduce((s,l)=>s+l.coverage.steps,0) === 310 &&
  theme3Lessons.reduce((s,l)=>s+l.coverage.source_records,0) === 147 &&
  theme3Lessons.reduce((s,l)=>s+l.coverage.answer_entries,0) === 147,
  "Tema 3 mevcut kapsamı 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const huzur177 = byLessonId.get("T11-T03-HUZUR-177-178");
assert(huzur177 && huzur177.printed_page_range === "177-178",
  "Huzur s.177–178 doğal blok bulunmalı.");
assert(huzur177.coverage.steps === 11 &&
  huzur177.coverage.source_records === 3 &&
  huzur177.coverage.answer_entries === 3,
  "Huzur s.177–178 11 ekran / 3 source / 3 answer içermeli.");
const huzur177ById = new Map(huzur177.steps.map(step => [step.id, step]));
assert(huzur177ById.size === 11, "Huzur s.177–178 benzersiz 11 ekran içermeli.");
assert(huzur177ById.get("s177-q14")?.answer?.question_id === "T3-P177-Q14" &&
  huzur177ById.get("s177-q14")?.source?.source_record_id === "T03-S0029" &&
  Object.keys(huzur177ById.get("s177-q14")?.answer?.answer_sections ?? {}).length === 2 &&
  huzur177ById.get("s177-q14")?.answer?.answer_sections?.acik_iletiler?.length===3 &&
  huzur177ById.get("s177-q14")?.answer?.answer_sections?.ortuk_iletiler?.length===3,
  "s.177 14. soruda açık/örtük iletiler ayrıştırılmalı.");
assert(huzur177ById.get("s177-source-photo")?.answer === null &&
  huzur177ById.get("s177-source-photo")?.content?.lead?.includes("ikinci yazılı metin görünmüyor"),
  "Mescid-i Aksa fotoğrafı yazılı metinmiş gibi sunulmamalı.");
assert(huzur177ById.get("s178-compare-task")?.answer?.question_id === "T3-P177-COMP01" &&
  huzur177ById.get("s178-compare-task")?.answer?.entry_type === "source_limited" &&
  Object.keys(huzur177ById.get("s178-compare-task")?.answer?.answer_sections ?? {}).length === 8,
  "Huzur yedi ölçütü çözülmeli, görünmeyen ikinci metin source_limited kalmalı.");
for(const id of ["s178-huzur-content","s178-huzur-context","s178-huzur-message"]){
  assert(huzur177ById.get(id)?.answer === null &&
    huzur177ById.get(id)?.source?.source_record_id === "T03-S0030",
    `Huzur karşılaştırma ölçütleri yalnız kaynak destekli olmalı: ${id}`);
}
assert(huzur177ById.get("s178-circle-plan")?.answer?.question_id === "T3-P178-PERF01" &&
  huzur177ById.get("s178-circle-plan")?.answer?.entry_type === "performance_support" &&
  Object.keys(huzur177ById.get("s178-circle-plan")?.answer?.answer_sections ?? {}).length===9,
  "Okuma çemberi rol desteği tek doğru cevap olmadan mevcut olmalı.");
for(const id of ["s178-role-link","s178-role-visual","s178-role-inquiry","s178-role-highlight"]){
  assert(huzur177ById.get(id)?.answer===null &&
    huzur177ById.get(id)?.source?.source_record_id==="T03-S0031",
    `s.178 dört temel okuma çemberi rolü ayrı açıklanmalı: ${id}`);
}
for(const step of huzur177.steps){
  assert(step.source.source_status==="VERIFIED",
    `s.177–178 kaynak VERIFIED olmalı: ${step.source.source_record_id}`);
}


const huzur179 = byLessonId.get("T11-T03-HUZUR-OKUMA-CEMBERI-179-181");
assert(huzur179 && huzur179.printed_page_range === "179-181",
  "Huzur Okuma Çemberi s.179–181 doğal bloğu olmalı.");
assert(huzur179.coverage.steps === 17 &&
  huzur179.coverage.source_records === 2 &&
  huzur179.coverage.answer_entries === 2,
  "Huzur Okuma Çemberi 17 adım / 2 source / 2 answer içermeli.");
const huzur179ById = new Map(huzur179.steps.map(s => [s.id, s]));
assert(huzur179ById.size === 17, "s.179–181 bütün ekran kimlikleri tekil olmalı.");
for(const id of ["s179-summary","s179-words","s179-predict","s179-place","s179-character"]){
  assert(huzur179ById.get(id)?.source?.source_record_id === "T03-S0031" &&
    huzur179ById.get(id)?.answer === null,
    `Kitaptaki beş seçimlik rol ayrı ve kanonik kaynaklı olmalı: ${id}`);
}
assert(huzur179ById.get("s179-roles-intro")?.content?.items?.length === 5 &&
  huzur179ById.get("s179-predict")?.content?.sections?.length === 3,
  "Beş seçimlik rolde Tahmin Edici kaybolmamalı ve tahmin-gerçek ayrımı korunmalı.");
assert(huzur179ById.get("s179-roles-change")?.answer === null &&
  huzur179ById.get("s179-roles-change")?.source?.source_record_id === "T03-S0031",
  "Rol değişimi tek doğru cevap gerektirmeyen süreç olarak kalmalı.");
const t180 = huzur179ById.get("s180-table-q3");
assert(t180?.answer?.question_id === "T3-P180-TABLE01" &&
  t180?.answer?.entry_type === "source_limited" &&
  Object.keys(t180?.answer?.answer_sections??{}).length === 6 &&
  Object.keys(t180?.answer?.answer_sections?.Mümtaz??{}).length === 2 &&
  t180?.answer?.answer_sections?.Suat?.cikarim?.includes("uydurulmaz"),
  "s.180 altı kişide söz/davranış ve çıkarım ayrılmalı, eksik kaynak uydurulmamalı.");
const t181 = huzur179ById.get("s181-table-q4");
assert(t181?.answer?.question_id === "T3-P181-TABLE02" &&
  t181?.answer?.entry_type === "source_limited" &&
  Object.keys(t181?.answer?.answer_sections??{}).length === 6 &&
  t181?.answer?.answer_sections?.İhsan?.dil?.includes("doğrudan konuşması") &&
  t181?.answer?.answer_sections?.Macide?.dil?.includes("konuşma örneği"),
  "s.181 altı kişide kişilik/dil ayrı; konuşması olmayanlara üslup uydurulmamalı.");
for(const id of ["s180-mumtaz-nuran","s180-ihsan-macide","s180-suat-fahir",
  "s181-mumtaz-nuran","s181-other-people"]){
  assert(huzur179ById.get(id)?.answer === null &&
    huzur179ById.get(id)?.source?.source_record_id === "T03-S0032",
    `s.180–181 kişi incelemesi doğru kaynakla ilgili olmalı: ${id}`);
}
const firsts = ["s181-firsts-1","s181-firsts-2"].map(id=>huzur179ById.get(id));
assert(firsts.every(s=>s?.source?.source_record_id==="T03-S0032" && s.answer===null) &&
  firsts.reduce((n,s)=>n+(s.content?.items?.length??0),0)===12 &&
  firsts[1].content.items.some(x=>x.includes("Zehra")&&x.includes("natüralist")) &&
  firsts[1].content.items.some(x=>x.includes("Yeniçeriler")&&x.includes("denemesi")),
  "s.181 Bilgi Köşesi 12 ilk ve ayrı deneme etiketlerini korumalı.");
assert(huzur179ById.get("s181-game-qr")?.answer === null &&
  huzur179ById.get("s181-game-qr")?.content?.lead?.includes("Oyunun içeriği sayfada yazılı değildir"),
  "s.181 QR oyunun görülmeyen içeriği icat edilmemeli.");
for(const step of huzur179.steps){
  assert(step.source.source_status === "VERIFIED",
    `s.179–181 kaynak kaydı VERIFIED olmalı: ${step.source.source_record_id}`);
}


const huzur182 = byLessonId.get("T11-T03-HUZUR-HAYAT-KURMACA-182-185");
assert(huzur182?.printed_page_range === "182-185" &&
  huzur182.coverage.steps === 18 &&
  huzur182.coverage.source_records === 5 &&
  huzur182.coverage.answer_entries === 5,
  "Huzur s.182–185: 18 ders adımı, beş VERIFIED source, beş answer olmalı.");
const huzur182ById = new Map(huzur182.steps.map(step => [step.id,step]));
assert(huzur182ById.size === 18, "Huzur s.182–185 benzersiz adımlara sahip olmalı.");
for(const [id,sourceId,answerId] of [
 ["s182-fish","T03-S0033","T3-P182-Q01"],
 ["s182-author","T03-S0034","T3-P182-Q02"],
 ["s183-contribution","T03-S0035","T3-P183-Q02"],
 ["s183-subject-object","T03-S0036","T3-P183-Q01"],
 ["s184-185-value-q2","T03-S0037","T3-P184-Q02"]
]){
 const step=huzur182ById.get(id);
 assert(step?.source?.source_record_id === sourceId &&
   step?.answer?.question_id === answerId &&
   step?.source?.source_status === "VERIFIED",
   `Huzur s.182–185 kaynak-cevap eşleşmesi: ${id}`);
}
assert(huzur182ById.get("s182-fish")?.source?.book_heading?.includes("Sıra Sizde") &&
 huzur182ById.get("s182-author")?.source?.book_heading?.includes("Fark Edelim") &&
 huzur182ById.get("s182-fish")?.answer?.question_no==="Sıra Sizde 1" &&
 huzur182ById.get("s182-author")?.answer?.question_no==="Fark Edelim",
 "s.182 kitaptaki başlıkların yeri korunmalı; balık kılçığı Sıra Sizde, yazar-eser Fark Edelim.");
assert(huzur182ById.get("s182-fish")?.answer?.answer_sections?.gercek_hayattan_alinanlar?.length===4 &&
 huzur182ById.get("s182-fish")?.answer?.answer_sections?.kurgusal_unsurlar?.length===3,
 "Gerçek yaşam ve kurmaca diyagramında iki ayrı cevap grubu olmalı.");
assert(huzur182ById.get("s183-subject-object")?.answer?.answer_sections?.gozlenebilir_olay_ve_davranis?.length===2 &&
 huzur182ById.get("s183-subject-object")?.answer?.answer_sections?.oznel_duygu_ve_degerlendirme?.length===2 &&
 huzur182ById.get("s183-subject-object")?.answer?.guidance?.includes("s.185"),
 "s.183 öznel-nesnel örnekleri yanlışlıkla s.185'ten alınmamalı.");
const value=huzur182ById.get("s184-185-value-q2");
assert(Object.keys(value?.answer?.answer_sections??{}).length===4 &&
 value.answer.answer_sections["3 · Nuran, serçeler ve köpek"]?.toplumsal_gucluk?.includes("verilmez") &&
 value.content.items.length===4,
 "s.184–185 dört renkli kaynak parçasının ayrı yanıtı olmalı; olmayan güçlük icat edilmemeli.");
for(const id of ["s184-halk","s184-new-life","s185-animals","s185-illness"]){
 assert(huzur182ById.get(id)?.answer===null &&
  huzur182ById.get(id)?.source?.source_record_id==="T03-S0037",
  `Duyarlılık alt parçası tek cevap bankası kaydında olmalı: ${id}`);
}
assert(theme3Lessons.reduce((sum,lesson)=>sum+lesson.coverage.steps,0)===310 &&
 theme3Lessons.reduce((sum,lesson)=>sum+lesson.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((sum,lesson)=>sum+lesson.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const huzur186 = byLessonId.get("T11-T03-HUZUR-YAPI-USLUP-186-188");
assert(huzur186?.printed_page_range === "186-188" &&
  huzur186.coverage.steps === 21 &&
  huzur186.coverage.source_records === 8 &&
  huzur186.coverage.answer_entries === 8,
  "Huzur s.186–188: 21 step / 8 source / 8 answer olmalı.");
const huzur186ById = new Map(huzur186.steps.map(s => [s.id,s]));
assert(huzur186ById.size === 21, "s.186–188 step id tekil olmalı.");
for(const [id,source,answer] of [
 ["s186-voice-choice","T03-S0038","T3-P186-PERF01"],
 ["s186-structure","T03-S0039","T3-P186-Q01"],
 ["s187-four","T03-S0040","T3-P187-Q02"],
 ["s187-3a","T03-S0041","T3-P187-Q03A"],
 ["s188-3b","T03-S0042","T3-P188-Q03B"],
 ["s188-3c","T03-S0043","T3-P188-Q03C"],
 ["s188-3cc","T03-S0044","T3-P188-Q03CC"],
 ["s188-q4","T03-S0045","T3-P188-Q04"]
]){
 const step=huzur186ById.get(id);
 assert(step?.source?.source_record_id === source &&
   step?.answer?.question_id === answer &&
   step?.source?.source_status==="VERIFIED",
   `Huzur yapı/üslup source-answer bağlantısı: ${id}`);
}
assert(huzur186ById.get("s186-voice-choice")?.answer?.entry_type === "performance_support" &&
 Object.keys(huzur186ById.get("s186-voice-choice")?.answer?.answer_sections??{}).length===4,
 "s.186 kişisel dil karşılaştırması dört bölümden oluşmalı.");
for(const id of ["s186-event","s186-place","s186-people","s186-time"]){
 assert(huzur186ById.get(id)?.answer===null &&
  huzur186ById.get(id)?.source?.source_record_id==="T03-S0039",
  `Dört yapı unsuru bağımsız kaynak adımı olmalı: ${id}`);
}
assert(Object.keys(huzur186ById.get("s186-structure")?.answer?.answer_sections??{}).length===4 &&
 huzur186ById.get("s186-structure")?.answer?.explanation?.includes("tüm romanın"),
 "Yapı unsurları s.167–170 ve yardımcı parçalarla sınırlı kalmalı.");
assert(Object.keys(huzur186ById.get("s187-four")?.answer?.answer_sections??{}).length===4 &&
 huzur186ById.get("s187-four")?.content?.items?.length===4,
 "s.187 dört üslup/yapı başlığı ayrı olmalı.");
for(const id of ["s187-event-style","s187-person-style","s187-place-style","s187-time-style"]){
 assert(huzur186ById.get(id)?.answer===null &&
 huzur186ById.get(id)?.source?.source_record_id==="T03-S0040",
 `s.187 ilişki ekranı kaynaklı olmalı: ${id}`);
}
assert(huzur186ById.get("s188-3c")?.answer?.answer?.includes("s.171") &&
 huzur186ById.get("s188-3cc")?.answer?.answer?.includes("Mazi"),
 "Dönem ve söz varlığı soruları ayrı, kitaba dayalı olmalı.");
const character4 = huzur186ById.get("s188-q4");
assert(character4?.answer?.entry_type==="source_limited" &&
 character4.content.items.length===4 &&
 Object.keys(character4.answer.answer_sections??{}).length===4 &&
 character4.answer.answer_sections.Suat.amac.includes("belirlenemez") &&
 character4.answer.answer_sections.Nuran.amac.includes("çıkarım"),
 "s.188 dört kişi/özellik/amaç cevaplarında Suat sınırı ve çıkarım statüsü açık olmalı.");
for(const id of ["s188-mumtaz","s188-nuran","s188-ihsan","s188-suat"]){
 assert(huzur186ById.get(id)?.answer===null &&
  huzur186ById.get(id)?.source?.source_record_id==="T03-S0045",
 `s.188 kişi satırı doğru kaynağa bağlı olmalı: ${id}`);
}
assert(theme3Lessons.reduce((sum,l)=>sum+l.coverage.steps,0)===310 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const huzur189 = byLessonId.get("T11-T03-HUZUR-CATISMA-DIL-189-191");
assert(huzur189?.printed_page_range==="189-191" &&
 huzur189.coverage.steps===22 &&
 huzur189.coverage.source_records===6 &&
 huzur189.coverage.answer_entries===6,
 "Huzur s.189–191 22 step / 6 source / 6 answer içermeli.");
const huzur189ById = new Map(huzur189.steps.map(s=>[s.id,s]));
assert(huzur189ById.size===22,"Huzur s.189–191 benzersiz 22 step olmalı.");
for(const [id,source,answer] of [
 ["s189-think","T03-S0046","T3-P189-PERF01"],
 ["s190-compare","T03-S0047","T3-P190-Q01"],
 ["s190-191-grammar","T03-S0048","T3-P190-GRAM01"],
 ["s191-build","T03-S0049","T3-P191-GRAM02"],
 ["s191-spell","T03-S0050","T3-P191-GRAM03"],
 ["s191-research","T03-S0051","T3-P191-PERF01"]
]){
 const step=huzur189ById.get(id);
 assert(step?.source?.source_record_id===source &&
  step?.answer?.question_id===answer &&
  step?.source?.source_status==="VERIFIED",
 `s.189–191 source-answer eşleşmesi ${id}`);
}
const conflict189=huzur189ById.get("s189-think");
assert(conflict189?.answer?.entry_type==="performance_support" &&
 Object.keys(conflict189.answer.answer_sections??{}).length===4 &&
 conflict189.answer.answer_sections["3 · İhsan ve Macide ile tanışma"]?.catisma?.includes("nişanlı") &&
 conflict189.answer.answer_sections["Üç aşamalı sınıf çalışması"]?.esles?.includes("anlatıcı"),
 "s.189 üç parça ve DÜŞÜN–EŞLEŞ–PAYLAŞ yapısı korunmalı.");
for(const id of ["s189-one","s189-two","s189-three","s189-pair","s189-share"]){
 assert(huzur189ById.get(id)?.answer===null &&
  huzur189ById.get(id)?.source?.source_record_id==="T03-S0046",
 `s.189 alt ekranda tek kaynak kullanılsın: ${id}`);
}
const gram189=huzur189ById.get("s190-191-grammar");
assert(gram189.content.items.length===7 &&
 Object.keys(gram189.answer.answer_sections??{}).length===7 &&
 gram189.answer.answer_sections.b.ikinci_yargi.includes("eksiltili") &&
 gram189.answer.answer_sections.d.zaman_zarfi.includes("bütün zaman grubu"),
 "s.190–191 a/b/c/ç/d/e/f yedi cümle; b ve d çözümlemesi korunmalı.");
for(const id of ["s190-gram-a","s190-gram-b","s190-gram-c","s190-gram-cc",
 "s190-gram-d","s191-gram-e","s191-gram-f"]){
 assert(huzur189ById.get(id)?.answer===null &&
 huzur189ById.get(id)?.source?.source_record_id==="T03-S0048",
 `s.190–191 cümle alt ekranı doğru kaynağa bağlanmalı: ${id}`);
}
assert(Object.keys(huzur189ById.get("s191-spell")?.answer?.answer_sections??{}).length===4 &&
 huzur189ById.get("s191-spell")?.answer?.explanation?.includes("şikâyet") &&
 huzur189ById.get("s191-research")?.answer?.entry_type==="performance_support" &&
 huzur189ById.get("s191-research")?.content?.items?.length===3 &&
 huzur189ById.get("s191-research")?.answer?.answer?.includes("1 haftalık"),
 "s.191 dört yazım, şapka sınırı ve üç disiplinli 1 haftalık araştırma korunmalı.");
assert(theme3Lessons.reduce((sum,l)=>sum+l.coverage.steps,0)===310 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const huzur192 = byLessonId.get("T11-T03-HUZUR-DEGERLENDIRME-192-193");
assert(huzur192?.printed_page_range==="192-193" &&
 huzur192.coverage.steps===14 &&
 huzur192.coverage.source_records===4 &&
 huzur192.coverage.answer_entries===5,
 "Huzur s.192–193 14 adım / 4 source / 5 answer olmalı.");
const h192 = new Map(huzur192.steps.map(s=>[s.id,s]));
assert(h192.size===14,"Huzur s.192–193 benzersiz adımlar olmalı.");
for(const [id,source,answer] of [
 ["s192-worksheet","T03-S0052","T3-P192-WORKSHEET"],
 ["s192-personal","T03-S0052","T3-P192-Q01"],
 ["s193-criteria","T03-S0053","T3-P193-PERF01"],
 ["s193-voice","T03-S0054","T3-P193-PERF02"],
 ["s193-exit","T03-S0055","T3-P193-PERF03"]
]){
 const step=h192.get(id);
 assert(step?.source?.source_record_id===source &&
 step?.answer?.question_id===answer &&
 step?.source?.source_status==="VERIFIED",
 `Huzur s.192–193 source-answer eşleşmesi: ${id}`);
}
assert(Object.keys(h192.get("s192-worksheet")?.answer?.answer_sections??{}).length===5 &&
 h192.get("s192-worksheet")?.content?.items?.length===5 &&
 h192.get("s192-personal")?.answer?.entry_type==="performance_support" &&
 Object.keys(h192.get("s192-personal")?.answer?.answer_sections??{}).length===3,
 "s.192 çalışma kâğıdının 5 satırı alttaki kişisel beğeni sorusundan ayrı olmalı.");
for(const id of ["s192-style","s192-period","s192-society","s192-structure","s192-values"]){
 assert(h192.get(id)?.answer===null && h192.get(id)?.source?.source_record_id==="T03-S0052",
 `Çalışma kâğıdının her başlığı aynı kaynakta: ${id}`);
}
assert(Object.keys(h192.get("s193-criteria")?.answer?.answer_sections??{}).length===6 &&
 h192.get("s193-criteria")?.answer?.answer_sections?.["Tutarlılık (kitabın örneği)"]?.
 includes("konu bütünlüğü") &&
 h192.get("s193-criteria")?.answer?.guidance?.includes("diğer beş ölçüt"),
 "s.193 6 satırlı kişisel ölçüt tablosunun Tutarlılık örneği sabit ve geri kalanı öznel olmalı.");
assert(h192.get("s193-voice")?.answer?.entry_type==="performance_support" &&
 h192.get("s193-voice")?.content?.lead?.includes("sözlü") &&
 Object.keys(h192.get("s193-voice")?.answer?.answer_sections??{}).length===4,
 "s.193 rol üstlenme sözlü ve kişisel performans olmalı.");
const exit193=h192.get("s193-exit");
assert(exit193?.answer?.entry_type==="performance_support" &&
 exit193?.answer?.answer_sections?.["Üç Yaz"]?.length===3 &&
 exit193?.answer?.answer_sections?.["İki Sor"]?.length===2 &&
 typeof exit193?.answer?.answer_sections?.["Bir Paylaş"]==="string" &&
 exit193?.answer?.evidence_quotes?.length===2 &&
 !JSON.stringify(exit193.answer.answer_sections).includes("insanı kendi derinliğine"),
 "Çıkış kartı 3–2–1 ve yalnız kitapta görülen alıntılarla olmalı.");
for(const id of ["s193-three","s193-two","s193-one"]){
 assert(h192.get(id)?.answer===null &&
 h192.get(id)?.source?.source_record_id==="T03-S0055",
 `Çıkış kartı aşaması tek canonical answer'a bağlanmalı: ${id}`);
}
assert(theme3Lessons.reduce((sum,l)=>sum+l.coverage.steps,0)===310 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((sum,l)=>sum+l.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const bio194 = byLessonId.get("T11-T03-BIYOGRAFI-AKIF-194-198");
assert(bio194?.printed_page_range==="194-198" &&
 bio194.coverage.steps===18 &&
 bio194.coverage.source_records===5 &&
 bio194.coverage.answer_entries===4,
 "Biyografi s.194–198 18 step / 5 source / 4 answer olmalı.");
const bioById=new Map(bio194.steps.map(s=>[s.id,s]));
assert(bioById.size===18,"Biyografi 18 benzersiz adım olmalı.");
for(const [id,source,answer] of [
 ["s194-q1","T03-S0056","T3-P194-Q01"],
 ["s194-q2","T03-S0057","T3-P194-Q02"],
 ["s195-goal","T03-S0058","T3-P195-PERF01"],
 ["s198-vocab","T03-S0060","T3-P198-VOC01"]
]){
 const s=bioById.get(id);
 assert(s?.source?.source_record_id===source &&
 s?.answer?.question_id===answer &&
 s?.source?.source_status==="VERIFIED",
 `Biyografi source-answer mapping: ${id}`);
}
assert(bioById.get("s194-q1")?.answer?.answer_sections?.["Tarık Buğra örneği"]?.includes("telif") &&
 bioById.get("s194-q1")?.answer?.answer_sections?.["Âşık Veysel örneği"]?.includes("Tecer") &&
 bioById.get("s194-q2")?.answer?.answer_sections?.["Okur için önemi"]?.includes("ilişki"),
 "s.194 iki biyografi örneği ve okur için anlamı metin dayanaklı olmalı.");
assert(bioById.get("s195-goal")?.answer?.entry_type==="performance_support" &&
 bioById.get("s195-goal")?.answer?.answer_sections?.["Tahmin (okumadan önce)"]?.
 includes("sonradan") &&
 bioById.get("s195-prediction")?.answer===null &&
 bioById.get("s195-prediction")?.content?.lead?.includes("ilk tahmin"),
 "s.195 öğrenci ön-tahmini sonradan öğrenilen olaylarla geriye dönük doldurulmamalı.");
for(const id of ["s195-reading","s195-struggle","s196-anthem","s196-egypt","s196-works",
 "s197-author","s197-portrait"]){
 assert(bioById.get(id)?.answer===null &&
 bioById.get(id)?.source?.source_record_id==="T03-S0059",
 `s.195–197 ana metin telifli tekrar olmadan kaynak atıflı olmalı: ${id}`);
}
const vocab=bioById.get("s198-vocab");
assert(vocab?.layout==="vocabulary" &&
 Object.keys(vocab?.answer?.answer_sections??{}).length===7 &&
 vocab.answer.answer_sections["kullanılmayan seçenek"]?.includes("vesile") &&
 vocab.answer.guidance?.includes("(7)") &&
 bioById.get("s198-words-extra")?.answer===null,
 "s.198 altı tanım, yedi seçenek, vesile artan seçenek olmalı.");
assert(theme3Lessons.reduce((s,l)=>s+l.coverage.steps,0)===310 &&
 theme3Lessons.reduce((s,l)=>s+l.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((s,l)=>s+l.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");


const bio199 = byLessonId.get("T11-T03-BIYOGRAFI-AKIF-ANLAMA-199-201");
assert(bio199?.printed_page_range==="199-201" &&
 bio199.coverage.steps===16 &&
 bio199.coverage.source_records===5 &&
 bio199.coverage.answer_entries===5,
 "Biyografi s.199–201 16 step / 5 source / 5 answer olmalı.");
const bio199ById=new Map(bio199.steps.map(s=>[s.id,s]));
assert(bio199ById.size===16,"s.199–201 benzersiz adımlar olmalı.");
for(const [id,s,a] of [
 ["s199-q1","T03-S0061","T3-P199-Q01"],
 ["s199-q2","T03-S0062","T3-P199-Q02"],
 ["s199-q3","T03-S0063","T3-P199-Q03"],
 ["s200-task","T03-S0064","T3-P200-PERF01"],
 ["s201-work","T03-S0065","T3-P201-WORK01"]]){
 const item=bio199ById.get(id);
 assert(item?.source?.source_record_id===s &&
 item?.answer?.question_id===a && item?.source?.source_status==="VERIFIED",
 `s.199–201 kaynak–cevap eşleşmesi: ${id}`);
}
assert(bio199ById.get("s199-q1")?.answer?.guidance?.includes("tek bir zorunlu duygu") &&
 bio199ById.get("s199-q1")?.answer?.answer_sections?.["Metindeki kanıt"]?.includes("Küfe"),
 "s.199 Q1 kişisel duygu + kitapta gerçekten verilen şiir örnekleri olmalı.");
assert(bio199ById.get("s199-q2")?.answer?.answer_sections?.["Nitelemenin kaynağı"]?.
 includes("biyografi yazarının") &&
 bio199ById.get("s199-q3")?.answer?.answer_sections?.["Kaynak sınırı"]?.
 includes("ek olay uydurmayın"),
 "s.199 Q2 yazara atıf; Q3 metindeki olay ile yorum ayrılmalı.");
const visual=bio199ById.get("s200-task");
assert(visual?.answer?.entry_type==="performance_support" &&
 Object.keys(visual.answer.answer_sections??{}).length===6 &&
 visual.answer.answer_sections?.["Şenay Aybüke Yalçın"]?.includes("2016") &&
 visual.answer.answer_sections?.["Necmettin Yılmaz"]?.includes("16 Haziran 2017") &&
 visual.answer.answer_sections?.["Ferhat Gedik"]?.includes("Eren Bülbül") &&
 visual.answer.answer_sections?.["Gülşah Güler"]?.includes("15 Temmuz 2016") &&
 visual.answer.answer_sections?.["Anıt ve metin"]?.includes("Çanakkale"),
 "s.200 dört kişinin kısa kaynak bilgisi ve anıt ayrı, kişisel görev zorlamasız olmalı.");
const worksheet=bio199ById.get("s201-work");
assert(Object.keys(worksheet?.answer?.answer_sections??{}).length===9 &&
 worksheet.content.items.length===9 &&
 worksheet.answer.answer_sections?.dusunceyi_gelistirme?.some(x=>x.includes("Örnekleme")) &&
 worksheet.answer.answer_sections?.anlatim_bicimleri?.some(x=>x.includes("Öyküleme")) &&
 worksheet.answer.answer_sections?.acik_iletiler?.length===2 &&
 worksheet.answer.answer_sections?.ortuk_iletiler?.length===2,
 "s.201 dokuz kitap başlığı tamamı, açıklama/öyküleme ve örnekleme ayrı olmalı.");
for(const id of ["s201-content","s201-support","s201-method","s201-message","s201-order"]){
 assert(bio199ById.get(id)?.answer===null &&
 bio199ById.get(id)?.source?.source_record_id==="T03-S0065",
 `Çalışma kâğıdı ayrıntı ekranı doğru kaynakta: ${id}`);
}
assert(theme3Lessons.reduce((s,l)=>s+l.coverage.steps,0)===310 &&
 theme3Lessons.reduce((s,l)=>s+l.coverage.source_records,0)===147 &&
 theme3Lessons.reduce((s,l)=>s+l.coverage.answer_entries,0)===147,
 "Tema 3 toplam 18 ders / 310 adım / 147 source / 147 answer olmalı.");

const themeIntro = byLessonId.get("T11-T01-GIRIS");
assert(themeIntro, "1. Tema giriş dersi catalog içinde bulunamadı.");
assert(themeIntro.lesson_slug === "tema-girisi", "Tema girişi lesson_slug doğru olmalı.");
assert(
  themeIntro.coverage.steps === 3 &&
    themeIntro.coverage.source_records === 3 &&
    themeIntro.coverage.answer_entries === 2,
  "Tema girişi 3 adım / 3 source / 2 answer olmalı."
);

const themeIntroById = new Map(themeIntro.steps.map((step) => [step.id, step]));
assert(
  themeIntroById.get("s12-13-overview")?.answer === null &&
    themeIntroById.get("s12-13-overview")?.layout === "reference",
  "s.12-13 tema açılışı cevapsız referans ekranı olmalı."
);
assert(
  themeIntroById.get("s14-q1")?.answer?.question_id === "T1-P14-Q01" &&
    themeIntroById.get("s14-q2")?.answer?.question_id === "T1-P14-Q02",
  "s.14 iki Temaya Başlarken sorusunun cevabı erişilebilir olmalı."
);

const expectedLessonOrder = [
  "T11-T01-GIRIS",
  "T11-T01-KARAGOZ",
  "T11-T01-MEKTUP",
  "T11-T01-KONUSMA",
  "T11-T01-DINLEME-IZLEME",
  "T11-T01-YAZMA",
  "T11-T01-DEGERLENDIRME"
];
assert(
  JSON.stringify(theme1Lessons.map((lesson) => lesson.lesson_id)) ===
    JSON.stringify(expectedLessonOrder),
  "1. Tema ders kataloğu basılı kitap sırasını korumalı."
);

assert(
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0) === 176,
  "1. Tema toplam 176 ders adımı içermeli."
);
assert(
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.source_records, 0) === 129,
  "1. Tema 129 source-index kaydının tamamını kapsamalı."
);
assert(
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.answer_entries, 0) === 151,
  "1. Tema 151 answer-bank kaydının tamamını kapsamalı."
);

const theme2Intro = byLessonId.get("T11-T02-GIRIS");
assert(theme2Intro, "2. Tema giriş dersi catalog içinde bulunamadı.");
assert(
  theme2Intro.lesson_slug === "tema-2-girisi",
  "2. Tema giriş lesson_slug benzersiz ve doğru olmalı."
);
assert(
  theme2Intro.printed_page_range === "84-88",
  "2. Tema giriş bloğu kitapta s.84–88 aralığını kapsamalı."
);
assert(
  theme2Intro.coverage.steps === 14 &&
    theme2Intro.coverage.source_records === 14 &&
    theme2Intro.coverage.answer_entries === 12,
  "2. Tema giriş bloğu 14 adım / 14 source / 12 answer olmalı."
);

const theme2IntroById = new Map(
  theme2Intro.steps.map((step) => [step.id, step])
);
assert(
  theme2IntroById.get("s84-overview")?.answer === null &&
    theme2IntroById.get("s84-overview")?.layout === "reference" &&
    theme2IntroById.get("s85-theme-presentation")?.answer === null,
  "s.84–85 tema açılışı cevapsız referans ekranları olarak korunmalı."
);
assert(
  theme2IntroById.get("s86-q1")?.answer?.question_id === "T2-P86-Q01" &&
    theme2IntroById.get("s86-q3")?.answer?.guidance,
  "s.86 Vatan yahut Silistre soruları ve gerekli yönlendirme erişilebilir olmalı."
);
assert(
  theme2IntroById.get("s87-q1")?.answer?.explanation?.includes("Alfabe") &&
    theme2IntroById.get("s87-q2")?.answer?.evidence_quotes?.length === 1,
  "s.87 alfabe-yazı dili ayrımı ve metin kanıtı korunmalı."
);
assert(
  theme2IntroById.get("s88-q3")?.answer?.guidance &&
    theme2IntroById.get("s88-q1")?.answer?.explanation &&
    theme2IntroById.get("s88-q5")?.answer?.explanation,
  "s.88 açık uçlu ve QR-bağlamlı soruların öğretmen rehberliği korunmalı."
);
for (const step of theme2Intro.steps) {
  assert(
    step.source.source_status === "VERIFIED",
    `2. Tema giriş source kaydı VERIFIED olmalı: ${step.source.source_record_id}`
  );
}

const ogullaBulusma = byLessonId.get("T11-T02-OGULLA-BULUSMA");
assert(ogullaBulusma, "2. Tema Oğulla Buluşma dersi catalog içinde bulunamadı.");
assert(
  ogullaBulusma.printed_page_range === "89-107",
  "Oğulla Buluşma doğal bloğu s.89–107 aralığını kapsamalı."
);
assert(
  ogullaBulusma.coverage.steps === 37 &&
    ogullaBulusma.coverage.source_records === 32 &&
    ogullaBulusma.coverage.answer_entries === 36,
  "Oğulla Buluşma 37 adım / 32 source / 36 answer olmalı."
);

const ogullaById = new Map(ogullaBulusma.steps.map((step) => [step.id, step]));
assert(
  ogullaById.get("s89-common-words")?.answer?.question_id === "T2-P89-PERF01" &&
    ogullaById.get("s89-common-words")?.layout === "process",
  "s.89 Türk Dilleri araştırması performance/process olarak korunmalı."
);
assert(
  ogullaById.get("s90-95-reading")?.answer === null &&
    ogullaById.get("s90-95-reading")?.source?.printed_page_range === "90-95",
  "Oğulla Buluşma ana metni yeniden yayımlanmadan s.90–95 okuma süreci olarak temsil edilmeli."
);
assert(
  ogullaById.get("s95-q1")?.layout === "vocabulary" &&
    Object.keys(ogullaById.get("s95-q1")?.answer?.answer_sections ?? {}).length === 6,
  "s.95 söz varlığı altı yapılandırılmış kelime tanımını taşımalı."
);
assert(
  ogullaById.get("s96-q4a")?.layout === "structure" &&
    ogullaById.get("s98-q4c")?.layout === "comparison",
  "Türk şiveleri çalışması yapı ve karşılaştırma görünümlerini kullanmalı."
);
assert(
  ogullaById.get("s102-103-gram1")?.source?.printed_page_range === "102-103" &&
    ogullaById.get("s103-gram2")?.answer?.question_id === "T2-P103-GRAM02" &&
    ogullaById.get("s104-gram3")?.answer?.question_id === "T2-P104-GRAM03" &&
    ogullaById.get("s104-gram4")?.answer?.question_id === "T2-P104-GRAM04",
  "s.102–104 dört dil bilgisi görevi doğru sayfa ve answer kayıtlarıyla korunmalı."
);
assert(
  ogullaById.get("s105-q1")?.layout === "structure" &&
    ogullaById.get("s105-q2")?.layout === "structure",
  "s.105 hikâye haritası ve ilişkiler yapılandırılmış görünümde olmalı."
);
assert(
  ogullaById.get("s106-discussion")?.answer?.entry_type === "performance_support" &&
    ogullaById.get("s107-conflict-group")?.answer?.entry_type === "performance_support" &&
    ogullaById.get("s107-values")?.answer?.entry_type === "performance_support",
  "s.106–107 tartışma/grup/değer çalışmaları klasik cevap anahtarına zorlanmamalı."
);
assert(
  ogullaById.get("s107-aytmatov")?.answer?.question_id === "T2-P107-AYTMATOV",
  "s.107 Aytmatov Fark Edelim cevabı erişilebilir olmalı."
);

for (const lesson of theme2Lessons) {
  for (const step of lesson.steps) {
    assert(
      step.source.source_status === "VERIFIED",
      `Tema 2 kullanılan source kaydı VERIFIED olmalı: ${step.source.source_record_id}`
    );
  }
}

const eskiIstanbul = byLessonId.get("T11-T02-ESKI-ISTANBUL");
assert(eskiIstanbul, "2. Tema Eski İstanbul dersi catalog içinde bulunamadı.");
assert(
  eskiIstanbul.printed_page_range === "108-112",
  "Eski İstanbul doğal bloğu s.108–112 aralığını kapsamalı."
);
assert(
  eskiIstanbul.coverage.steps === 15 &&
    eskiIstanbul.coverage.source_records === 11 &&
    eskiIstanbul.coverage.answer_entries === 14,
  "Eski İstanbul bloğu 15 adım / 11 source / 14 answer olmalı."
);

const eskiById = new Map(eskiIstanbul.steps.map((step) => [step.id, step]));
assert(
  eskiById.get("s108-social-sciences")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s108-social-sciences")?.layout === "process",
  "s.108 Oğulla Buluşma sosyal bilimler görevi performance/process olmalı."
);
assert(
  eskiById.get("s108-110-reading")?.answer === null &&
    eskiById.get("s108-110-reading")?.source?.printed_page_range === "108-110",
  "Eski İstanbul ana metni kopyalanmadan s.108–110 yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  eskiById.get("s111-q1")?.layout === "comparison" &&
    eskiById.get("s111-card-technique")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s111-social-sciences")?.answer?.explanation?.includes("Anı"),
  "s.111 karşılaştırma, kart gösterme ve anı-sosyal bilimler rehberliği korunmalı."
);
assert(
  eskiById.get("s112-q5")?.answer?.evidence_quotes?.length === 3 &&
    eskiById.get("s112-exit")?.answer?.entry_type === "performance_support" &&
    eskiById.get("s112-exit")?.layout === "assessment",
  "s.112 ifade seçimi ve 3-2-1 çıkış kartı doğru katmanlarla korunmalı."
);

assert(
  theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0) === 187 &&
    theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.source_records, 0) === 158 &&
    theme2Lessons.reduce((sum, lesson) => sum + lesson.coverage.answer_entries, 0) === 167,
  "Tema 2 tam kapsam 187 adım / 158 source / 167 answer olmalı."
);

const orhun = byLessonId.get("T11-T02-ORHUN");
assert(orhun, "2. Tema Orhun Abideleri dersi catalog içinde bulunamadı.");
assert(
  orhun.printed_page_range === "113-124",
  "Orhun Abideleri doğal bloğu s.113–124 aralığını kapsamalı."
);
assert(
  orhun.coverage.steps === 33 &&
    orhun.coverage.source_records === 30 &&
    orhun.coverage.answer_entries === 32,
  "Orhun Abideleri 33 adım / 30 source / 32 answer olmalı."
);

const orhunById = new Map(orhun.steps.map((step) => [step.id, step]));
assert(
  orhunById.get("s113-q1")?.answer?.entry_type === "source_limited" &&
    orhunById.get("s113-q1")?.answer?.guidance,
  "s.113 QR video sorusu source_limited ve yönlendirmeli kalmalı."
);
assert(
  orhunById.get("s114-115-reading")?.answer === null &&
    orhunById.get("s114-115-reading")?.layout === "process",
  "Kül Tigin ana metni kopyalanmadan yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  orhunById.get("s116-vocabulary")?.layout === "vocabulary" &&
    Object.keys(orhunById.get("s116-vocabulary")?.answer?.answer_sections ?? {}).length === 6 &&
    orhunById.get("s116-vocabulary")?.answer?.answer_sections?.["şad"]?.includes("bulunmuyor"),
  "s.116 söz varlığı altı sözcüğü ve kitaptaki şad tanım eksikliğini dürüstçe korumalı."
);
assert(
  orhunById.get("s118-rhetoric")?.layout === "structure" &&
    orhunById.get("s119-compare")?.layout === "comparison",
  "s.118 söz sanatları ve s.119 metin karşılaştırması yapılandırılmış görünüm kullanmalı."
);
assert(
  orhunById.get("s121-q3")?.layout === "structure" &&
    orhunById.get("s122-q2")?.layout === "structure" &&
    orhunById.get("s122-q4")?.layout === "structure" &&
    orhunById.get("s123-q5")?.layout === "structure",
  "s.121–123 çözümleme tabloları yapılandırılmış görünümde olmalı."
);
assert(
  orhunById.get("s124-values")?.answer?.entry_type === "performance_support" &&
    orhunById.get("s124-social-sciences")?.answer?.entry_type === "performance_support" &&
    orhunById.get("s124-social-sciences")?.source?.printed_page_range === "124-125",
  "s.124 değerler ve s.124-125 sosyal bilimler çalışmaları performance olarak korunmalı."
);

const divan = byLessonId.get("T11-T02-DIVANU-LUGATIT-TURK");
assert(divan, "2. Tema Dîvânu Lugâti’t-Türk dersi catalog içinde bulunamadı.");
assert(
  divan.printed_page_range === "125-128",
  "Dîvânu Lugâti’t-Türk doğal bloğu s.125–128 aralığını kapsamalı."
);
assert(
  divan.coverage.steps === 15 &&
    divan.coverage.source_records === 15 &&
    divan.coverage.answer_entries === 14,
  "Dîvânu Lugâti’t-Türk 15 adım / 15 source / 14 answer olmalı."
);

const divanById = new Map(divan.steps.map((step) => [step.id, step]));
assert(
  divanById.get("s125-126-reading")?.answer === null &&
    divanById.get("s125-126-reading")?.source?.printed_page_range === "125-126",
  "Dîvânu Lugâti’t-Türk ara metni kopyalanmadan yönlendirilmiş okuma olarak temsil edilmeli."
);
assert(
  divanById.get("s127-q2")?.answer?.evidence_quotes?.length === 2 &&
    divanById.get("s127-q3")?.answer?.evidence_quotes?.length === 2,
  "s.127 dil bilimi ve kültür sorularındaki metin kanıtları korunmalı."
);
assert(
  divanById.get("s127-q6")?.layout === "comparison" &&
    divanById.get("s127-q6")?.answer?.answer_sections?.kul_tigin,
  "Kül Tigin / Dîvânu karşılaştırması yapılandırılmış comparison görünümünde olmalı."
);
assert(
  divanById.get("s127-q7")?.answer?.entry_type === "performance_support" &&
    divanById.get("s127-q7")?.layout === "process",
  "Türk dilleri sözlüğü hazırlama görevi performance/process olarak korunmalı."
);
assert(
  divanById.get("s127-fark2")?.answer?.guidance &&
    divanById.get("s128-q2")?.answer?.explanation,
  "Açık uçlu değerlendirmelerde guidance ve gerçeklik açıklaması korunmalı."
);

const speaking2 = byLessonId.get("T11-T02-KONUSMA");
assert(speaking2, "2. Tema Konuşma dersi catalog içinde bulunamadı.");
assert(
  speaking2.printed_page_range === "129-135",
  "2. Tema Konuşma doğal bloğu s.129–135 aralığını kapsamalı."
);
assert(
  speaking2.coverage.steps === 18 &&
    speaking2.coverage.source_records === 13 &&
    speaking2.coverage.answer_entries === 14,
  "2. Tema Konuşma 18 adım / 13 source / 14 answer olmalı."
);

const speaking2ById = new Map(speaking2.steps.map((step) => [step.id, step]));
assert(
  speaking2ById.get("s129-q1")?.answer?.entry_type === "source_limited" &&
    speaking2ById.get("s129-q1")?.answer?.guidance,
  "s.129 QR-video sorusu source_limited ve yönlendirmeli kalmalı."
);
assert(
  speaking2ById.get("s130-plan")?.answer?.entry_type === "performance_support" &&
    speaking2ById.get("s130-stations")?.content?.items?.length === 6,
  "s.130 planlama ve altı istasyonlu performans görevi korunmalı."
);
assert(
  speaking2ById.get("s132-133-comparison")?.layout === "comparison" &&
    speaking2ById.get("s132-133-comparison")?.answer?.guidance,
  "s.132–133 ülke kültürü araştırması hazır kalıplara zorlanmadan comparison olmalı."
);
assert(
  speaking2ById.get("s133-production-1")?.answer === null &&
    speaking2ById.get("s133-production-2")?.answer?.question_id === "T2-P133-PERF01" &&
    speaking2ById.get("s133-speech")?.answer?.question_id === "T2-P133-PERF02",
  "s.133 üretim zinciri yoğunluğu iki süreç ekranına bölünmeli ve örnek konuşma ayrı kalmalı."
);
assert(
  (speaking2ById.get("s134-rules-1")?.content?.items?.length ?? 0) +
    (speaking2ById.get("s134-rules-2")?.content?.items?.length ?? 0) === 12 &&
    speaking2ById.get("s134-rules-2")?.answer?.question_id === "T2-P134-PERF01",
  "s.134 konuşma uygulama ölçütleri iki ekranda toplam 12 görünür ölçüt olarak korunmalı."
);
assert(
  (speaking2ById.get("s135-self-1")?.content?.items?.length ?? 0) +
    (speaking2ById.get("s135-self-2")?.content?.items?.length ?? 0) === 10 &&
    speaking2ById.get("s135-self-2")?.answer?.question_id === "T2-P135-PERF01",
  "s.135 öz değerlendirme formundaki 10 ölçüt iki ekranda korunmalı."
);
assert(
  speaking2ById.get("s135-reference")?.answer === null &&
    speaking2ById.get("s135-reference")?.source?.source_record_id === "T02-S0115" &&
    speaking2ById.get("s135-reference")?.content?.sections?.some(
      (section) => section.title === "Kaynak sınırı"
    ),
  "s.135 QR dereceli/akran formları görünmeyen ayrıntılar uydurulmadan referans ekranında kalmalı."
);

const asik = byLessonId.get("T11-T02-ASIK-ATISMASI");
assert(asik, "2. Tema Âşık Atışması dersi catalog içinde bulunamadı.");
assert(
  asik.printed_page_range === "136-147",
  "Âşık Atışması doğal bloğu s.136–147 aralığını kapsamalı."
);
assert(
  asik.coverage.steps === 27 &&
    asik.coverage.source_records === 22 &&
    asik.coverage.answer_entries === 25,
  "Âşık Atışması 27 adım / 22 source / 25 answer olmalı."
);

const asikById = new Map(asik.steps.map((step) => [step.id, step]));
assert(
  asikById.get("s137-plan")?.answer?.entry_type === "performance_support" &&
    asikById.get("s139-checklist")?.content?.items?.length === 6 &&
    asikById.get("s139-observation")?.answer === null,
  "Dinleme planı, altı maddelik kontrol listesi ve öğretmen gözlemi ayrı süreçler olarak korunmalı."
);
assert(
  asikById.get("s140-listen")?.answer === null &&
    asikById.get("s140-vocabulary")?.answer?.entry_type === "source_limited" &&
    asikById.get("s140-vocabulary")?.content?.items?.length === 5,
  "Gerçek video dinleme adımı ile bağlama bağımlı beş sözcük ayrılmalı."
);
assert(
  asikById.get("s142-q2")?.answer?.entry_type === "source_limited" &&
    asikById.get("s143-language")?.answer?.entry_type === "source_limited" &&
    asikById.get("s144-map")?.answer?.entry_type === "source_limited",
  "Benzetme, video dili ve çok modlu unsur çözümlemeleri kaynak-sınırlı kalmalı."
);
assert(
  asikById.get("s145-hats")?.answer?.entry_type === "source_limited" &&
    Object.keys(asikById.get("s145-hats")?.answer?.answer_sections ?? {}).length === 6,
  "Altı şapka çerçevesi korunmalı ancak gerçek video içeriği uydurulmamalı."
);
assert(
  asikById.get("s146-viewpoints")?.answer?.entry_type === "performance_support" &&
    asikById.get("s146-viewpoints")?.content?.items?.length === 4,
  "s.146 görüş geliştirme dört kitap yargısını görünür tutmalı."
);
assert(
  asikById.get("s147-q1")?.answer?.entry_type === "source_limited" &&
    asikById.get("s147-reflection")?.answer?.entry_type === "performance_support" &&
    asikById.get("s147-reflection")?.content?.items?.length === 5,
  "s.147 performans değerlendirmesi kaynak-sınırlı; yansıtıcı yazı beş soruluk yapı olmalı."
);

const museumWriting = byLessonId.get("T11-T02-YAZMA");
assert(museumWriting, "2. Tema çevrim içi müze yazma dersi bulunamadı.");
assert(
  museumWriting.printed_page_range === "148-154" &&
    museumWriting.coverage.steps === 18 &&
    museumWriting.coverage.source_records === 12 &&
    museumWriting.coverage.answer_entries === 11,
  "Tema 2 Yazma s.148–154, 18 adım / 12 source / 11 answer olmalı."
);
const museumById = new Map(museumWriting.steps.map((step) => [step.id, step]));
assert(
  museumById.get("s148-reference")?.answer === null &&
    museumById.get("s148-reference")?.layout === "reference" &&
    museumById.get("s150-task")?.answer === null,
  "Sanal Müzecilik ve Müzeler ve Toplum metinleri yeniden yayımlanmadan süreç olarak temsil edilmeli."
);
assert(
  museumById.get("s149-research")?.answer?.question_id === "T2-P149-PERF01" &&
    Array.isArray(museumById.get("s149-research")?.answer?.answer_sections) &&
    museumById.get("s149-research")?.answer?.answer_sections?.length === 4 &&
    museumById.get("s149-select")?.answer?.entry_type === "performance_support",
  "s.149 müze araştırmasının liste biçimli desteği ve gerçek seçim yönlendirmesi korunmalı."
);
assert(
  museumById.get("s151-compare")?.layout === "comparison" &&
    museumById.get("s151-carriers")?.layout === "structure" &&
    museumById.get("s151-enrich")?.answer?.entry_type === "performance_support",
  "s.151 karşılaştırma, kültür taşıyıcıları ve yazı zenginleştirme ayrı adımlar olmalı."
);
assert(
  (museumById.get("s152-rules-1")?.content?.items?.length ?? 0) +
    (museumById.get("s152-rules-2")?.content?.items?.length ?? 0) === 13 &&
    museumById.get("s152-draft")?.answer?.entry_type === "performance_support" &&
    museumById.get("s152-check")?.content?.items?.length === 10,
  "s.152 on üç yazma ölçütü, kişisel izlenim iskeleti ve on maddelik kontrol ayrı korunmalı."
);
assert(
  (museumById.get("s153-self-1")?.content?.items?.length ?? 0) +
    (museumById.get("s153-self-2")?.content?.items?.length ?? 0) === 10 &&
    museumById.get("s153-rubric")?.answer === null &&
    museumById.get("s153-rubric")?.content?.sections?.some(
      (section) => section.title === "Kaynak sınırı"
    ),
  "s.153 öz değerlendirme 10 ölçüt içermeli; QR formları kaynak görülmeden uydurulmamalı."
);
assert(
  Object.keys(museumById.get("s154-journal")?.answer?.answer_sections ?? {}).length === 5 &&
    museumById.get("s154-journal")?.answer?.entry_type === "performance_support",
  "s.154 öğrenme günlüğünün beş gerçek başlığı model olarak korunmalı."
);
for (const step of museumWriting.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Yazma source kaydı VERIFIED olmalı: ${step.source.source_record_id}`);
}


const theme2Assessment = byLessonId.get("T11-T02-DEGERLENDIRME");
assert(theme2Assessment, "Tema 2 değerlendirme dersi bulunamadı.");
assert(
  theme2Assessment.printed_page_range === "155-159" &&
    theme2Assessment.coverage.steps === 10 &&
    theme2Assessment.coverage.source_records === 9 &&
    theme2Assessment.coverage.answer_entries === 9,
  "Tema 2 değerlendirme 10 adım / 9 source / 9 answer olmalı."
);
const assessment2ById = new Map(theme2Assessment.steps.map(step => [step.id, step]));
assert(
  assessment2ById.get("s156-source")?.answer === null &&
    assessment2ById.get("s156-source")?.content?.sections?.length === 3,
  "s.156 üç eser bilgi kartı cevap uydurulmadan referans ekranında bulunmalı."
);
for (const [id, qid] of [["s155-q1", "T2-P155-Q01"], ["s155-q2", "T2-P155-Q02"], ["s157-q3", "T2-P157-Q03"], ["s157-q4", "T2-P157-Q04"], ["s157-q5", "T2-P157-Q05"], ["s158-q6", "T2-P158-Q06"], ["s159-q7", "T2-P159-Q07"], ["s159-q8", "T2-P159-Q08"], ["s159-q9", "T2-P159-PERF01"]]) {
  assert(assessment2ById.get(id)?.answer?.question_id === qid, `Tema 2 değerlendirme cevap bağlantısı eksik: ${id}`);
}
assert(
  assessment2ById.get("s157-q3")?.answer?.answer.startsWith("Doğru cevap: A.") &&
    assessment2ById.get("s157-q5")?.answer?.answer.startsWith("Doğru cevap: B") &&
    assessment2ById.get("s158-q6")?.answer?.answer.startsWith("Doğru cevap: D."),
  "s.157–158 çoktan seçmeli cevaplar kitap ve atışma ile eşleşmeli."
);
assert(
  assessment2ById.get("s159-q7")?.answer?.answer.includes("Ahmet") &&
    assessment2ById.get("s159-q7")?.display_prompt.includes("7/b"),
  "s.159 soru 7 yanlış değerlendirme ve kişisel yanıtı birlikte kapsamalı."
);
assert(
  assessment2ById.get("s159-q8")?.answer?.entry_type === "source_limited" &&
    assessment2ById.get("s159-q9")?.answer?.entry_type === "performance_support",
  "QR ayrıntıları uydurulmamalı, slogan tek doğru gibi sunulmamalı."
);
for (const step of theme2Assessment.steps) {
  assert(step.source.source_status === "VERIFIED", `Tema 2 assessment source VERIFIED olmalı: ${step.source.source_record_id}`);
}

const karagoz = byLessonId.get("T11-T01-KARAGOZ");
assert(karagoz, "Karagöz dersi catalog içinde bulunamadı.");
assert(karagoz.coverage.steps === 49, "Karagöz pilotu 49 adım olmalı.");
assert(
  karagoz.coverage.source_records === 17,
  "Karagöz pilotu 17 source-index kaydını kapsamalı."
);
assert(
  karagoz.coverage.answer_entries === 39,
  "Karagöz pilotu 39 answer-bank kaydını kapsamalı."
);

const karagozById = new Map(karagoz.steps.map((step) => [step.id, step]));

const s15q2 = karagozById.get("s15-q2");
assert(s15q2, "s15-q2 bulunamadı.");
assert(
  s15q2.display_prompt ===
    "Günlük hayatın tiyatroya nasıl yansıdığını düşünüyorsunuz? Görüşlerinizi açıklayınız.",
  "s15-q2 doğrulanmış soru metnini göstermeli."
);
assert(
  s15q2.display_prompt_mode === "VERBATIM_SHORT",
  "s15-q2 kısa doğrulanmış soru olarak işaretlenmeli."
);

const s28q1 = karagozById.get("s28-q1");
assert(s28q1, "s28-q1 bulunamadı.");
assert(
  s28q1.display_prompt.includes("sosyal statülerine ve eğitim durumlarına"),
  "Tekil doğrulanmış kaynak sorusu ekrana taşınmalı."
);
assert(
  s28q1.display_prompt_mode === "VERBATIM_SHORT",
  "s28-q1 verbatim kısa soru olarak işaretlenmeli."
);

const vocabulary = karagozById.get("s25-q1");
assert(vocabulary, "s25-q1 bulunamadı.");
for (const term of ["Dadı", "Esbab", "Murat", "Bendeniz", "Silsile", "İspir"]) {
  assert(
    vocabulary.answer.answer_sections?.[term],
    `Karagöz söz varlığı tanımı eksik: ${term}`
  );
}

const s15q4 = karagozById.get("s15-q4");
assert(s15q4, "s15-q4 bulunamadı.");
assert(
  JSON.stringify(s15q4.reveal_order) ===
    JSON.stringify(["guidance", "answer", "explanation"]),
  "s15-q4 reveal sırası guidance → answer → explanation olmalı."
);

const s27q1 = karagozById.get("s27-q1");
assert(s27q1, "s27-q1 bulunamadı.");
assert(
  JSON.stringify(s27q1.reveal_order) ===
    JSON.stringify(["answer", "evidence"]),
  "s27-q1 cevap ve kanıt katmanlarını sırayla taşımalı."
);

const s26 = karagozById.get("s26-reference");
assert(s26, "s26-reference bulunamadı.");
assert(
  JSON.stringify(s26.reveal_order) === JSON.stringify(["note"]),
  "s26 öğretmen notu reveal katmanı olarak korunmalı."
);

const karagozOrderedIds = karagoz.steps.map((step) => step.id);
assert(
  karagozOrderedIds.indexOf("s34-perf") < karagozOrderedIds.indexOf("s34-q9"),
  "s34 araştırma görevi değerlendirme sorusundan önce gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s32-group-start") <
    karagozOrderedIds.indexOf("s32-q3"),
  "s32 grup hazırlığı yapı unsurları çözümünden önce gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s32-q5") <
    karagozOrderedIds.indexOf("s32-share"),
  "s32 sonuç paylaşımı çözümleme sorularından sonra gelmeli."
);
assert(
  karagozOrderedIds.indexOf("s35-q3") <
    karagozOrderedIds.indexOf("s35-self-peer-review"),
  "s35 öz/akran değerlendirme içerik sorularından sonra gelmeli."
);

const conflictReference = karagozById.get("s32-conflict-reference");
assert(conflictReference, "s32 çatışma Bilgi Köşesi eksik.");
assert(
  conflictReference.layout === "reference",
  "Çatışma Bilgi Köşesi reference görünümünde olmalı."
);

const wordWall = karagozById.get("s25-word-wall");
assert(wordWall, "s25 kelime duvarı adımı eksik.");
assert(
  wordWall.density === "large",
  "Kelime duvarı adımı geniş görünüm kullanmalı."
);

const s30q1 = karagozById.get("s30-q1");
assert(
  s30q1?.answer?.question_no === "1",
  "Eksik question_no Q01'den türetilmeli."
);

const s35q1 = karagozById.get("s35-q1");
assert(
  s35q1?.density === "compact",
  "Yoğun s35-q1 projeksiyonda kompakt olmalı."
);

const s35q3 = karagozById.get("s35-q3");
assert(
  s35q3?.answer?.question_no === "3",
  "Eksik question_no Q03'ten türetilmeli."
);

const mektup = byLessonId.get("T11-T01-MEKTUP");
assert(mektup, "Mektup dersi catalog içinde bulunamadı.");
assert(mektup.lesson_slug === "mektup", "Mektup lesson_slug doğru olmalı.");
assert(mektup.coverage.steps === 43, "Mektup dersi 43 adım olmalı.");
assert(
  mektup.coverage.source_records === 36,
  "Mektup dersi 36 source-index kaydını kapsamalı."
);
assert(
  mektup.coverage.answer_entries === 39,
  "Mektup dersi 39 answer-bank kaydını kapsamalı."
);

const mektupById = new Map(mektup.steps.map((step) => [step.id, step]));
const mektupOrderedIds = mektup.steps.map((step) => step.id);

const s36q1 = mektupById.get("s36-q1");
assert(s36q1, "Mektup s36-q1 bulunamadı.");
assert(
  s36q1.display_prompt ===
    "Metinden hareketle “mektup” kelimesinin size neler ifade ettiğini hayatınızdan örnekler vererek açıklayınız.",
  "Mektup s36-q1 kitap soru metnini kullanmalı."
);
assert(
  s36q1.display_prompt_mode === "VERBATIM_SHORT",
  "Mektup s36-q1 kitap soru metni olarak işaretlenmeli."
);

const s37q1 = mektupById.get("s37-q1");
assert(s37q1, "Mektup s37-q1 bulunamadı.");
assert(
  s37q1.display_prompt_mode === "ANSWER_SUMMARY",
  "Paylaşılan s.37-38 source kaydında answer summary kullanılmalı."
);
assert(
  mektupOrderedIds.indexOf("s37-38-process") <
    mektupOrderedIds.indexOf("s37-q1"),
  "Mektup okuma süreci sorulardan önce gelmeli."
);

const mektupVocabulary = mektupById.get("s39-q1");
assert(mektupVocabulary, "Mektup s39-q1 söz varlığı adımı eksik.");
assert(
  mektupVocabulary.layout === "vocabulary",
  "Mektup s39-q1 vocabulary görünümünde olmalı."
);
assert(
  mektupVocabulary.density === "compact",
  "Mektup söz varlığı projeksiyonda kompakt olmalı."
);
for (const term of [
  "Umumiyetle",
  "Mücerretlik",
  "Tahlil",
  "Mamafih",
  "İdealizm",
  "Vaka"
]) {
  assert(
    mektupVocabulary.answer.answer_sections?.[term],
    `Mektup söz varlığı tanımı eksik: ${term}`
  );
}

const s42Reference = mektupById.get("s42-reference");
assert(s42Reference, "s42 mektup türleri referans adımı eksik.");
assert(
  s42Reference.answer === null && s42Reference.layout === "reference",
  "s42 referans adımı answer-bank cevabına bağlı olmamalı."
);

const s51Reference = mektupById.get("s51-reference");
assert(s51Reference, "s51 Dilekçe referans adımı eksik.");
assert(
  s51Reference.source.source_record_id === "T01-S0055",
  "s51 Dilekçe doğru source-index kaydına bağlı olmalı."
);

const s52q1 = mektupById.get("s52-q1");
assert(s52q1, "s52 Dilekçe yazma adımı eksik.");
assert(
  s52q1.answer?.entry_type === "performance_support",
  "s52 Dilekçe yazma performans desteği olarak korunmalı."
);

const speaking = byLessonId.get("T11-T01-KONUSMA");
assert(speaking, "Konuşma dersi catalog içinde bulunamadı.");
assert(speaking.lesson_slug === "konusma", "Konuşma lesson_slug doğru olmalı.");
assert(speaking.coverage.steps === 13, "Konuşma dersi 13 adım olmalı.");
assert(
  speaking.coverage.source_records === 7,
  "Konuşma dersi 7 doğrulanmış source-index kaydını kapsamalı."
);
assert(
  speaking.coverage.answer_entries === 9,
  "Konuşma dersi 9 answer-bank kaydını kapsamalı."
);

const speakingById = new Map(speaking.steps.map((step) => [step.id, step]));

const s53q1 = speakingById.get("s53-q1");
assert(s53q1, "Konuşma s53-q1 bulunamadı.");
assert(
  s53q1.answer?.entry_type === "source_limited",
  "Video bağımlı s53-q1 source_limited kalmalı."
);
assert(
  s53q1.display_prompt_mode === "VERBATIM_SHORT",
  "s53-q1 kitap soru metniyle gösterilmeli."
);

const s54Plan = speakingById.get("s54-plan");
assert(s54Plan, "Konuşma s54 planlama adımı eksik.");
assert(
  s54Plan.answer?.entry_type === "performance_support",
  "s54 planlama performans desteğine bağlı olmalı."
);
assert(
  s54Plan.content?.items?.length === 6,
  "s54 planlama altı zorunlu hazırlık adımını taşımalı."
);

const s57Performance1 = speakingById.get("s57-performance-1");
const s57Performance2 = speakingById.get("s57-performance-2");
assert(s57Performance1 && s57Performance2, "Konuşma s57 iki ekranı da bulunmalı.");
assert(
  (s57Performance1.content?.items?.length ?? 0) +
    (s57Performance2.content?.items?.length ?? 0) === 14,
  "s57 canlı canlandırma 14 uygulama ölçütünü iki ekranda korumalı."
);
assert(
  s57Performance2.answer?.question_id === "T1-P57-PERF01",
  "s57 performans desteği ikinci uygulama ekranında erişilebilir olmalı."
);

const s58Assessment1 = speakingById.get("s58-self-assessment-1");
const s58Assessment2 = speakingById.get("s58-self-assessment-2");
assert(
  s58Assessment1 && s58Assessment2,
  "Konuşma s58 öz değerlendirme iki ekranı da bulunmalı."
);
assert(
  (s58Assessment1.content?.items?.length ?? 0) +
    (s58Assessment2.content?.items?.length ?? 0) === 10,
  "s58 öz değerlendirme 10 görünür ölçütü iki ekranda korumalı."
);

const s58Feedback = speakingById.get("s58-feedback");
assert(s58Feedback, "Konuşma s58 geri bildirim adımı eksik.");
assert(
  s58Feedback.source.source_record_id === "T01-S0063",
  "s58 geri bildirim dış QR sınırını doğru source kaydıyla korumalı."
);
assert(
  JSON.stringify(s58Feedback.reveal_order) === JSON.stringify(["note"]),
  "s58 QR kaynak sınırı öğretmen notu reveal'i olarak erişilebilir olmalı."
);

const dinleme = byLessonId.get("T11-T01-DINLEME-IZLEME");
assert(dinleme, "Dinleme/İzleme dersi catalog içinde bulunamadı.");
assert(
  dinleme.lesson_slug === "dinleme-izleme",
  "Dinleme/İzleme lesson_slug doğru olmalı."
);
assert(dinleme.coverage.steps === 38, "Dinleme/İzleme dersi 38 adım olmalı.");
assert(
  dinleme.coverage.source_records === 38,
  "Dinleme/İzleme dersi 38 source-index kaydını kapsamalı."
);
assert(
  dinleme.coverage.answer_entries === 36,
  "Dinleme/İzleme dersi 36 answer-bank kaydını kapsamalı."
);

const dinlemeById = new Map(dinleme.steps.map((step) => [step.id, step]));
const dinlemeOrderedIds = dinleme.steps.map((step) => step.id);

const d64Listen = dinlemeById.get("s64-listen");
const d64Observation = dinlemeById.get("s64-observation");
assert(d64Listen && d64Observation, "s64 süreç/gözlem adımları eksik.");
assert(
  d64Listen.answer === null && d64Observation.answer === null,
  "s64 not alma ve Gözlem Formu answer-bank cevabına bağlı olmamalı."
);
assert(
  dinlemeOrderedIds.indexOf("s64-strategy") <
    dinlemeOrderedIds.indexOf("s64-listen") &&
    dinlemeOrderedIds.indexOf("s64-listen") <
      dinlemeOrderedIds.indexOf("s64-observation"),
  "s64 hazırlık → strateji → dinleme → gözlem sırası korunmalı."
);

const d65Vocabulary = dinlemeById.get("s65-vocabulary");
assert(d65Vocabulary, "s65 söz varlığı adımı eksik.");
assert(
  d65Vocabulary.layout === "vocabulary" &&
    d65Vocabulary.density === "compact",
  "s65 söz varlığı kompakt vocabulary görünümünde olmalı."
);
for (const term of ["Tasavvur", "Nörolojik", "Sosyal", "Güdü", "Medeni", "Muhabbet"]) {
  assert(
    d65Vocabulary.answer.answer_sections?.[term],
    `Dinleme/İzleme söz varlığı tanımı eksik: ${term}`
  );
}

assert(
  dinlemeById.get("s66-q1")?.answer?.entry_type === "source_limited" &&
    dinlemeById.get("s66-q4")?.answer?.entry_type === "source_limited" &&
    dinlemeById.get("s71-q2")?.answer?.entry_type === "source_limited",
  "QR videoya bağlı cevaplar source_limited olarak korunmalı."
);

assert(
  dinlemeOrderedIds.indexOf("s68-future") <
    dinlemeOrderedIds.indexOf("s68-69-q2") &&
    dinlemeOrderedIds.indexOf("s70-q4") <
      dinlemeOrderedIds.indexOf("s71-solutions"),
  "s68–71 tartışma ve çözüm akışı kitap sırasını korumalı."
);

const d73Exit = dinlemeById.get("s73-exit");
assert(d73Exit, "s73 çıkış kartı eksik.");
assert(
  d73Exit.layout === "assessment" &&
    d73Exit.answer?.entry_type === "performance_support",
  "s73 çıkış kartı assessment + performance_support olarak korunmalı."
);
assert(
  d73Exit.answer?.answer_sections?.["Üç Yaz"] &&
    d73Exit.answer?.answer_sections?.["İki Sor"] &&
    d73Exit.answer?.answer_sections?.["Bir Paylaş"],
  "s73 çıkış kartının 3-2-1 yapısı eksiksiz olmalı."
);

const yazma = byLessonId.get("T11-T01-YAZMA");
assert(yazma, "Yazma dersi catalog içinde bulunamadı.");
assert(yazma.lesson_slug === "yazma", "Yazma lesson_slug doğru olmalı.");
assert(yazma.coverage.steps === 17, "Yazma dersi 17 adım olmalı.");
assert(
  yazma.coverage.source_records === 15,
  "Yazma dersi 15 source-index kaydını kapsamalı."
);
assert(
  yazma.coverage.answer_entries === 13,
  "Yazma dersi 13 answer-bank kaydını kapsamalı."
);

const yazmaById = new Map(yazma.steps.map((step) => [step.id, step]));
const yazmaOrderedIds = yazma.steps.map((step) => step.id);

const y75Plan = yazmaById.get("s75-plan");
assert(y75Plan, "s75 e-posta planlama adımı eksik.");
assert(
  y75Plan.answer?.entry_type === "performance_support" &&
    y75Plan.content?.items?.length === 5,
  "s75 planlama, performans desteği ve beş hazırlık adımını korumalı."
);

const y76Compare = yazmaById.get("s76-q3");
assert(y76Compare, "s76 e-posta/mektup karşılaştırması eksik.");
assert(
  y76Compare.layout === "comparison" &&
    y76Compare.answer?.answer_sections?.benzerlikler &&
    y76Compare.answer?.answer_sections?.farkliliklar,
  "s76 karşılaştırma yapılandırılmış benzerlik/farklılık verisini korumalı."
);

const y77Feedback = yazmaById.get("s77-feedback");
const y77Write = yazmaById.get("s77-write");
assert(y77Feedback && y77Write, "s77 geri bildirim/yazma adımları eksik.");
assert(
  y77Feedback.answer === null &&
    yazmaOrderedIds.indexOf("s77-feedback") <
      yazmaOrderedIds.indexOf("s77-write"),
  "Taslak geri bildirimi e-posta yazımından önce, cevapsız süreç adımı olmalı."
);
assert(
  y77Write.answer?.entry_type === "performance_support",
  "s77 e-posta yazma örneği performance_support olmalı."
);

const y78Self = yazmaById.get("s78-self");
assert(y78Self, "s78 öz değerlendirme eksik.");
assert(
  y78Self.content?.items?.length === 8,
  "s78 öz değerlendirme kitaptaki sekiz görünür ölçütü korumalı."
);

const y78Exit = yazmaById.get("s78-exit");
assert(y78Exit, "s78 tema çıkış kartı eksik.");
assert(
  y78Exit.layout === "assessment" &&
    y78Exit.answer?.entry_type === "performance_support",
  "s78 çıkış kartı assessment + performance_support olarak korunmalı."
);
assert(
  y78Exit.answer?.answer_sections?.["Üç Yaz"] &&
    y78Exit.answer?.answer_sections?.["İki Sor"] &&
    y78Exit.answer?.answer_sections?.["Bir Paylaş"],
  "s78 tema çıkış kartının 3-2-1 yapısı eksiksiz olmalı."
);

const y78Rubric = yazmaById.get("s78-rubric");
assert(y78Rubric, "s78 dereceli puanlama/kaynak sınırı adımı eksik.");
assert(
  y78Rubric.answer === null && y78Rubric.layout === "reference",
  "s78 QR dereceli puanlama adımı cevap uydurmadan referans olarak kalmalı."
);

const degerlendirme = byLessonId.get("T11-T01-DEGERLENDIRME");
assert(degerlendirme, "Tema değerlendirme dersi catalog içinde bulunamadı.");
assert(
  degerlendirme.lesson_slug === "degerlendirme",
  "Tema değerlendirme lesson_slug doğru olmalı."
);
assert(
  degerlendirme.coverage.steps === 13 &&
    degerlendirme.coverage.source_records === 13 &&
    degerlendirme.coverage.answer_entries === 13,
  "Tema değerlendirme 13 adım / 13 source / 13 answer olmalı."
);

const degerlendirmeById = new Map(
  degerlendirme.steps.map((step) => [step.id, step])
);

const dQ5 = degerlendirmeById.get("s81-q5");
const dQ6 = degerlendirmeById.get("s81-q6");
assert(dQ5 && dQ6, "s81 yaratıcı değerlendirme adımları eksik.");
assert(
  dQ5.answer?.entry_type === "performance_support" &&
    dQ6.answer?.entry_type === "performance_support",
  "s81 yaratıcı diyalog ve karşılaştırma performance_support kalmalı."
);

const dQ12 = degerlendirmeById.get("s83-q12");
assert(dQ12, "s83 Evet/Hayır/Bilgi yok adımı eksik.");
assert(
  Object.keys(dQ12.answer?.answer_sections ?? {}).length === 8,
  "s83 soru 12 sekiz değerlendirme cümlesinin tamamını korumalı."
);
assert(
  dQ12.layout === "structure" && dQ12.density === "compact",
  "s83 soru 12 projeksiyonda kompakt yapı görünümünde olmalı."
);

const dQ13 = degerlendirmeById.get("s83-q13");
assert(dQ13, "s83 Olvido sorusu eksik.");
assert(
  dQ13.answer?.entry_type === "source_limited",
  "Olvido dış video sorusu source_limited kalmalı."
);

console.log(
  `Lesson data assertions passed: ${lessons.length} lessons, ` +
  `${lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0)} total steps.`
);
