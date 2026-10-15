# PR #99 — Pedagojik cevap denetimi ve ilerleme kaydı

**Karşılaştırılan temel sürümler:** PR #99 öncesi `6f029e0`, PR #99 sonrası `ce8406d`, güncel cevap bankası. Her kayıt eski yanıt–yeni yanıt–ders kitabındaki soru–mevcut kanıtı birlikte ele alınmadan 'tamamlandı' sayılamaz.

**Tur 1:** İlk beş cevap (`T1-P53-Q01`, `T1-P53-Q02`, `T1-P66-Q01`, `T1-P66-Q04`, `T1-P66-Q05`) karşılaştırıldı ve onarıldı.

| Kayıt | PR #99'un olumsuz pedagojik etkisi | Bu turdaki iyileştirme | Doğruluk sınırı |
| --- | --- | --- | --- |
| T1-P53-Q01 | Sahne örnekleri ve çok modlu anlatım işlevi kısaldı | Üç sahneyle engel eşleştirmesi ve çok modlu bağlam eklendi | Doğrulanmamış birebir Seksenler repliği kullanılmadı |
| T1-P53-Q02 | Engel–etki–çözüm gerekçelendirmesi azaldı | Tahtaya aktarılabilir üç neden–sonuç–çözüm örneği verildi | Gözlem/çıkarım ayrımı korundu |
| T1-P66-Q01 | Araştırma–izleme karşılaştırması işlevsiz hâle geldi | Mektup–e-posta araştırma örneği, ekran kanıtı ve çıkarım eklendi | Başka sözlü söyleşi bölümleri uydurulmadı |
| T1-P66-Q04 | Konu–tema cevabı yerine sadece sınır uyarısı kaldı | İki gerekçeli cevap ve konu–tema–ana düşünce ayrımı geri geldi | Bütün konuşma çözülmüş gibi davranılmadı |
| T1-P66-Q05 | Ana-yardımcı düşünce örnekleri silindi | Bir örnek ana ve üç yardımcı düşünce, ekran kanıtlarıyla verildi | Ekran alıntısı ile bağımsız tarihsel doğrulama ayrıldı |

## Çalışma ilkesi
1. Soruyu ders kitabının basılı sayfasından kontrol et.
2. Önceki sürümdeki yararlı edebî çözümlemeyi **kanıt gerekliliklerini kaybetmeden** geri kazan.
3. `answer` ve `answer_sections` içinde öğrenciye gösterilebilecek somut cevap, örnek ve gerekçe olsun. Öğretmen değerlendirme dili `guidance`/`explanation` içinde kalsın.
4. Medyadan birebir söz aktarılacaksa arşivlenmiş doğrulanmış ses kanıtı kullan. Kaydı incelemiş olma beyanı, kendi başına kelimesi kelimesine transkript değildir.
5. Düzeltme sonrası ortak içerik, kaynak, web tarayıcı ve Android testlerini çalıştır.

## PR #99 yanıt/alan değişiklikleri: inceleme kuyruğu
Bu liste **patch'in tek cevap kimliği taşıyan parçalarından** oluşturuldu. Çoklu kimlikli parçalar veya salt kaynak/sayaç değişiklikleri ayrıca tam dosya karşılaştırmasında incelenmelidir; dolayısıyla bu liste eksiksiz nihai envanter değildir.

| Kayıt | Durum | Dosya |
| --- | --- | --- |
| `T1-P64-Q01` | Bekliyor | `data/grade-11/source/teacher-book/theme-1/answer-bank/part-15-pages-64-67.json` |
| `T1-P67-Q09` | Bekliyor | `data/grade-11/source/teacher-book/theme-1/answer-bank/part-15-pages-64-67.json` |
| `T1-P83-Q13` | Bekliyor | `data/grade-11/source/teacher-book/theme-1/answer-bank/part-20-pages-79-83.json` |
| `T2-P140-VOC01` | Bekliyor | `data/grade-11/source/teacher-book/theme-2/answer-bank/part-09-pages-136-141.json` |
| `T2-P141-Q01` | Bekliyor | `data/grade-11/source/teacher-book/theme-2/answer-bank/part-09-pages-136-141.json` |
| `T2-P141-Q02` | Bekliyor | `data/grade-11/source/teacher-book/theme-2/answer-bank/part-09-pages-136-141.json` |
| `T2-P145-PERF01` | Bekliyor | `data/grade-11/source/teacher-book/theme-2/answer-bank/part-10-pages-142-147.json` |
| `T4-P307-Q13` | Bekliyor | `data/grade-11/source/teacher-book/theme-4/answer-bank/part-12-pages-303-307.json` |
| `T4-P307-Q14` | Bekliyor | `data/grade-11/source/teacher-book/theme-4/answer-bank/part-12-pages-303-307.json` |

## Durma noktası
Tur 1'deki beş cevap işlendi. Sonraki tur başlamadan mevcut PR CI durumunu doğrula. Devamda Tema 1 s.67 Q06–Q09, ardından s.72–73 ve Tema 2 video sorularını tek tek karşılaştır. Kanıt kalitesi düşerse veya ifadeler genel açıklamalara dönüşürse ek içerik üretimini durdur ve bu belgeyi güncelle.
