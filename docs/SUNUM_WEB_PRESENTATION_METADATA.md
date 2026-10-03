# Sunum Web metadata sözleşmesi

Bu sözleşme `data/grade-11/presentation/theme-1..theme-4/web-presentation.json` yan dosyaları içindir. Ders kitabının yerel `data/book/grade-11/themes/theme-N/pages/*.json` metinleri ve kanonik cevap bankası içerik kaynağıdır. Metadata yalnız öğrenci sunumundaki cevap birimlerini ve kanıt sırasını belirler.

## Mevcut alanlar

- `schema_version` `1.0.0` veya `1.1.0` olabilir; `theme_id` yan dosyanın diziniyle ve kaynak indeksiyle aynı olmalı (`TEMA_01`–`TEMA_04`). `1.1.0`, `evidence_sections` ve `answer_text.fragments` ek alanlarını tanımlar. Bu alanlardan biri kullanılıyorsa sidecar sürümünü `1.1.0` yapın.
- `answers` anahtarları ilgili temanın cevap bankasında ve üretilen ders akışında bulunan `question_id` değerleri olmalı. Tanımsız ya da üretim akışında kullanılmayan eşleme derlemeyi durdurur.
- `units` içindeki her `id` benzersizdir. `sections` ve `items`, cevap bankasındaki ana cevap bölümlerini gösterir. Her kaynak bölümü tam bir kez kapsanmalıdır.
- `quote_links` her `evidence_quotes` dizinini en az bir cevaba bağlar. Aynı alıntı farklı cevap birimlerine bağlanabilir; aynı `(index, unit)` çifti yinelenemez.

## Kanıt bölümlerini cevaba bağlama

Bir `answer_sections` anahtarı alıntı ve ona özgü açıklama/dayanak içeriyorsa, onu bağımsız son cevap birimi olarak bırakmayın. İlgili cevap biriminin içine şu şekilde ekleyin:

```json
{
  "id": "tema",
  "sections": ["tema"],
  "evidence_sections": [
    { "key": "Metinden dayanaklar", "contains_quote_indexes": [0, 1] }
  ]
}
```

`evidence_sections` kaynak bölümünü silmez veya yeniden yazmaz. Bölüm, cevabın kendi açılışından sonra kanıt aşamasında gösterilir. Ana cevap bölümü bulunmayan bir kanıt birimi ancak o birime bağlanmış özgün bir `answer_text.fragments` parçası varsa geçerlidir; böylece kısa çıkarım önce, dayanak bölümü sonra açılır. `contains_quote_indexes`, kaynak bölümünde zaten yazılı olan alıntıların aynı cevap birimi için ayrıca `evidence_quotes` kartı olarak yinelenmesini önler. Bu dizinler aynı birimin `quote_links` listesinde bulunmalıdır. Başka cevap birimlerine yapılan açık bağlantılar korunur. Cevap ve kanıt kapsamının tamamı derleyici tarafından doğrulanır; metin benzerliğinden otomatik sınıflandırma yapılmaz.

## Toplu cevap metni

- Bölümlü cevapta varsayılan davranış toplu `answer` özetini atlamaktır.
- `answer_text: { "mode": "omit", "reason": "..." }` bunu açıkça kaydeder.
- Bölümlü cevapta `include`, tek cevap birimi olsa bile yalnız açıkça seçilmiş kaynak parçalarını kabul eder. Tam toplu cevap metnini bir cevaba kopyalamak geçersizdir.
- Yapılandırılmamış tek bir metin cevabı varsayılan olarak tam metinle açılır ve cümle sınırlarından devam sayfalarına bölünür. Yapılandırılmış yanıttaki özgün giriş/sonuç parçalarını korumak için yalnız belirli parçaları seçin:

```json
{
  "mode": "include",
  "fragments": [
    { "unit": "konu", "text": "Cevap metnindeki özgün giriş cümlesi.", "position": "start" },
    { "unit": "ana-düşünce", "text": "Cevap metnindeki özgün sonuç cümlesi.", "position": "end" }
  ]
}
```

Parça metni kaynak `answer` alanında aynen bulunmalıdır. `position` verilmezse `start` kullanılır. Böylece benzersiz çerçeve cümleleri korunurken diğer bağımsız yanıtlar ilk birimde erkenden görünmez.

`layout: "vocabulary"` adımlarında `answer_text.fragments` bir sözlük teriminin birim kimliğine bağlanır. Parça, o terimin yer aldığı cevap grubunda açılır; gizli bir sonraki grup istemine eklenmez. Bu özel durumda yan dosya yalnız `answer_text` alanı tanımlar; terim gruplamasını ders akışı belirler.

## Üretim doğrulaması

`apps/sunum-web/scripts/test-data.mjs` şifreli `dist/data.*.bin` kataloğunu çözer; yan dosyalardaki her eşlemenin kanonik derlenmiş akışta ve öğrenci sitesinin üretim kataloğunda yer aldığını denetler. Gerçek tarayıcı doğrulaması bu üretim kataloğunu `dist/` üzerinden açmalıdır; izole fixture sonucu üretim entegrasyonu sayılmaz.
