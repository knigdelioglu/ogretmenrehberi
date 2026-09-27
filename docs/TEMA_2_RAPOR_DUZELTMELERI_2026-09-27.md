# Tema 2 — Dış Rapor Değerlendirmesi ve Yapılan Düzeltmeler (2026-09-27)

Dış kalite raporu ders kitabı PDF'i (basılı s.86–159) ile yeniden karşılaştırıldı. Rapordaki bulgular olduğu gibi uygulanmadı; her biri metne karşı doğrulandı.

## Düzeltilen kayıtlar

| Kayıt | Değişiklik |
|---|---|
| T2-P100-Q02 | “Kederine saygı” metin dışı gerekçesi çıkarıldı; metindeki iki neden (caydırmanın yararsızlığı, öz anne olmama çekincesi) iki birebir kanıtla verildi. |
| T2-P100-Q06 | **Raporda yoktu.** “Demirci nüfuzu”, “vatan savunması”, “erkeklik gururu” metinde yok; kızların gerçek gerekçeleri (askerlik yaşı, hasta anne, subaya anlatma) yazıldı. |
| T2-P100-Q07 | “Vatan borcu”, “onur/erkeklik” çıkarıldı. Soru “yorumlayınız” dediği için yorum katmanı silinmedi; açık gerekçeden sonra, kanıtlı yorum olarak ayrıldı. |
| T2-P101-Q10 | Açık iletiler olay bilgisi yerine metindeki doğrudan öğütlerle değiştirildi. “Bozkır yolu” (metinde dağ yolu/vadi), “Sovyet-Kırgız”, “bozkır kültürü” kaldırıldı. İç çözümleme ile hayalî konuşma/iç monolog ayrıldı. Üslup kanıtlandı. |
| T2-P99-Q03 | Kırgız kalpağı, Semerkant–Buhara, bağlama genellemesi çıkarıldı. **Rapordan farklı olarak** yurt, halı, atlılar, okçuluk önerilmedi; bunlar zaten sayfadaki altı görselde var ve soru “yukarıdaki görsellerin dışında” diyor. |
| T2-P105-Q02, T2-P107-PERF02 | “Hür irade” → “kişinin kendi kararına saygı (yorum)”. Kitabın istediği millî/manevi/evrensel üçlü yapı korundu (rapordaki “metinden doğrudan/yorum” bölmesi kitabın görev yapısına uymuyordu); yorum olan maddeler etiketlendi. |
| T2-P122-Q04 | Yedi amacın hepsini doldurma eğilimi giderildi: belirgin amaçlar, ikincil işlev (estetik haz) ve belirgin olmayan (kanıları değiştirmek) ayrıldı. |
| T2-P127-Q01 | Değerler ile gündelik hayata ilişkin kültürel bilgiler ayrı listelendi. |
| T2-P157-Q03 | **Raporda yoktu.** Cevap (A) doğruydu ama gerekçe zayıftı; asıl neden olan Kamus-ı Türkî'nin 19. yüzyıl/Tanzimat eseri olması açıklandı. |
| T2-P143-Q03 | Tamamen video/T diyagramına bağlı olduğu için `source_limited` yapıldı. |
| T2-P143-Q04 | `question_answer` kaldı (Münacaat kısmı kitapta var); `source_locator` alanına “âşık şiiri kısmı için QR video gerekli” eklendi. |
| T2-P120-Q03, T2-P138-Q01, T2-P144-Q02 | `...` ile birleştirilmiş kanıtlar kesintisiz birebir alıntıya çevrildi. |

Sayılar: `source_limited` 9 → 10, `question_answer` 119 → 118. `answer-bank.json` ve `manifest.json` güncellendi.

## Rapordaki hatalı veya yanıltıcı noktalar

- “158 doğrulanmış kaynak + 9 source_limited = 167” eşleşmesi tesadüftür. Source kayıtları ile cevap kayıtları farklı birimlerdir (ör. T02-S0128 üç cevaba bağlanır).
- s.99 için önerilen yurt/halı/atlı yaşam örnekleri sayfadaki görselleri tekrar ediyordu.
- T2-P100-Q07 bir yorum sorusudur; yorum katmanının tamamen kaldırılması soruyu eksik cevaplar.

## Bu turda yapılmayanlar (mimari karar gerektirir)

- `slide_answer` / `teacher_answer` ayrımı: bütün temaları, sunum-web ve Lesson Player sözleşmesini etkiler. Tema 2'ye özel yapılmadı.
- s.132 ülke karşılaştırma matrisi ve s.149 sanal müze listesi için doğrulanmış öğretmen referansı: güncel dış araştırma gerektirir; ayrı bir katman olarak planlanmalı.
