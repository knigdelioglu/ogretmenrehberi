// Theme-specific assertions extracted without changing their order or conditions.
export function checkTheme1({ lessons, byLessonId, assert, theme1Lessons }) {
const themeIntro = byLessonId.get("T11-T01-GIRIS");
assert(themeIntro, "1. Tema giriş dersi catalog içinde bulunamadı.");
assert(themeIntro.lesson_slug === "tema-girisi", "Tema girişi lesson_slug doğru olmalı.");
assert(
  themeIntro.coverage.steps === 4 &&
    themeIntro.coverage.source_records === 3 &&
    themeIntro.coverage.answer_entries === 2,
  "Tema girişi 4 adım / 3 source / 2 answer olmalı."
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
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.steps, 0) === 180,
  "1. Tema toplam 180 ders adımı içermeli."
);
assert(
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.source_records, 0) === 129,
  "1. Tema 129 source-index kaydının tamamını kapsamalı."
);
assert(
  theme1Lessons.reduce((sum, lesson) => sum + lesson.coverage.answer_entries, 0) === 151,
  "1. Tema 151 answer-bank kaydının tamamını kapsamalı."
);


const karagoz = byLessonId.get("T11-T01-KARAGOZ");
assert(karagoz, "Karagöz dersi catalog içinde bulunamadı.");
assert(karagoz.coverage.steps === 50, "Karagöz pilotu 50 adım olmalı.");
assert(
  karagoz.coverage.source_records === 17,
  "Karagöz pilotu 17 source-index kaydını kapsamalı."
);
assert(
  karagoz.coverage.answer_entries === 39,
  "Karagöz pilotu 39 answer-bank kaydını kapsamalı."
);

const karagozById = new Map(karagoz.steps.map((step) => [step.id, step]));

const karagozOrderedIdsForMedia = karagoz.steps.map((step) => step.id);
assert(
  karagozById.get("s15-source-reminder")?.layout === "process" &&
    karagozOrderedIdsForMedia.indexOf("s15-source-reminder") <
      karagozOrderedIdsForMedia.indexOf("s15-q1"),
  "s.15 kaynak/karekod hatırlatması sorulardan önce gelmeli."
);
assert(
  karagozById.get("s18-q1")?.display_prompt ===
    "Başlık ve görsellerden yararlanarak metnin içeriğine dair tahminlerde bulununuz." &&
    karagozById.get("s18-q1")?.display_prompt_mode === "VERBATIM_SHORT",
  "s18-q1 PDF'deki gerçek soru kökünü verbatim göstermeli."
);

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
assert(speaking.coverage.steps === 14, "Konuşma dersi 14 adım olmalı.");
assert(
  speaking.coverage.source_records === 7,
  "Konuşma dersi 7 doğrulanmış source-index kaydını kapsamalı."
);
assert(
  speaking.coverage.answer_entries === 9,
  "Konuşma dersi 9 answer-bank kaydını kapsamalı."
);

const speakingById = new Map(speaking.steps.map((step) => [step.id, step]));

const speakingOrderedIds = speaking.steps.map((step) => step.id);
assert(
  speakingById.get("s53-media-reminder")?.layout === "process" &&
    speakingOrderedIds.indexOf("s53-media-reminder") <
      speakingOrderedIds.indexOf("s53-q1"),
  "s.53 Seksenler medya hatırlatması ilk sorudan önce gelmeli."
);

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
  degerlendirme.coverage.steps === 14 &&
    degerlendirme.coverage.source_records === 13 &&
    degerlendirme.coverage.answer_entries === 13,
  "Tema değerlendirme 14 adım / 13 source / 13 answer olmalı."
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

const degerlendirmeOrderedIds = degerlendirme.steps.map((step) => step.id);
assert(
  degerlendirmeById.get("s83-olvido-media-reminder")?.layout === "process" &&
    degerlendirmeOrderedIds.indexOf("s83-olvido-media-reminder") <
      degerlendirmeOrderedIds.indexOf("s83-q13"),
  "s.83 Olvido medya hatırlatması soru 13'ten önce gelmeli."
);

const dQ13 = degerlendirmeById.get("s83-q13");
assert(dQ13, "s83 Olvido sorusu eksik.");
assert(
  dQ13.answer?.entry_type === "source_limited",
  "Olvido dış video sorusu source_limited kalmalı."
);

}
