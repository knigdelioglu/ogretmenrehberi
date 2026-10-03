# Tema 1 içerik ve kanıt inceleme notu

## Kapsam ve kaynak

- Kapsam yalnızca 11. sınıf Türk Dili ve Edebiyatı Tema 1'dir.
- Kitap kaynağı depodaki `data/book/grade-11/themes/theme-1/pages/p012.json`–`p083.json` sayfa JSON'larıdır. PDF bu incelemede kullanılmadı.
- Kanonik cevap bankası içeriği değiştirilmedi; çalışma, Sunum Web'de cevapların sunuluş sırası ve kitap alıntılarının eşleştirilmesiyle sınırlı kaldı.

## İnceleme durumu

- **Cevap sunumu:** 157 cevap adımı incelendi. Sözlüksel cevaplar mevcut akışlarını koruyor; diğer 153 cevap için sunum birimleri yapılandırıldı. Yapılandırılmış cevaplarda toplu özetin tekrar gösterilmesi önlendi. Bağımsız yanıtlar ayrı açılıyor; anlamlı karşılaştırmalar birlikte kalıyor.
- **Birim ve alıntı bağlantıları:** Üretim kataloğunda 493 cevap birimi var. Kanıt içeren 55 cevapta 187 alıntı bağlantısı kuruldu; 11 açıklama bölümü yedi cevapla eşleştirilerek alıntıların tekrar kartı oluşturmadan cevapla birlikte görünmesi sağlandı.
- **Kitap metni kontrolü:** 187 alıntının tümü Tema 1 kitap JSON metin katmanında doğrulandı. 178 alıntı boşluk ve madde işareti normalizasyonuyla doğrudan bulundu; 9 alıntıda satır sonunda bölünmüş sözcükler birleştirilince eşleşti.
- **İçerik doğruluğu sınırı:** Cevapların yeni bir edebî/öğretimsel doğruluk denetimi yapılmadı; kanonik cevap metinleri değiştirilmedi. Bu not, sunum yapısı ve kanıt metninin kaynağına ilişkin denetimi kaydeder.

## Açık kaynak ve kalite durumu

- `T01-S0130`, basılı s.67'deki QR video kaydıdır. Kaynak iş listesinde videonun içerik ve altyazı incelemesi beklemede olduğundan bu kayıt ders sunumuna yansıtılmamıştır.
- Tema 1 kaynak manifestosu 129 kayıt beklerken kaynak dizininde 130 kayıt bulunuyor. Bu fark nedeniyle Lesson Player `npm run build` içindeki `test:data` ve OgretmenOS projeksiyon üretimi başarısız oluyor (`UNPROJECTED_SOURCES: T01-S0130`). Kaynak kaydı veya kalite dondurma ölçütü değiştirilmedi; bu iki kalite/aktarış kapısı açık kalıyor.

## Doğrulama

- `npm test --prefix apps/sunum-web` geçti: 48 ders ve 936 adımlı üretim kataloğu; veri, sunum akışı ve PPTX paket regresyonları. Şifreli katalog Tema 1 için 493 cevap birimi ve 187 kanıt alıntısı içeriyor.
- `CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:browser --prefix apps/sunum-web` geçti: dört temanın üretim akışı ve görsel PPTX dışa aktarımı headless Chrome'da doğrulandı.
- Tema 2, 3 ve 4'ün ayrı üretim Chrome regresyonları da geçti; cevap/kanıt sırası, gruplu cevaplar ve ilgili dar/geniş yerleşimler denetlendi.
- Lesson Player `npm run test:runtime` (936 adım), `npm run test:pptx-plan`, TypeScript denetimi, Vite derlemesi ve Tema 1 Kindle EPUB üretimi geçti.
