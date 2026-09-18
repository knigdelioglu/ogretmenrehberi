# Answer Bank Quality Standard

Bu belge, öğretmen rehberindeki cevap bankasının üretim kurallarını tanımlar.

## Temel yapı

Her kayıt gerçek kitap sorusuna veya cevap gerektiren kitap etkinliğine bağlanır.

Zorunlu alanlar:

- `question_id`
- `printed_page`
- `prompt_summary`
- `answer`
- `source_locator`

İhtiyaca göre `entry_type` kullanılabilir:

- `question_answer`: Doğrudan cevaplanabilir soru.
- `performance_support`: Konuşma, yazma, drama veya benzeri üretim görevleri için tek doğru iddiası taşımayan örnek plan / örnek ürün.
- `source_limited`: QR video, dinleme kaydı veya dış içerik görülmeden kesinleştirilemeyen soru. Bu tür kayıtta bilgi uydurulmaz; sınır açıkça belirtilir.

Opsiyonel alanlar:

- `guidance`: Öğrenci soruyu anlamakta veya düşünmeye başlamakta zorlanabilecekse kısa öğretmen yönlendirmesi.
- `explanation`: Cevabın öğretmen açısından ayrıca açıklanması gereken bir nüansı varsa.
- `evidence_quotes`: Cevabı metne dayandırmak için gerekli kısa alıntılar. ÖğretmenOS ve EPUB bunları kalın gösterebilir.

## İçerik ilkeleri

1. Her soruya otomatik olarak yönlendirme eklenmez.
2. `expected_answer`, `wrong_answer`, `misconception`, `teacher_moves`, `why_it_matters` gibi yapay katmanlar kullanılmaz.
3. Cevap öğretmenin sınıfta doğrudan kullanabileceği uzunlukta olmalıdır: tek kelimelik/yüzeysel olmamalı, gereksiz ders anlatımına da dönüşmemelidir.
4. Açık uçlu sorularda tek doğru varmış gibi davranılmaz; kullanılabilir bir örnek cevap verilir ve gerekiyorsa `guidance` ile farklı gerekçeli cevapların kabul edilebileceği belirtilir.
5. Metne dayalı sorularda cevap metnin bağlamına dayanır. Gerekli kısa ifadeler `evidence_quotes` içinde tutulur.
6. Görsel, QR video veya dış kaynak görülmeden kesin cevap üretilemeyecekse bilgi uydurulmaz.
7. Eski answer-bank içerikleri yeni cevap üretiminde kaynak olarak kullanılmaz.
8. İçe aktarılmış legacy soru envanteri eksiksizlik kaynağı kabul edilmez; gerçek kitap sayfası nihai kontroldür.
9. Aynı genel cümle farklı sorulara kopyalanmaz; her cevap sorunun bağlamına özgü yazılır.
10. Büyük toplu üretim yapılmaz. İçerik doğal ders blokları hâlinde üretilir ve gözden geçirilir.
11. Konuşma, yazma ve performans blokları klasik cevap anahtarına zorlanmaz. Görev bir ürün oluşturmayı gerektiriyorsa `performance_support` ile sınıfta kullanılabilir örnek plan veya örnek ürün verilir.
12. Öz değerlendirme ve akran değerlendirme formlarında doğru cevap üretilmez; bunlar öğrencinin gerçek performansına göre doldurulur.
13. QR video / dinleme içeriği erişilebilir değilse videoda görülmeyen ayrıntılar kesinmiş gibi yazılmaz.

## Alıntı gösterimi

Veride Markdown işareti saklamak yerine kısa alıntılar ayrı tutulur:

```json
{
  "answer": "…",
  "evidence_quotes": [
    "taklit, bu oyunların en önemli ögelerinden biridir"
  ]
}
```

ÖğretmenOS bu alanı kalın metin; EPUB üreticisi `<strong>` olarak gösterecektir.
