// Theme-specific assertions extracted without changing their order or conditions.
export function checkTheme4({ lessons, byLessonId, assert, theme4Lessons }) {
assert(theme4Lessons.length === 14,
  "Tema 4 s.236–307 tüm doğal Lesson Player bloklarını içermeli.");
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
assert(
  theme4IntroById.get("s237-threshold")?.display_prompt.includes("Tema Sunusu") &&
    theme4IntroById.get("s237-threshold")?.content?.sections?.some(section =>
      section.body.includes("İlim ilim bilmekdir")
    ) &&
    theme4IntroById.get("s237-threshold")?.content?.sections?.some(section =>
      section.body.includes("karekod")
    ),
  "s.237 Tema Sunusu karekod geçişi ve Yunus Emre beyti görünür olmalı."
);
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
assert(theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.steps,0) === 234 &&
  theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.source_records,0) === 143 &&
  theme4Lessons.reduce((sum,lesson)=>sum+lesson.coverage.answer_entries,0) === 157,
  "Tema 4 tamamı 14 ders / 234 ekran / 143 kaynak / 157 cevap olmalı.");

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

const merdivenCompare = lessons.find(lesson => lesson.lesson_id === "T11-T04-MERDIVEN-KARSILASTIRMA-271-273");
assert(merdivenCompare && merdivenCompare.printed_page_range === "271-273" &&
  merdivenCompare.coverage.steps === 10 && merdivenCompare.coverage.source_records === 5 &&
  merdivenCompare.coverage.answer_entries === 5,
  "Merdiven karşılaştırma s.271–273 10 ekran / 5 kaynak / 5 cevap içermeli.");
const merdivenCompareById = new Map(merdivenCompare.steps.map(step => [step.id, step]));
assert(merdivenCompareById.size === 10, "Merdiven karşılaştırma ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s271-q12","T04-S0056","T4-P271-COMP01"],
  ["s272-table","T04-S0057","T4-P272-Q01"],
  ["s272-q2","T04-S0058","T4-P272-PERF02"],
  ["s273-q1","T04-S0059","T4-P273-Q01"],
  ["s273-q2","T04-S0060","T4-P273-PERF02"]
]) {
  assert(merdivenCompareById.get(id)?.source?.source_record_id === sourceId &&
    merdivenCompareById.get(id)?.answer?.question_id === answerId,
    `Merdiven s.271–273 kanonik bağlantı: ${id}`);
}
assert(merdivenCompareById.get("s272-table")?.content?.items?.length === 7 &&
  Object.keys(merdivenCompareById.get("s272-table")?.answer?.answer_sections ?? {}).length === 7,
  "Ben, Mimar Sinan / Merdiven karşılaştırması yedi ölçütü korumalı.");
assert(merdivenCompareById.get("s273-q1")?.content?.items?.length === 4 &&
  Object.keys(merdivenCompareById.get("s273-q1")?.answer?.answer_sections ?? {}).length === 4,
  "Şair Tavafî / Merdiven karşılaştırması dört ölçütü korumalı.");
assert(merdivenCompareById.get("s272-q2")?.answer?.entry_type === "performance_support" &&
  merdivenCompareById.get("s273-q2")?.answer?.entry_type === "performance_support",
  "Tür tercihi ve kişisel beğeni tek doğru cevap gibi sunulmamalı.");
for (const step of merdivenCompare.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Merdiven s.271–273 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const merdivenDeep = lessons.find(lesson => lesson.lesson_id === "T11-T04-MERDIVEN-COZUMLEME-274-279");
assert(merdivenDeep && merdivenDeep.printed_page_range === "274-279" &&
  merdivenDeep.coverage.steps === 21 && merdivenDeep.coverage.source_records === 13 &&
  merdivenDeep.coverage.answer_entries === 14,
  "Merdiven çözümleme s.274–279 21 ekran / 13 kaynak / 14 cevap içermeli.");
const merdivenDeepById = new Map(merdivenDeep.steps.map(step => [step.id, step]));
assert(merdivenDeepById.size === 21, "Merdiven çözümleme ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s274-analysis","T04-S0061","T4-P274-ANALYSIS01"],
  ["s275-work","T04-S0062","T4-P275-WORK01"],
  ["s275-q1","T04-S0063","T4-P275-Q01"],
  ["s275-q2a","T04-S0064","T4-P275-Q02A"],
  ["s275-q2b","T04-S0065","T4-P275-Q02B"],
  ["s276-q3","T04-S0066","T4-P276-Q03"],
  ["s276-conflicts","T04-S0067","T4-P276-CONFLICT01"],
  ["s277-whatif","T04-S0067","T4-P277-PERF00"],
  ["s277-q1","T04-S0068","T4-P277-Q01"],
  ["s277-q2","T04-S0069","T4-P277-PERF02"],
  ["s278-disciplines","T04-S0070","T4-P278-TABLE01"],
  ["s279-q1","T04-S0071","T4-P279-Q01"],
  ["s279-assessment","T04-S0072","T4-P279-PERF01"],
  ["s279-brainstorm","T04-S0073","T4-P279-PERF02"]
]) {
  assert(merdivenDeepById.get(id)?.source?.source_record_id === sourceId &&
    merdivenDeepById.get(id)?.answer?.question_id === answerId,
    `Merdiven s.274–279 kanonik bağlantı: ${id}`);
}
assert(merdivenDeepById.get("s274-analysis")?.content?.items?.length === 3 &&
  Object.keys(merdivenDeepById.get("s274-analysis")?.answer?.answer_sections ?? {}).length === 3,
  "Üç karakterin çözümlemesi korunmalı.");
assert(merdivenDeepById.get("s275-work")?.content?.items?.length === 4 &&
  Object.keys(merdivenDeepById.get("s275-work")?.answer?.answer_sections ?? {}).length === 4,
  "Merdiven yapı unsurları dört başlıkta kalmalı.");
assert(merdivenDeepById.get("s277-whatif")?.content?.items?.length === 3 &&
  Object.keys(merdivenDeepById.get("s277-whatif")?.answer?.answer_sections ?? {}).length === 3,
  "Üç varsayımsal olay akışı korunmalı.");
assert(merdivenDeepById.get("s278-disciplines")?.content?.items?.length === 7 &&
  Object.keys(merdivenDeepById.get("s278-disciplines")?.answer?.answer_sections ?? {}).length === 7,
  "Disiplin tablosunun yedi ayrıntısı korunmalı.");
assert(merdivenDeepById.get("s279-q1")?.content?.items?.length === 8 &&
  Object.keys(merdivenDeepById.get("s279-q1")?.answer?.answer_sections ?? {}).length === 8,
  "Ferit Edgü poetikası sekiz ölçütle Merdiven'e bağlanmalı.");
for (const id of ["s276-q3","s277-whatif","s277-q2","s279-assessment","s279-brainstorm"]) {
  assert(merdivenDeepById.get(id)?.answer?.entry_type === "performance_support",
    `Açık uçlu Merdiven değerlendirmesi tek doğru cevap gibi sunulmamalı: ${id}`);
}
for (const step of merdivenDeep.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Merdiven s.274–279 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const theatreWorkshop = lessons.find(lesson => lesson.lesson_id === "T11-T04-TIYATRO-CANLANDIRMA-280-283");
assert(theatreWorkshop && theatreWorkshop.printed_page_range === "280-283" &&
  theatreWorkshop.coverage.steps === 16 && theatreWorkshop.coverage.source_records === 10 &&
  theatreWorkshop.coverage.answer_entries === 12,
  "Tiyatro canlandırma s.280–283 16 ekran / 10 kaynak / 12 cevap içermeli.");
const theatreWorkshopById = new Map(theatreWorkshop.steps.map(step => [step.id, step]));
assert(theatreWorkshopById.size === 16, "Tiyatro canlandırma ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s280-q1","T04-S0074","T4-P280-Q01"],
  ["s280-q2","T04-S0075","T4-P280-PERF02"],
  ["s281-q3","T04-S0076","T4-P281-Q03"],
  ["s281-q4","T04-S0077","T4-P281-Q04"],
  ["s281-plan","T04-S0078","T4-P281-PERF01"],
  ["s281-checklist","T04-S0078","T4-P281-PERF02"],
  ["s282-content","T04-S0079","T4-P282-PERF01"],
  ["s282-rules","T04-S0079","T4-P282-PERF02"],
  ["s283-performance","T04-S0080","T4-P283-PERF01"],
  ["s283-q1","T04-S0081","T4-P283-PERFQ01"],
  ["s283-q2","T04-S0082","T4-P283-PERFQ02"],
  ["s283-q3","T04-S0083","T4-P283-PERFQ03"]
]) {
  assert(theatreWorkshopById.get(id)?.source?.source_record_id === sourceId &&
    theatreWorkshopById.get(id)?.answer?.question_id === answerId,
    `Tiyatro canlandırma s.280–283 kanonik bağlantı: ${id}`);
}
assert(theatreWorkshopById.get("s281-plan")?.content?.items?.length === 6 &&
  theatreWorkshopById.get("s281-checklist")?.content?.items?.length === 5,
  "Performans görevinin altı hazırlık adımı ve beş kontrol ölçütü korunmalı.");
assert(theatreWorkshopById.get("s282-content")?.content?.items?.length === 6 &&
  theatreWorkshopById.get("s282-rules")?.content?.items?.length === 7,
  "İçerik oluşturma altı, kural uygulama yedi öğretim kümesinde görünmeli.");
assert(theatreWorkshopById.get("s283-performance")?.content?.items?.length === 5 &&
  theatreWorkshopById.get("s283-performance")?.content?.note?.includes("QR") &&
  theatreWorkshopById.get("s283-performance")?.answer?.answer?.includes("QR"),
  "Görünür beş değerlendirme ekseni korunmalı; QR rubrik puanı uydurulmamalı.");
for (const id of ["s280-q2","s281-plan","s281-checklist","s282-content","s282-rules","s283-performance","s283-q1","s283-q2","s283-q3"]) {
  assert(theatreWorkshopById.get(id)?.answer?.entry_type === "performance_support",
    `Canlandırma süreci hazır öğrenci performansı gibi sunulmamalı: ${id}`);
}
for (const step of theatreWorkshop.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Tiyatro canlandırma s.280–283 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const anadoluListening = lessons.find(lesson => lesson.lesson_id === "T11-T04-ANADOLU-INSANI-284-290");
assert(anadoluListening && anadoluListening.printed_page_range === "284-290" &&
  anadoluListening.coverage.steps === 22 && anadoluListening.coverage.source_records === 12 &&
  anadoluListening.coverage.answer_entries === 20,
  "Anadolu İnsanı s.284–290 22 ekran / 12 kaynak / 20 cevap içermeli.");
const anadoluById = new Map(anadoluListening.steps.map(step => [step.id, step]));
assert(anadoluById.size === 22, "Anadolu İnsanı ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s284-q1","T04-S0084","T4-P284-Q01"],
  ["s284-q2","T04-S0084","T4-P284-Q02"],
  ["s285-q1","T04-S0085","T4-P285-Q01"],
  ["s285-q2","T04-S0085","T4-P285-Q02"],
  ["s285-q3","T04-S0085","T4-P285-Q03"],
  ["s285-q4","T04-S0085","T4-P285-Q04"],
  ["s285-watch","T04-S0085","T4-P285-PERF01"],
  ["s286-theme-words","T04-S0085","T4-P286-Q02"],
  ["s286-messages","T04-S0085","T4-P286-Q03"],
  ["s286-checklist","T04-S0085","T4-P286-PERF01"],
  ["s287-vocab","T04-S0086","T4-P287-VOC01"],
  ["s287-q1","T04-S0087","T4-P287-Q01"],
  ["s288-q2","T04-S0088","T4-P288-Q02"],
  ["s289-q3","T04-S0089","T4-P289-Q03"],
  ["s289-q4","T04-S0090","T4-P289-Q04"],
  ["s289-q5","T04-S0091","T4-P289-Q05"],
  ["s290-q6","T04-S0092","T4-P290-Q06"],
  ["s290-q7","T04-S0093","T4-P290-Q07"],
  ["s290-q8","T04-S0094","T4-P290-Q08"],
  ["s290-q9","T04-S0095","T4-P290-Q09"]
]) {
  assert(anadoluById.get(id)?.source?.source_record_id === sourceId &&
    anadoluById.get(id)?.answer?.question_id === answerId,
    `Anadolu İnsanı s.284–290 kanonik bağlantı: ${id}`);
}
assert(anadoluById.get("s287-vocab")?.content?.items?.length === 5 &&
  Object.keys(anadoluById.get("s287-vocab")?.answer?.answer_sections ?? {}).length === 5,
  "Anadolu İnsanı söz varlığı beş kelimeyi korumalı.");
assert(anadoluById.get("s288-q2")?.content?.items?.length === 5 &&
  anadoluById.get("s286-checklist")?.content?.items?.length === 5,
  "Zihin haritası ve dinleme kontrol listesi beşli yapıyı korumalı.");
for (const id of ["s286-theme-words","s286-messages","s287-q1","s288-q2","s289-q3","s289-q5","s290-q6","s290-q7","s290-q8","s290-q9"]) {
  assert(anadoluById.get(id)?.answer?.entry_type === "source_limited",
    `QR video görülmeden kesin cevap üretilmemeli: ${id}`);
}
for (const step of anadoluListening.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Anadolu İnsanı s.284–290 doğrulanmış kitap kaynağı: ${step.source.source_record_id}`);
}

const anadoluAnalysis = lessons.find(lesson => lesson.lesson_id === "T11-T04-ANADOLU-INSANI-COZUMLEME-291-297");
assert(anadoluAnalysis && anadoluAnalysis.printed_page_range === "291-297" &&
  anadoluAnalysis.coverage.steps === 24 && anadoluAnalysis.coverage.source_records === 21 &&
  anadoluAnalysis.coverage.answer_entries === 22,
  "Anadolu İnsanı çözümleme s.291–297 24 ekran / 21 kaynak / 22 cevap içermeli.");
const anadoluAnalysisById = new Map(anadoluAnalysis.steps.map(step => [step.id, step]));
assert(anadoluAnalysisById.size === 24, "Anadolu İnsanı çözümleme ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s291-q10","T04-S0096","T4-P291-Q10"],
  ["s291-q11","T04-S0097","T4-P291-Q11"],
  ["s292-q1","T04-S0098","T4-P292-Q01"],
  ["s293-watch","T04-S0099","T4-P293-Q01"],
  ["s293-q2","T04-S0099","T4-P293-Q02"],
  ["s293-q3","T04-S0100","T4-P293-Q03"],
  ["s294-q1","T04-S0101","T4-P294-Q01"],
  ["s294-q2","T04-S0102","T4-P294-Q02"],
  ["s294-q3","T04-S0103","T4-P294-Q03"],
  ["s294-q4","T04-S0104","T4-P294-Q04"],
  ["s294-q5","T04-S0105","T4-P294-Q05"],
  ["s294-q6","T04-S0106","T4-P294-Q06"],
  ["s295-q7","T04-S0107","T4-P295-Q07"],
  ["s295-q8","T04-S0108","T4-P295-Q08"],
  ["s295-q9","T04-S0109","T4-P295-Q09"],
  ["s295-q10","T04-S0110","T4-P295-Q10"],
  ["s295-q11","T04-S0111","T4-P295-Q11"],
  ["s295-q12","T04-S0112","T4-P295-Q12"],
  ["s296-q13","T04-S0113","T4-P296-Q13"],
  ["s296-q14","T04-S0114","T4-P296-Q14"],
  ["s297-q1","T04-S0115","T4-P297-Q01"],
  ["s297-q2","T04-S0116","T4-P297-PERF02"]
]) {
  assert(anadoluAnalysisById.get(id)?.source?.source_record_id === sourceId &&
    anadoluAnalysisById.get(id)?.answer?.question_id === answerId,
    `Anadolu İnsanı s.291–297 kanonik bağlantı: ${id}`);
}
assert(anadoluAnalysisById.get("s294-q1")?.content?.items?.length === 5 &&
  anadoluAnalysisById.get("s294-q4")?.content?.items?.length === 5,
  "Belgesel yapı unsurları ve aralarındaki beş ilişki korunmalı.");
assert(anadoluAnalysisById.get("s295-q12")?.answer?.entry_type === "source_limited" &&
  anadoluAnalysisById.get("s295-q12")?.answer?.printed_page === 295,
  "Çözümleyebilme 12 sayfa alanı sayısal olmalı ve QR sınırı korunmalı.");
for (const id of ["s291-q10","s291-q11","s293-q2","s293-q3","s294-q1","s294-q2","s294-q3","s294-q4","s294-q5","s294-q6","s295-q7","s295-q8","s295-q9","s295-q10","s295-q11","s295-q12","s296-q13","s296-q14"]) {
  assert(anadoluAnalysisById.get(id)?.answer?.entry_type === "source_limited",
    `QR video görülmeden çözümleme cevabı kesinleştirilmemeli: ${id}`);
}
for (const step of anadoluAnalysis.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Anadolu İnsanı s.291–297 doğrulanmış kitap kaynağı: ${step.source.source_record_id}`);
}

const posterWorkshop = lessons.find(lesson => lesson.lesson_id === "T11-T04-AFIS-ATOLYESI-298-302");
assert(posterWorkshop && posterWorkshop.printed_page_range === "298-302" &&
  posterWorkshop.coverage.steps === 18 && posterWorkshop.coverage.source_records === 13 &&
  posterWorkshop.coverage.answer_entries === 14,
  "Afiş atölyesi s.298–302 18 ekran / 13 kaynak / 14 cevap içermeli.");
const posterById = new Map(posterWorkshop.steps.map(step => [step.id, step]));
assert(posterById.size === 18, "Afiş atölyesi ekran kimlikleri benzersiz olmalı.");
for (const [id, sourceId, answerId] of [
  ["s299-q1","T04-S0118","T4-P299-Q01"],
  ["s299-q2","T04-S0119","T4-P299-Q02"],
  ["s299-q3","T04-S0120","T4-P299-Q03"],
  ["s299-task","T04-S0121","T4-P299-PERF01"],
  ["s300-content","T04-S0122","T4-P300-PERF01"],
  ["s300-message","T04-S0122","T4-P300-SL01"],
  ["s301-rules","T04-S0123","T4-P301-PERF01"],
  ["s301-model","T04-S0123","T4-P301-PERF02"],
  ["s302-q1","T04-S0124","T4-P302-PERFQ01"],
  ["s302-q2","T04-S0125","T4-P302-PERFQ02"],
  ["s302-q3","T04-S0126","T4-P302-PERFQ03"],
  ["s302-q4","T04-S0127","T4-P302-PERF04"],
  ["s302-rubric","T04-S0128","T4-P302-PERF05"],
  ["s302-journal","T04-S0129","T4-P302-PERF06"]
]) {
  assert(posterById.get(id)?.source?.source_record_id === sourceId &&
    posterById.get(id)?.answer?.question_id === answerId,
    `Afiş s.298–302 kanonik bağlantı: ${id}`);
}
assert(posterById.get("s298-reference")?.content?.items?.length === 4 &&
  posterById.get("s299-q3")?.content?.items?.length === 5,
  "Afiş tasarımının dört ana kriteri ve temel afiş unsurları korunmalı.");
assert(posterById.get("s300-content")?.answer?.printed_page === 300 &&
  posterById.get("s300-message")?.answer?.printed_page === 300,
  "s.300–301 cevaplarının printed_page alanı sayısal başlangıç sayfası olmalı.");
assert(posterById.get("s302-rubric")?.content?.items?.length === 5 &&
  (posterById.get("s302-rubric")?.content?.lead?.includes("QR") ||
    posterById.get("s302-rubric")?.content?.note?.includes("QR")),
  "Afiş rubriğinde yalnız görünür beş ölçüt kullanılmalı.");
for (const step of posterWorkshop.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Afiş s.298–302 doğrulanmış kaynak: ${step.source.source_record_id}`);
}

const theme4Assessment = lessons.find(lesson => lesson.lesson_id === "T11-T04-DEGERLENDIRME-303-307");
assert(theme4Assessment && theme4Assessment.printed_page_range === "303-307" &&
  theme4Assessment.coverage.steps === 19 && theme4Assessment.coverage.source_records === 14 &&
  theme4Assessment.coverage.answer_entries === 14,
  "Tema 4 değerlendirme s.303–307 19 ekran / 14 kaynak / 14 cevap içermeli.");
const theme4AssessmentById = new Map(theme4Assessment.steps.map(step => [step.id, step]));
assert(theme4AssessmentById.size === 19, "Tema 4 değerlendirme ekran kimlikleri benzersiz olmalı.");
const theme4AssessmentOrderedIds = theme4Assessment.steps.map((step) => step.id);
assert(
  theme4AssessmentById.get("s307-aidiyet-media-reminder")?.layout === "process" &&
    theme4AssessmentOrderedIds.indexOf("s307-aidiyet-media-reminder") <
      theme4AssessmentOrderedIds.indexOf("s307-q13"),
  "s.307 Aidiyet video hatırlatması soru 13'ten önce gelmeli."
);
for (const [id, sourceId, answerId] of [
  ["s303-q1","T04-S0130","T4-P303-Q01"],
  ["s304-q2","T04-S0131","T4-P304-Q02"],
  ["s304-q3","T04-S0132","T4-P304-Q03"],
  ["s304-q4","T04-S0133","T4-P304-Q04"],
  ["s305-q5","T04-S0134","T4-P305-Q05"],
  ["s305-q6","T04-S0135","T4-P305-Q06"],
  ["s306-q7","T04-S0136","T4-P306-Q07"],
  ["s306-q8","T04-S0137","T4-P306-Q08"],
  ["s306-q9","T04-S0138","T4-P306-Q09"],
  ["s307-q10","T04-S0139","T4-P307-Q10"],
  ["s307-q11","T04-S0140","T4-P307-Q11"],
  ["s307-q12","T04-S0141","T4-P307-Q12"],
  ["s307-q13","T04-S0142","T4-P307-SL13"],
  ["s307-q14","T04-S0143","T4-P307-SL14"]
]) {
  assert(theme4AssessmentById.get(id)?.source?.source_record_id === sourceId &&
    theme4AssessmentById.get(id)?.answer?.question_id === answerId,
    `Tema 4 değerlendirme kanonik bağlantı: ${id}`);
}
assert(theme4AssessmentById.get("s307-q11")?.content?.items?.length === 3 &&
  theme4AssessmentById.get("s305-q5")?.answer?.answer_sections &&
  Object.keys(theme4AssessmentById.get("s305-q5")?.answer?.answer_sections ?? {}).length === 4,
  "İzleme mecraları tablosu ve afiş görsel değerlendirmesi yapılandırılmış kalmalı.");
assert(theme4AssessmentById.get("s307-q13")?.answer?.entry_type === "source_limited" &&
  theme4AssessmentById.get("s307-q14")?.answer?.entry_type === "source_limited",
  "Aidiyet videosu görülmeden son iki soru kesin cevap gibi sunulmamalı.");
for (const step of theme4Assessment.steps) {
  assert(step.source.source_status === "VERIFIED",
    `Tema 4 s.303–307 doğrulanmış kaynak: ${step.source.source_record_id}`);
}


// Master-prompt regressions: personal/open responses stay student-owned and source bounds stay strict.
assert(!theme4IntroById.get("s239-q3")?.answer?.answer?.includes("farklı okurlar") &&
  theme4IntroById.get("s239-q3")?.answer?.guidance?.includes("metnin açıkça"),
  "s.239 sanatsal metin cevabı kaynak metni aşan alımlama kuramına genişlememeli.");
assert(theme4IntroById.get("s239-q4")?.answer?.answer_sections?.gercek_yasanti === "[...]" &&
  !theme4IntroById.get("s239-q4")?.answer?.answer?.includes("ayrılık"),
  "s.239 kişisel yaşantı sorusunda öğrenci adına deneyim uydurulmamalı.");
assert(theme4IntroById.get("s239-q5")?.answer?.answer_sections?.sectigim_tur === "[...]",
  "s.239 tür seçimi öğrenci adına doldurulmamalı.");

assert(!JSON.stringify(mimarReadingById.get("s247-vocab")?.answer).includes("başbakan") &&
  JSON.stringify(mimarReadingById.get("s247-vocab")?.answer).includes("başvezir"),
  "s.247 tarihî sadr-ı âzam karşılığı modern makam adıyla değiştirilmemeli.");
assert(mimarReadingById.get("s248-prediction")?.answer?.answer_sections?.okumadan_onceki_tahminim?.includes("daha önce yazdığı gerçek tahmin"),
  "s.248 okuma öncesi tahmin geriye dönük üretilmemeli.");

assert(!mimarAnalysisById.get("s252-q2bc")?.answer?.answer?.includes("Beni en çok") &&
  mimarAnalysisById.get("s252-q2bc")?.answer?.guidance?.includes("Öğrenci adına"),
  "s.252 kişisel özellik ve başarı tercihi öğrenci adına yazılmamalı.");
assert(!mimarStructureById.get("s257-q1")?.answer?.answer_sections?.["Monolog örneği"]?.includes("Güzellik, büyüklükten daha güçlüdür") &&
  mimarStructureById.get("s257-q1")?.answer?.guidance?.includes("karşılıklı konuşmanın devamındadır"),
  "s.257 karşılıklı konuşma cümlesi monolog diye sınıflandırılmamalı.");

assert(mimarValuesById.get("s262-assessment")?.answer?.answer_sections?.begendim_begenmedim === "[...]" &&
  mimarValuesById.get("s262-q1")?.answer?.answer_sections?.canlandirmak_istedigim_karakter === "[...]",
  "s.262 beğeni ve karakter tercihi öğrenci adına sabitlenmemeli.");
assert(mimarValuesById.get("s262-q2")?.answer?.answer_sections?.gunluk_hayat_durumu === "[...]",
  "s.262 yaratıcı senaryo hazır öğrenci ürünü yerine iskelet olarak kalmalı.");

assert(!JSON.stringify(merdivenIntroById.get("s263-q")?.answer).includes("Nihat") &&
  merdivenIntroById.get("s263-q")?.answer?.answer_sections?.hikaye_yazmak_istedigim_yasam_donemi === "[...]",
  "s.263 yaratıcı hikâye görevi rehber tarafından tamamlanmamalı.");
assert(merdivenCompareById.get("s272-q2")?.answer?.answer_sections?.tercihim?.includes("Tiyatro / hikâye") &&
  merdivenCompareById.get("s273-q2")?.answer?.answer_sections?.daha_cok_etkilendigim_hikaye === "[...]",
  "s.272–273 kişisel tür ve beğeni tercihleri açık uçlu kalmalı.");
assert(!JSON.stringify(merdivenDeepById.get("s277-q2")?.answer).includes("Ben olsaydım") &&
  merdivenDeepById.get("s279-assessment")?.answer?.answer_sections?.begendim_begenmedim === "[...]",
  "s.277 ve s.279 kişisel değer/beğeni cevapları öğrenci adına üretilmemeli.");

assert(theatreWorkshopById.get("s283-q1")?.answer?.answer_sections?.rol_hazirliginda_hissettiklerim === "[...]" &&
  theatreWorkshopById.get("s283-q2")?.answer?.answer_sections?.rol_arkadasimin_soyledigi_guclu_yon === "[...]" &&
  theatreWorkshopById.get("s283-q3")?.answer?.answer_sections?.korumak_istedigim_guclu_yon === "[...]",
  "s.283 öz/akran değerlendirmesinde yaşanmamış performans geçmişi uydurulmamalı.");

assert(!anadoluById.get("s285-q2")?.answer?.answer?.includes("toprakla çalışan") &&
  anadoluById.get("s285-q2")?.answer?.guidance?.includes("ray"),
  "s.285 görseli toprakta çalışan kişi diye yanlış kesinleştirilmemeli.");
assert(anadoluById.get("s287-q1")?.answer?.entry_type === "source_limited" &&
  anadoluById.get("s287-q1")?.answer?.answer_sections?.videoda_gozledigim_davranis === "[...]",
  "s.287 karakter özelliği video görülmeden hazır sonuç olarak verilmemeli.");

assert(posterById.get("s299-q1")?.answer?.answer_sections?.ilk_dikkatimi_ceken_unsur === "[...]" &&
  posterById.get("s302-q1")?.answer?.answer_sections?.surecte_degisen_nokta === "[...]" &&
  posterById.get("s302-q3")?.answer?.answer_sections?.kullandigim_gorsel_veya_alinti === "[...]",
  "s.299 ve s.302 kişisel afiş deneyimi öğrenci adına doldurulmamalı.");

assert(theme4AssessmentById.get("s304-q4")?.answer?.answer_sections?.sectigim_duygu === "[...]" &&
  !JSON.stringify(theme4AssessmentById.get("s305-q5")?.answer).includes("Kiraz"),
  "s.304–305 kişisel duygu tercihi ve görsel türü gereksiz biçimde kesinleştirilmemeli.");
assert(theme4AssessmentById.get("s307-q13")?.answer?.entry_type === "source_limited" &&
  theme4AssessmentById.get("s307-q13")?.answer?.answer_sections?.videoda_gozledigim_kisi_veya_davranis === "[...]" &&
  theme4AssessmentById.get("s307-q14")?.answer?.answer_sections?.videodan_gercek_ornek === "[...]",
  "s.307 Aidiyet cevapları video kanıtı olmadan doldurulmamalı.");

}
