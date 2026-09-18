# Lesson Player

Öğretmen Rehberi kanonik verisini sınıfta tam ekran yürütmek için React/Vite tabanlı ders oynatıcı ve sunum düzenleyici.

İlk pilot:

- 11. sınıf
- 1. Tema — Bir Diyeceğim Var!
- Karagöz / Yazıcı
- basılı s.15–35
- 49 ders adımı
- 17 source-index kaydı
- 39 answer-bank kaydı

## Çalıştırma

```bash
cd apps/lesson-player
npm install
npm run dev
```

`npm run dev` önce `scripts/build-lesson-data.mjs` çalıştırır. UI içine cevaplar elle kopyalanmaz; generated veri mevcut `source-index.json`, `answer-bank` ve `karagoz-flow.json` dosyalarından üretilir.

Production doğrulaması:

```bash
npm run build
```

Build sırası:

1. kanonik ders verisini üretir,
2. Karagöz kapsam/test assertionlarını çalıştırır,
3. TypeScript doğrulaması yapar,
4. Vite production build üretir.

## Öğretmen görünümü

Varsayılan görünümde:

- sayfaya göre gruplanmış ders akışı,
- basılı kitap sayfası,
- soru/görev,
- yönlendirme,
- cevap,
- metinden kısa kanıt,
- açıklama,
- öğretmen notu

ayrı katmanlar hâlinde kullanılabilir.

Uygulama son açık dersi/adımı `localStorage` içinde hatırlar.

## Projeksiyon modu

`P` veya üst menüde **Projeksiyon modu** ile açılır.

Bu görünümde:

- sol ders akışı gizlenir,
- öğretmen kontrol düğmeleri gizlenir,
- içerik daha büyük gösterilir,
- cevap/yönlendirme/açıklama yine klavye ile açılabilir,
- alt önceki/sonraki navigasyonu korunur.

Bu sayede öğrenciler “Cevabı göster” gibi öğretmen UI öğelerini görmez.

Üst menüde **Öğrenci ekranını aç** seçeneği ayrıca ikinci bir tarayıcı penceresi açar. Öğretmen görünümündeki adım, reveal ve kelime-anlam değişiklikleri bu pencereye anlık olarak senkronize edilir. İkinci ekran öğretmen kontrollerini göstermez.

## Düzenleme modu

`D` veya üst menüde **Düzenle** ile açılır.

İlk editor sürümü:

- ekranda gösterilen soru/başlığı canlı değiştirir,
- layout türünü canlı değiştirir,
- adımı yukarı/aşağı taşıyarak ders sırasını değiştirir,
- yönlendirme/cevap/kanıt/açıklama katmanlarının açılma sırasını değiştirir,
- süreç maddelerini ve bilgi kartlarını doğrudan düzenler,
- adım bazında Geniş / Normal / Kompakt içerik yoğunluğu seçer,
- değişiklikleri `localStorage` içinde saklar,
- yalnız ilgili adımı sıfırlayabilir,
- düzenlenmiş yapıyı `karagoz-flow.json` olarak dışa aktarabilir.

Bu düzenleme kanonik `answer-bank` içeriğini değiştirmez; yalnız presentation/lesson-flow katmanına uygulanır.

## Söz varlığı

Vocabulary görünümünde:

- kelime önce gösterilir,
- öğrenci bağlamdan tahmin yapabilir,
- her kelimenin anlamı ayrı ayrı açılabilir,
- `C` ile bütün anlamlar tek seferde gösterilebilir.

## Klavye

- ← / →: önceki / sonraki
- Space: sıradaki gizli öğretmen katmanını aç; tüm katmanlar açıksa sonraki adıma geç
- C: cevap
- G: yönlendirme
- E: açıklama
- D: düzenleme modu
- P: projeksiyon modu
- F: tam ekran
- Home / End: ilk / son adım

## Veri güvenlik kapıları

Karagöz pilotunda build şu koşullarda hata verir:

- s.15–35 içindeki gerekli source-index kaydı lesson-flow içinde yoksa,
- ilgili answer-bank kaydı lesson-flow içinde yoksa,
- vocabulary kaydında yapılandırılmış kelime/anlam verisi yoksa,
- lesson-flow bilinmeyen source/answer ID kullanıyorsa,
- soru sayfası ile bağlandığı source kaydı çelişiyorsa.

Ayrıntılı mimari: `docs/LESSON_PLAYER_PLAN.md`.
