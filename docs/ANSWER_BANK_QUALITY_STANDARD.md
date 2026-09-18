# Answer Bank Quality Standard

Bu belge, öğretmen rehberindeki cevap bankasının genel üretim kurallarını tanımlar.

Blok türlerine özgü zorunlu üretim davranışları için ayrıca [BLOCK_AUTHORING_STANDARD.md](BLOCK_AUTHORING_STANDARD.md) uygulanır. Bu iki belge yalnız 11. sınıf için değil, sonraki tüm sınıf ve tema üretimlerinde birlikte bağlayıcıdır.

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
14. Metin extraction, alt çizgi/renk/görsel/tablo yerleşimi gibi biçim bilgisini kaybedebilir. Cevap bu bilgiye bağlıysa gerçek sayfa görseli doğrulanmadan tahmin yapılmaz.
15. Harici medya içeren her soru otomatik `source_limited` değildir. Kitap metni cevabı destekliyorsa yalnız desteklenen kısım normal cevaplanabilir; medya özgü ayrıntılar eklenmez.
16. Araştırma, gezi ve kişisel deneyim görevlerinde sahte sonuç veya yaşanmışlık üretilmez; yöntem, şablon ve model ürün verilir.
17. Çok adımlı tek bir üretim süreci gereksiz yere ayrı cevaplara bölünmez; pedagojik olarak tek ürün oluşturuyorsa tek `performance_support` kaydında birleştirilebilir.
18. Dil bilgisi ve sınıflandırma sorularında bütün hedef ögelerin kapsandığı kontrol edilir; birkaç örnekle yetinilmez.
19. Ders kitabı varsayılan bilgi kaynağıdır. Kaynak dışı bilgi sessizce düzeltme veya tamamlama amacıyla eklenmez; dış bilgi kullanılacaksa açıkça ayrılır.
20. Kanonik `source_locator` teknik olarak PDF sayfasını tutabilir; kullanıcıya dönük görünümde varsayılan referans basılı sayfadır.
21. Kindle/EPUB çıktısında soru başlığı cevap gövdesinden kopmayacak şekilde kayıt yeni sanal sayfadan başlatılır.

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


## Yapısal cevap sunumu

Öğretmen rehberinde doğal olarak liste, eşleştirme, tablo, sınıflandırma, adım dizisi veya kişi/özellik karşılaştırması oluşturan cevaplar tek paragraf içine sıkıştırılmamalıdır.

- Üç veya daha fazla `terim: açıklama`, `öge → karşılık` ya da numaralı adım varsa `answer_sections` kullanılmalıdır.
- Sözlük/eşleştirme sorularında her kelime veya öge ayrı satır/alan olmalıdır.
- Kişi–özellik, değer–davranış, ölçüt–değerlendirme ve metinler arası karşılaştırmalar ayrı başlıklarla yapılandırılmalıdır.
- Süreç görevlerinde birbirinden bağımsız adımlar numaralı/liste yapısında tutulmalıdır.
- `Üç Yaz – İki Sor – Bir Paylaş`, altı şapka, öğrenme günlüğü gibi hazır şablonların alt başlıkları ayrı alanlara bölünmelidir.
- `answer` alanı, `answer_sections` zaten ayrıntıyı taşıyorsa kısa bir giriş/özet cümlesi olmalı; aynı maddeler paragraf biçiminde tekrar edilmemelidir.
- Diyalog, örnek mektup, örnek e-posta gibi gerçekten akış hâlinde okunması gereken metinler sırf noktalama içeriyor diye listeye dönüştürülmemelidir.

Bu kural ÖğretmenOS, EPUB ve diğer tüketicilerde aynı içeriğin okunabilir biçimde render edilmesi için veri katmanında uygulanır.
