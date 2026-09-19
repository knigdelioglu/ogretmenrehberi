// Theme-specific assertions extracted without changing their order or conditions.
export function checkTheme3({ lessons, byLessonId, assert, theme3Lessons }) {
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
const s161Theme = theme3IntroById.get("s161-theme-presentation");
assert(
  s161Theme?.display_prompt.includes("Tema Sunusu") &&
    s161Theme?.content?.sections?.some(section =>
      section.body.includes("Nerde görsen gönlü kırık")
    ) &&
    s161Theme?.content?.sections?.some(section =>
      section.body.includes("karekod")
    ),
  "Tema 3 s.161 tema sunusu Yesevî alıntısını ve karekod geçişini görünür tutmalı."
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

}
