# Faz 2 — Android çevrimdışı kanonik veri teslimi

**Kapsam:** Kotlin + Compose / API 36. Pardus, Raspberry Pi,
uzaktan eşitleme, yeni ders yazımı ve React değişikliği yok.

## Veri yolu
`source-index + answer-bank parts + flow` →
`apps/lesson-player/scripts/build-lesson-data.mjs` →
`test-lesson-data + test-teacher-workflow + test-runtime-contract` →
`package-android-data.mjs` →
`assets/lesson-player/{lessons,teacher-workflow,content-manifest}.json` →
`ContentRepository` → native read-only kitaplık ve adım önizlemesi.

Paket Git'te sürümlenmez. Gradle derleme öncesinde kanonik veri üretilir;
doğrulama başarısızsa Android build fail-closed.
`generated_at` yalnız değişken build meta verisi olduğu için çıkarılır;
`lesson_id`, `step.id`, source/answer bağlantısı, düzen,
`answer_sections` iç içe JSON, `source_limited`, öğretmen note ve
`reveal_order` kayıpsız korunur. Web `localStorage` hash'iyle
karıştırılmayan **tam payload SHA-256** manifestte saklanır.

## Test kapısı
1. JS doğrulaması 4 tema, 48 ders, 914 adım, 8 atölye, 5 yıllık öğe;
   yalnız generated_at hariç tam web→Android eşitliği.
2. Hash, `answer.answer` değişince değişir; `generated_at`
   değişikliği içeriği değiştirmez.
3. Android parser, JSON null/absent, nested sections, vocabulary,
   source status, reveal permutation ve tüm kimlikleri doğrular.
4. Gerçek Karagöz notu, söz varlığı ve `s266-vocabulary`
   (gerçek layout=structure) regresyon örnekleri.
5. Android 16 emülatörde internet kapalı, uygulama/katalog açılışı
   ve bozulmuş asset digest'ini reddetme.
6. `assembleDebug + assembleDebugAndroidTest + unitTest + lint`,
   APK içinde üç asset, minSdk=targetSdk=36.
7. Aynı committe CI PASS olmadan tamamlandı denmez;
   gerçek Galaxy Tab A11 Plus kabulü Faz 7'de ayrıca yapılır.

**Faz sınırı:** LessonScreen yalnız kanonik adım başlıklarını
salt-okunur gösterir. Soru/cevap reveal, resume ve teacher marks
henüz uygulanmış sayılmaz.
