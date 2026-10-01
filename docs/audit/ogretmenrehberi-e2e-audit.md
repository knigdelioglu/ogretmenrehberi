# ÖğretmenRehberi E2E denetimi — 1. Tema

**Kapsam:** Yalnızca 1. Tema, basılı s. 12–83.  
**Ana kaynak:** Kullanıcının eklediği `Edebiyat 11 ders kitabı.pdf`; sayfa eşleştirmesinde basılı ve PDF sayfa numaraları ayrı tutulur.  
**Denetim yöntemi:** PDF görseli ve metni → bağımsız değerlendirme → gerçek Sunum Web akışı ve açılma katmanları. Bu rapor yalnızca tespit içerir; uygulama/veri değişikliği yapılmadı.

| PDF aralığı (basılı s.) | Durum | İncelenen sunum kartı/etkinlik | Bulunan sorun |
|---|---|---:|---:|
| 12–14 | DONE | 3 | 0 |
| 15–35 | DONE | 50 | 8 |
| 36–52 | DONE | 46 | 10 |
| 53–58 | DONE | 14 | 2 |
| 59–73 | DONE | 39 | 3 |
| 74–78 | DONE | 17 kart | 3 |
| 79–83 | DONE | 14 kart (13 soru) | 1 |

## Bulgular

## ISSUE-001 — Öğrenciye gösterilen slaytta öğretmen yönergesi

**Durum:** OPEN  
**Tür:** PRESENTATION_LANGUAGE  
**PDF sayfası:** Basılı s. 15  
**Bölüm:** Geleneksel Türk tiyatrosu / “Seyirlik Halk Oyunları”  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 1/50

### PDF / beklenen durum
Basılı s. 15'te metin sonrasında dört açık uçlu soru yer alır. Karekod çalışması sorular arasında öğretmene dönük zorunlu bir sınıf yönergesi değildir.

### Sunumda gözlenen durum
Öğrenciye görünen yönerge alanında “Geleneksel Türk Tiyatrosu karekod çalışması erişilebiliyorsa destekleyici kaynak olarak açın.” deniyor.

### Neden sorun
“Açın” yönergesi öğretmen/uygulayıcıya hitap ediyor ve doğrudan öğrenciye gösterilen ders sunumunda meta ifade olarak kalıyor.

### Beklenen davranış
Yansıtılan metin öğrenciye dönük ders materyali olmalı; öğretmen işlemi sunumda görünmemeli.

### Yeniden üretme
1. Sunum Web'de “Karagöz — Yazıcı” dersini açın.
2. Basılı s. 15 yönerge slaydına gelin.

---

## ISSUE-002 — Tipleri tahmin ettiren etkinlikte görseller yok

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 16  
**Bölüm:** “Sıra Sizde” — Karagöz tipleri  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 7–8/50

### PDF / beklenen durum
Basılı s. 16'da adları tahmin edilecek üç Karagöz tipi görselle verilmiştir. Sonraki sorular bu görsellere ve tiplerin ayırt edici fiziksel özelliklerine dayanır.

### Sunumda gözlenen durum
7/50'de “Bu tiplerin adlarını tahmin ediniz.” sorusu; 8/50'de fiziksel özelliklerden kişilik tahmini sorusu gösteriliyor. Her iki slaytta da üç görsel yok; cevap açıldığında da görseller görünmüyor.

### Neden sorun
Etkinliğin temel kanıtı olan görseller olmadan tipleri tanıma ve görünüşten kişilik çıkarma görevleri ekranda gerçekleştirilemiyor.

### Beklenen davranış
PDF'deki üç görsel, bu görsellere dayalı sorular gösterilirken sunumda bulunmalı.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 16 / 7/50 slaydına ilerleyin.
2. İlk açılışta görsel alanını inceleyin.
3. Cevabı açın ve sonraki ilgili soruya (8/50) ilerleyin.

---

## ISSUE-003 — Dönem dili sorusunun yanıtı cümle örneklerini kapsamıyor

**Durum:** OPEN  
**Tür:** INCOMPLETE_CONTENT  
**PDF sayfası:** Basılı s. 17 (metin: basılı s. 18–24)  
**Bölüm:** “Bir Diyeceğim Var!” / Yazıcı metnine göz gezdirme  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 12/50

### PDF / beklenen durum
Basılı s. 17, “Dönemin dil özelliklerini yansıttığını düşündüğünüz kelime ve cümleleri tespit ediniz.” der. Yazıcı metninden dönem dilini yansıtan kelimelerle birlikte cümle örnekleri de seçilebilir; örneğin “Bendenize vurmadan mûrâdınız?” ve “Bendenize vurmanın esbâb-ı mûcibesi?”

### Sunumda gözlenen durum
Soru ilk açılışta tek başına gösteriliyor. Cevap açılınca eski kelime ve tamlamalardan altı örnek ile Hacivat/Çelebi'nin ağır dili ve Karagöz'ün halk söyleyişi arasındaki fark listeleniyor; metinden cümle örneği verilmiyor.

### Bağımsız değerlendirme
PDF'deki görev hem kelime hem cümle örneği istiyor. Sunumdaki örnekler kelime/tamlama düzeyinde; cümle örnekleri eksik.

### Neden sorun
Yanıt, sorunun istediği iki kanıt türünden yalnızca kelime/tamlama bölümünü karşılıyor.

### Beklenen davranış
Kelime/tamlama örneklerine ek olarak kaynak metinden en az bir dönem dilini gösteren cümle sunulmalı.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 17'deki ikinci soruya (12/50) ilerleyin.
2. İlk açılış durumunu, sonra cevabı ve metin kanıtı aşamalarını açın.

---

## ISSUE-004 — Dörtlük, anlam sorusunun dayanağı olarak sunulmuyor

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 29  
**Bölüm:** “Bir Diyeceğim Var!” / şiir ve atasözü  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 27/50

### PDF / beklenen durum
PDF'de Ahmet Kutsi Tecer'in “Allahım, ne güzel şey bu dost yüzü! / İnsanın kalbine dolan bu bakış! / Ey çorak ruhlara veren bu süsü, / Ey gönül, sana alkış, alkış, alkış!” dörtlüğü ile “Dost kara günde belli olur.” atasözü birlikte verilir. Soru, arkadaşlık anlamını ikisinden hareketle yorumlamayı ister.

### Sunumda gözlenen durum
27/50'nin ilk açılışında dörtlük ve atasözü gösterilmiyor. Cevap açıldığında yalnızca atasözünün zor zamanda dostun güvenilirliğini göstermesi açıklanıyor; metinden kanıt aşamasında da yalnız atasözüne dönülüyor.

### Bağımsız değerlendirme
Dörtlük, dostun yüzünü görmenin insana sevinç ve gönül ferahlığı vermesini; atasözü ise dostun zor günde belli olmasını öne çıkarır. Soru iki kaynağı da yorumun dayanağı yapmayı bekler.

### Neden sorun
Sorunun açıkça dayandığı şiir sunumda yok ve açılan yanıt şiirin katkısını kapsamıyor.

### Beklenen davranış
Dörtlük ile atasözü soru ekranında görünmeli; yanıt arkadaşlığın duygusal yakınlığını ve zor zamandaki desteğini birlikte yorumlamalı.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 29 / 27/50 slaydını açın.
2. İlk açılışta soru kaynaklarını kontrol edin.
3. Cevabı ve metinden kanıt aşamasını açın.

---

## ISSUE-005 — Yapı unsuru yanıtları sonraki grupları peşinen özetliyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 32  
**Bölüm:** “Birlikte Çalışalım” / Yazıcı metninin yapı unsurları  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 37–38/50

### PDF / beklenen durum
Basılı s. 32'de öğrenciler önce yapı unsurlarını çalışma kâğıdına belirler; sonraki adımlarda çatışmanın kaynağı/tarafları ile mekân, zaman ve kişilerin etkisini, ardından dil özelliklerine etkili yapı unsurunu tartışır. Bu başlıklar ayrı düşünme adımlarıdır.

### Sunumda gözlenen durum
37/50'nin ilk cevap aşaması kişi, mekân, zaman, çatışma ve dramatik örgünün tamamını özetliyor; ayrıntılar ancak sonraki aşamalarda sırayla açılıyor. 38/50'nin ilk cevap aşaması da çatışma kaynaklarını ve mekân/zaman etkisini önceden söylüyor; taraflar ile etkiler sonraki aşamalara bırakılıyor.

### Neden sorun
İlk tıklama, henüz açılmamış cevap gruplarının ana sonuçlarını görünür kılıyor ve öğrencinin her yapı unsuru/çatışma adımını ayrı ayrı düşünmesini engelliyor.

### Beklenen davranış
Önce görev veya soru gösterilmeli; her tıklamada yalnız o aşamanın cevabı açılmalı, sonraki grupların sonucu özetlenmemeli.

### Mevcut akış
- 37/50: bütün yapı unsurlarını özetleyen paragraf → kişiler → yer/zaman → çatışma → dramatik örgü.
- 38/50: kaynakları ve mekân/zaman etkisini önden söyleyen paragraf → taraflar → mekân/zaman/kişilerin etkileri.

### Beklenen akış
- 37/50: görev → kişiler → yer/zaman → çatışma → dramatik örgü.
- 38/50: soru → çatışmanın kaynağı → taraflar → mekân/zaman/kişilerin etkileri.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 32 / 37/50'ye ilerleyin.
2. Cevabı bir kez açıp ilk aşamadaki paragrafı görün.
3. Basılı s. 32 / 38/50'de ilk cevap aşamasını açın ve sonraki gruplarla karşılaştırın.

---

## ISSUE-006 — Fiilimsiler tablosunun cevap özeti tüm maddeleri erkenden açıklıyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 34  
**Bölüm:** “Fiilimsiler” çalışma tablosu  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 43/50

### PDF / beklenen durum
Tabloda altı cümledeki fiilimsilerin altını çizme, türünü ve işlevini belirleme istenir. Örnek satırdan sonra öğrencinin kalan maddeleri çözmesi beklenir.

### Sunumda gözlenen durum
43/50'de cevabın ilk aşamasındaki giriş paragrafı altı maddenin fiilimsi örneklerini ve işlevlerini topluca adlandırıyor. Tablo yanıtları daha sonra 1–2, 3–4 ve 5–6. maddeler biçiminde açılıyor.

### Bağımsız değerlendirme
PDF'de verilen örnek “yazılmış” sıfat-fiilinin sıfat görevinde kullanılmasıdır. Diğer beş madde, tür/işlev eşleştirmesi olarak ayrı ayrı belirlenebilir.

### Neden sorun
İlk cevap tıklaması, henüz çözülmemiş 3–6. maddelerin fiilimsi örneklerini açılma sırası gelmeden bildiriyor.

### Beklenen davranış
Önce tablo/soru görünmeli; ardından küçük madde gruplarının cevapları sırayla açılmalı. Giriş özeti ilerideki cevapları adlandırmamalı.

### Mevcut akış
Soru → 1–2. maddeler + altı maddenin tamamını açıklayan özet → 3–4 → 5–6.

### Beklenen akış
Soru → 1–2 → 3–4 → 5–6.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 34 / 43/50'ye ilerleyin.
2. İlk cevap tıklamasında giriş paragrafını inceleyin.
3. İkinci ve üçüncü cevap aşamalarında önceden açıklanan maddeleri kontrol edin.

---

## ISSUE-007 — Öz değerlendirme formunun ölçüt tablosu sunumda yok

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 35  
**Bölüm:** “Süreci Değerlendirebilme” / öz değerlendirme  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 50/50

### PDF / beklenen durum
Basılı s. 35, altı ölçütü “Evet / Kısmen / Hayır” seçenekleriyle işaretleten bir Öz Değerlendirme Formu içerir: etkili iletişim ve saygı, görevi zamanında tamamlama, grup uyumu, sorun çözümüne katkı, arkadaş görüşlerini dikkate alma ve çalışmayı belirlenen sürede bitirme.

### Sunumda gözlenen durum
50/50 yalnızca “öz değerlendirme ve akran değerlendirmesi yapın” yönergesini ve “Kısmen/Hayır” seçilen becerileri gözden geçirme, eksikleri tamamlama ve akran çalışmasını değerlendirme adımlarını gösteriyor. Altı ölçüt ile Evet/Kısmen/Hayır tablosu sunumda yok.

### Neden sorun
Öğrencinin öz değerlendirme yapacağı ölçütler ekranda bulunmadığından PDF'deki form sunum üzerinden uygulanamıyor.

### Beklenen davranış
Sunum, altı ölçütü ve üç değerlendirme seçeneğini kullanılabilir bir tablo olarak göstermeli.

### Yeniden üretme
1. PDF basılı s. 35'teki Öz Değerlendirme Formu'nu inceleyin.
2. “Karagöz — Yazıcı” sunumunun 50/50 son slaydını açın.
3. Form ölçütleri ve yanıt sütunlarının sunumda bulunmadığını doğrulayın.

---

## ISSUE-008 — Değerlendirme cevaplarının özetleri sonraki boyutları erkenden veriyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 35  
**Bölüm:** “Süreci Değerlendirebilme” / 1–3. sorular  
**İlgili kayıt/etkinlik:** Karagöz — Yazıcı, 47–49/50

### PDF / beklenen durum
Basılı s. 35, önce dil/üslubun üç ayrı etkisini değerlendirtir; sonra çatışmaların mekân, zaman veya kişiler üzerinden nasıl güçlendirilebileceğini; son olarak başka hangi dil unsurlarının işe yarayacağını sorar. Sorular alt başlıklar üzerinden ayrı düşünmeyi gerektirir.

### Sunumda gözlenen durum
47/50'nin cevap 1/3 aşaması ilk alt başlığın ayrıntılarını gösterirken çatışmaya ve toplumsal-kültürel yansımaya ilişkin sonuçları da özetliyor. 48/50'nin cevap 1/2 aşaması kişiler ve zaman başlıklarını işlerken mekân önerisini de peşinen bildiriyor. 49/50'nin cevap 1/3 aşaması daha sonraki aşamalarda açılacak deyim/atasözü, mübalağa, tariz ve kinaye gibi dil unsurlarını önceden listeliyor.

### Neden sorun
İlk cevap aşamasında sonraki alt başlıkların yanıtları da görünür oluyor; öğrenci her değerlendirme boyutunu ayrı düşünemiyor.

### Beklenen davranış
Her soruda önce soru tek başına görünmeli; her tıklama yalnız sıradaki alt başlığın cevabını açmalı ve henüz açılmayan başlıkların sonucunu özetlememeli.

### Mevcut akış
- 47/50: tüm üç boyutu özetleyen paragraf → güldürü → çatışma → toplumsal/kültürel yansıma.
- 48/50: kişiler ve zaman ayrıntılarıyla birlikte mekânı da söyleyen özet → kişiler/zaman → mekân.
- 49/50: tüm dil unsurlarını sayan özet → ironi/ağız → deyim/atasözü ve abartma → tariz/kinaye.

### Beklenen akış
- 47/50: soru → güldürü → çatışma → toplumsal/kültürel yansıma.
- 48/50: soru → seçilen dramatik öge/öge grubu → diğer ögeler.
- 49/50: soru → ilk dil unsurları → sonraki dil unsurları.

### Yeniden üretme
1. “Karagöz — Yazıcı” dersinde basılı s. 35 / 47/50'de cevabı açın.
2. İlk özet ile sonraki iki cevap grubunu karşılaştırın.
3. Aynı ilk-aşama kontrolünü 48/50 ve 49/50'de tekrarlayın.

---

## ISSUE-009 — Kelime grupları anlamları açılmadan peş peşe gösteriliyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 39  
**Bölüm:** “Söz Varlığımız” / seçili ve bilinmeyen kelimeler  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 8/46 ve 10/46

### PDF / beklenen durum
İlk söz varlığı çalışmasında altı kelimenin anlamı bağlamdan tahmin edilir ve sözlükle doğrulanır. Sonraki açık uçlu söz varlığı çalışması öğrencinin metindeki diğer bilmediği kelimeleri seçmesini ister; sunumun örnek kelimeleri sekiz sözcükten oluşur. Küçük gruplarda kelimeler önce gösterilip o grubun anlamları açılmalı, sonra yeni gruba geçilmelidir.

### Sunumda gözlenen durum
- 8/46: ilk açılışta “umumiyetle, mücerretlik, tahlil”; bir tıklama sonra “mamafih, idealizm, vaka” gösteriliyor. Bu ikinci grup anlamlar açılmadan veriliyor. Ardından “anlamlar ... güvenilir bir sözlükle karşılaştırılabilir” genel açıklaması geliyor; sonraki iki aşamada önce ilk üç, sonra ikinci üç anlam açılıyor.
- 10/46: ilk açılışta üç kelime; sonraki iki aşamada üç ve iki kelime daha gösteriliyor. Üç kelime grubunun tamamından sonra genel açıklama geliyor; ardından cevap aşamalarında anlamlar ilk üç, ikinci üç ve son iki biçiminde veriliyor.

### Neden sorun
Öğrenci ilk gruptaki kelimelerin anlamını düşünmeden sonraki grup sunuluyor; cevapların önüne giren genel açıklama da grup sırasını bölüyor.

### Mevcut akış
- 8/46: ilk 3 kelime → sonraki 3 kelime → genel açıklama → ilk 3 anlam → sonraki 3 anlam.
- 10/46: ilk 3 kelime → sonraki 3 → son 2 → genel açıklama → ilk 3 anlam → sonraki 3 anlam → son 2 anlam.

### Beklenen akış
- 8/46: ilk 3 kelime → ilk 3 anlam → sonraki 3 kelime → sonraki 3 anlam.
- 10/46: ilk 3 kelime → ilk 3 anlam → sonraki 3 kelime → sonraki 3 anlam → son 2 kelime → son 2 anlam.

### Bağımsız değerlendirme
Görünen anlam eşleşmeleri metin bağlamına uygundur: “umumiyetle” genellikle/çoğunlukla; “mücerretlik” soyutluk; “tahlil” çözümleme; “mamafih” bununla birlikte/yine de; “vaka” olay. Sorun anlamların doğruluğu değil, öğretim sırasıdır.

### Yeniden üretme
1. “Mektup — Âli’ye Mektuplar” dersinde basılı s. 39 / 8/46'ya gelin.
2. İlk üç kelimeyi görünür kılın, bir kez ilerleyin ve ikinci üç kelimenin anlamlardan önce açıldığını gözlemleyin.
3. Aynı kontrolü basılı s. 39 / 10/46'da 3+3+2 kelime grupları için yapın.

---

## ISSUE-010 — İnsan ilişkileri çıkarımı iletişim araçlarıyla sınırlanmış

**Durum:** OPEN  
**Tür:** INCOMPLETE_CONTENT  
**PDF sayfası:** Basılı s. 44  
**Bölüm:** “Çözümleyebilme” / metnin yazıldığı dönem ve günümüz  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 26/46

### PDF / beklenen durum
Basılı s. 44'ün 3. sorusu ister ki öğrenci mektuptan dönemin **insan ilişkilerine** dair çıkarım yapsın ve bu çıkarımı günümüzün insan ilişkileriyle karşılaştırsın. Metin; Âli ile Mehmet Kaplan arasındaki güven ve yakınlığı, günlük hayatı ve düşünceleri paylaşmalarını, uzakta oldukları için mektuplaşma ve görüşme isteğini gösterir.

### Bağımsız değerlendirme
Mektup, Kaplan ile Âli'nin duygularını ve kişisel haberlerini açıkça paylaştığı, birbirine güvenip destek verdiği yakın bir arkadaşlığı gösterir. Dönemin mektuplaşması gecikebilir; buna karşılık bugünkü iletişim araçları haberleşmeyi hızlandırır. İlişki biçimlerini karşılaştırırken bu metnin tek başına geçmişteki bütün ilişkiler hakkında kanıt oluşturmadığı da belirtilmelidir.

### Sunumda gözlenen durum
İlk ekranda soru “Mektubun yazıldığı dönem ile günümüz iletişimi nasıl karşılaştırılabilir?” biçiminde daraltılmış. Açılan cevap geciken posta, haber isteme ve günümüzün dijital iletişim araçlarının hızını anlatıyor. Devam aşaması ise tek mektuptan dönemin bütün yazışmaları veya geçmişteki insan ilişkilerinin derinliği hakkında genelleme yapılamayacağını söylüyor. Kaplan ile Âli arasındaki yakınlık, güven ve paylaşım üzerinden insan ilişkileri karşılaştırması yapılmıyor.

### Neden sorun
Sunum sorusu PDF'deki “insan ilişkileri” odağını “iletişim”e indiriyor; cevap da haberleşme araçlarını karşılaştırdığı hâlde istenen ilişki dinamiklerini kapsamıyor.

### Beklenen davranış
Soru PDF'deki insan ilişkileri odağını korumalı. Yanıt, metindeki yakınlık/güven/paylaşımı günümüz ilişkileriyle ihtiyatlı biçimde karşılaştırmalı; iletişim araçlarının değişimini destekleyici bir boyut olarak kullanabilir.

### Yeniden üretme
1. “Mektup — Âli’ye Mektuplar” sunumunda s. 44 / 26/46 kartını açın ve ilk açılışta soruyu inceleyin.
2. Cevabı açıp iki cevabın insan ilişkileri boyutunu karşılayıp karşılamadığını kontrol edin.

---

## ISSUE-011 — Uzun cevap slaytında içerik ekran yüksekliğine sığmıyor

**Durum:** OPEN  
**Tür:** RENDERING  
**PDF sayfası:** Basılı s. 44  
**Bölüm:** “Çözümleyebilme” / toplumsal ve kültürel yapı  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 27/46, Cevap 1/2

### PDF / beklenen durum
PDF'de 4. soru, mektubun içerik, yapı, dil ve anlatım özelliklerinden hareketle dönem-toplum ilişkisini değerlendirtir. Bu değerlendirme sunumda okunabilir biçimde görünmelidir.

### Sunumda gözlenen durum
27/46'nın ilk cevap aşamasında uzun özet ve iki sütunda beş madde ile dış kaynak araştırma notu yer alıyor. Gerçek sunum ekranında slaytın dikey içeriği pencere yüksekliğini aşıyor: ilk gözlemde sorunun başlığı/cevabın başı görünür alandan yukarıda kalıyor; ekranı yukarı kaydırınca bu kez aşağıdaki maddeler ve slayt alt bilgisi görünür alanın altında kalıyor. Bütün yanıt tek ekranda okunamıyor.

### Neden sorun
Öğretmen projeksiyonunda veya sunum görünümünde yanıtın bir kısmı ekran dışında kalıyor; tamamını göstermek için slayt alanını ayrıca kaydırmak gerekiyor.

### Beklenen davranış
Soru başlığı, özet, tüm maddeler ve altbilgi sunum ekranında aynı anda okunabilir olmalı ya da slayt içeriği bilinçli, erişilebilir aşamalara ayrılmalı.

### Yeniden üretme
1. “Mektup — Âli’ye Mektuplar” dersinde 27/46 kartının cevabını açın.
2. İlk görünümde başlık/cevap metninin üst kısmını kontrol edin.
3. Slaytı yukarı kaydırınca son maddelerin ve altbilginin ekran dışında kaldığını gözlemleyin.

---

## ISSUE-012 — Ders dışı araştırma etkinliğinin bazı yönergeleri sunumda yok

**Durum:** OPEN  
**Tür:** INCOMPLETE_CONTENT  
**PDF sayfası:** Basılı s. 45  
**Bölüm:** “Ders Dışı Etkinlik” / Mektup Türünün Sosyal Bilimlerle İlişkisi  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 29–30/46

### PDF / beklenen durum
PDF etkinliği bir haftalık çalışma olarak tanımlar; üç gruba ayrılmayı, grup sözcüsü seçmeyi ve farklı mektup örneklerinden de yararlanarak Mektup-Tarih, Mektup-Sosyoloji ve Mektup-Psikoloji ilişkilerini araştırmayı ister.

### Sunumda gözlenen durum
29/46 başlangıç slaytı tarih, sosyoloji ve psikoloji alanlarında araştırma soruları üretmeyi söyler. Cevap aşamaları bu üç konu için ipuçları, sorular ve dış kaynak kullanma önerileri verir; 30/46 ise araştırma sonrası yansıtmayı ele alır. Buna rağmen bir haftalık süre, grup sözcüsü seçimi ve araştırmada farklı mektup örneklerinden yararlanma yönergesi gösterilmiyor.

### Neden sorun
Sunum konu başlıklarını ve araştırma desteğini içeriyor; PDF'deki süre/rol ve karşılaştırmalı örnek kullanımı yönergeleri bulunmadığından etkinliğin uygulama kapsamı eksik kalıyor.

### Beklenen davranış
Sunum, grupların hangi rolleri üstleneceğini, çalışmanın süresini ve Kaplan'ın mektubu dışındaki mektup örneklerinin de kullanılacağını açıkça belirtmeli.

### Yeniden üretme
1. PDF'nin basılı s. 45'indeki “Ders Dışı Etkinlik” adımlarını inceleyin.
2. Sunumda 29/46'nın ilk görünümünü ve üç cevap aşamasını açın.
3. 30/46 yansıtma kartına ilerleyin; belirtilen süreyi, sözcü seçimini ve diğer mektup örneği yönergesini arayın.

---

## ISSUE-013 — Yazma etkinliğinin dayandığı şiir sunumda yok

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 46  
**Bölüm:** “Süreci Değerlendirebilme” / şiirden mektuba dönüşüm  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 34/46

### PDF / beklenen durum
Basılı s. 46, Hüseyin Nihâl Atsız'ın “Geri Gelen Mektup” şiirini verir ve öğrenciden seçtiği beğeni ölçütlerine göre bu şiirle aynı içerikte bir mektup yazıp paylaşmasını ister. Şiirde uzaktaki sevgiliye duyulan özlem ve güçlü tutku imgelerle anlatılır.

### Sunumda gözlenen durum
34/46 ilk açılışta şiirden duygu ve imgeler hareketle mektup yazma görevini başlık olarak veriyor. Üç cevap aşamasında duygu/imgeleri seçme, hitap-gelişme-sonuç planı ve kısa başlangıç örneği sunuluyor; şiirin dizeleri, başlığı veya kaynak görseli hiçbir aşamada yer almıyor.

### Bağımsız değerlendirme
Mektup, şiirdeki özlem ve tutkulu sevgi duygusunu kendi sözleriyle sürdürmeli; şiir dizelerini kopyalamamalı. Sunumdaki yazma desteği bu dönüşümü anlatıyor ancak öğrencinin çalışacağı şiir kaynağını göstermiyor.

### Neden sorun
Şiire dayalı yazma görevi, şiir sunumda bulunmadığı için yalnızca sunum üzerinden yapılamıyor; metni yeniden PDF'den bulmak gerekiyor.

### Beklenen davranış
Etkinliğin ilk açılışında şiir ve yazma yönergesi birlikte gösterilmeli; cevap/yazma desteği tıklamayla açılmalı.

### Yeniden üretme
1. PDF basılı s. 46'daki “Geri Gelen Mektup” şiirini inceleyin.
2. Sunumda 34/46 kartını açın; ilk açılış ile üç cevap aşamasının tamamına ilerleyin.
3. Şiir dizelerinin ya da şiire erişim bağlantısının sunumda olmadığını doğrulayın.

---

## ISSUE-014 — Akran görüşünü tartışma görevi farklı bir soruyla değiştirilmiş

**Durum:** OPEN  
**Tür:** SOURCE_MISMATCH  
**PDF sayfası:** Basılı s. 47  
**Bölüm:** “Sıra Sizde” / metinsel ve nesnel gerçeklik  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 37/46

### PDF / beklenen durum
PDF'nin 3. adımı, öğrenciden arkadaşlarının bu konudaki görüşlerini almasını, bu görüşlere katılıp katılmadığını gerekçelendirmesini ister. Bu, akran görüşünü dinleme ve kanıta dayanarak tartışma etkinliğidir.

### Sunumda gözlenen durum
37/46 ilk açılışta “Mektubun gerçek yaşama dayanması onun tamamen tarafsız bir belge olduğu anlamına gelir mi?” sorusunu soruyor. Cevap aşamaları metinsel gerçeklik ile yazarın öznel bakışını açıklıyor; akran görüşü alma veya bir arkadaşın görüşüne katılma/katılmama adımı hiçbir aşamada yer almıyor.

### Bağımsız değerlendirme
Mektubun gerçek kişi, yer ve olaylara dayanması onun tümüyle tarafsız olduğunu göstermez; yazarın seçimi ve bakışı metne yansır. Bu açıklama akranların görüşleriyle tartışılabilir, ancak PDF'deki akran görüşü etkinliğinin yerine geçmez.

### Neden sorun
Sunumda aynı sayfanın 3. sorusu olarak farklı bir soru sunulmuş; PDF'nin akran tartışması görevi sunumda kaybolmuş.

### Beklenen davranış
Öğrencilerden arkadaşlarının görüşlerini almaları, kendi yanıtlarıyla karşılaştırmaları ve katılma/katılmama gerekçelerini metinsel kanıtla açıklamaları istenmeli.

### Yeniden üretme
1. PDF basılı s. 47'deki 3. adımı okuyun.
2. Sunumda 37/46 kartının ilk görünümünü ve iki cevap aşamasını açın.
3. Akran görüşü alma görevinin yer almadığını doğrulayın.

---

## ISSUE-015 — İletişim etkinliğinin dayandığı iki haber metni sunumda yok

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 48  
**Bölüm:** “Düşünelim Paylaşalım” / iletişim, zaman ve teknoloji  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 38–40/46

### PDF / beklenen durum
Basılı s. 48'de sorulardan önce iki haber metni okunur: Rodos'tan denize bırakılan mektubun Gazze'de bulunup arkadaşlığa dönüşmesi ve 1918'de yazılmış bir askerin mektubunun 103 yıl sonra torunlarına ulaştırılması. Sorular ilk metnin iletişim amacını, gecikmenin etkisini ve görsel işaretlerle emojiler arasındaki benzerliği tartıştırır.

### Sunumda gözlenen durum
38/46, 39/46 ve 40/46 ilk açılışlarında yalnız ilgili soru gösteriliyor. Cevap katmanlarında hikâyelerin bazı ayrıntıları özetleniyor; ancak iki haber metni, doğrudan alıntılar ve okunacak kaynak içeriği sunumun hiçbir aşamasında yer almıyor.

### Neden sorun
Etkinliğin soruları, öğrencilerin önce okuması istenen iki kaynak metne dayanıyor. Bu metinler sunumda olmadığı için etkinlik sunum üzerinden kaynaklı biçimde yürütülemiyor.

### Beklenen davranış
İki haber metni, ilk sorular açılmadan önce okunabilir biçimde sunulmalı; sonra her soru ve cevabı aşamalı açılmalı.

### Yeniden üretme
1. PDF basılı s. 48'deki iki haberi ve ardından gelen üç soruyu inceleyin.
2. Sunumda 38/46–40/46 kartlarını sırayla açın.
3. İlk açılışları ve cevapları kontrol edin; kaynak haberlerin sunumda gösterilmediğini doğrulayın.

---

## ISSUE-016 — Beş metinlik yazılış amacı cevabı sonraki grupları özetliyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 49–50  
**Bölüm:** “Sıra Sizde” / farklı dönemlerden beş iletişim örneği  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 41/46

### PDF / beklenen durum
S. 50'nin 1. sorusu beş metnin ayrı ayrı yazılış amaçlarını sorar. Öğrenci her metni okuyup amacını belirlemelidir; küçük gruplar hâlinde cevap açılması bu sırayı koruyabilir.

### Sunumda gözlenen durum
41/46'nın ilk cevap aşaması, ayrıntılı madde grupları açılmadan önce beş metnin cevaplarını topluca “hâl-hatır, moral, sağlık, özlem ve kavuşma isteği” olarak özetliyor. Sonraki aşamalar 1–2, 3–4 ve 5. metinlerin cevaplarını veriyor.

### Neden sorun
İlk tıklama, henüz açılmamış metinlerin amaçlarını önceden açıklayarak her metin için ayrı düşünme olanağını azaltıyor.

### Mevcut akış
Soru → beş metnin yanıtını özetleyen giriş → 1–2. metin → 3–4. metin → 5. metin.

### Beklenen akış
Soru → 1–2. metin → 3–4. metin → 5. metin.

### Yeniden üretme
1. “Mektup — Âli’ye Mektuplar” dersinde 41/46 kartının cevabını açın.
2. İlk cevap aşamasındaki toplu özeti, sonraki üç cevap grubuyla karşılaştırın.

---

## ISSUE-017 — Beş iletişim örneğinin kaynak metinleri sunumda yok

**Durum:** OPEN  
**Tür:** MISSING_CONTENT  
**PDF sayfası:** Basılı s. 49–50  
**Bölüm:** “Sıra Sizde” / beş farklı iletişim örneği  
**İlgili kayıt/etkinlik:** Mektup — Âli’ye Mektuplar, 41–44/46

### PDF / beklenen durum
Basılı s. 49–50, sorulardan önce beş kaynak metin sunar: Kutadgu Bilig'den hükümdar mektubu dizeleri, Necip Fazıl Kısakürek'in şiiri, Mustafa Kemal'in Doktor Rasim Ferit'e mektubu, *Taaşşuk-ı Talat ve Fitnat* içindeki Saliha mektubu ve Bekir Sıtkı Erdoğan şiiri. Sonraki sorular bu metinlerin amaçlarını, haberleşme işlevini, gerçekliği yansıtma biçimlerini ve tercih edilecek anlatımı karşılaştırır.

### Sunumda gözlenen durum
41–44/46 ilk açılışlarında yalnız ilgili soru yer alıyor. Cevap aşamaları kaynaklara ait kısa tanımlar ve örnek yargılar sunuyor; beş kaynak metnin dizeleri veya mektup bölümleri sunumda hiçbir aşamada görünmüyor.

### Neden sorun
Sorular beş metni okuyup karşılaştırmayı gerektiriyor. Kısa cevap özetleri kaynakları okumak ve kendi kanıtını seçmek için yeterli değil; metinlerin kendisi sunumdan erişilemiyor.

### Beklenen davranış
Beş kaynak metin okunabilir biçimde gösterilmeli veya her soru öncesinde ilgili metin yansıtılmalı; ardından cevaplar açılmalı.

### Yeniden üretme
1. PDF basılı s. 49–50'deki beş kaynağı ve soruları inceleyin.
2. Sunumda 41–44/46 kartlarını sırayla açın.
3. İlk açılış ve tüm cevap aşamalarında kaynak metinlerin gösterilmediğini doğrulayın.

---

## ISSUE-018 — Uzun cevap listeleri sunum alanının altına taşıyor

**Durum:** OPEN  
**Tür:** RENDERING  
**PDF sayfası:** Basılı s. 57–58  
**Bölüm:** Canlandırma uygulama adımları ve öz değerlendirme  
**İlgili kayıt/etkinlik:** Edebiyat Atölyesi-1 — Konuşma, 11/14 cevap; 12/14 cevap

### PDF / beklenen durum
Basılı s. 57 canlandırma ölçütlerini, s. 58 ise on maddelik öz değerlendirme formunu verir. Sunumda bu listelerin tamamı okunabilir olmalı.

### Sunumda gözlenen durum
11/14'ün cevap ekranında s. 57 uygulama ölçütleri tek uzun sol kolonda gösteriliyor. İlk görünümde listenin alt kısmı slayt alanının altında kalıyor; aşağı kaydırınca bu kez üst başlık ve önceki maddeler ekrandan çıkıyor. 12/14'ün cevap ekranındaki on maddelik öz değerlendirme listesi de ilk görünümde alt kenardan kesiliyor.

### Neden sorun
Sunum sırasında listenin tamamı aynı anda okunamıyor; içeriğin tümünü göstermek için slayt alanını ayrıca kaydırmak gerekiyor ve her kaydırmada listenin başka bir bölümü görünüm dışında kalıyor.

### Beklenen davranış
Liste, sunum alanına sığmalı ya da okunabilir ve kontrollü aşamalara ayrılmalı; başlık ve ilgili maddeler görünümde kaybolmamalı.

### Yeniden üretme
1. “Edebiyat Atölyesi-1 — Konuşma” dersinde 11/14 kartının cevabını açın.
2. İlk görünümde listenin son maddelerinin ekran dışında kaldığını gözlemleyin.
3. Aşağı kaydırın; bu kez listenin üst başlığının ve ilk maddelerinin görünümden çıktığını kontrol edin.
4. 12/14 kartının cevabını açıp on maddelik listenin alt kısmını kontrol edin.

---

## ISSUE-019 — Öz değerlendirme cevabı sonraki ölçüt grubunu erkenden açıyor

**Durum:** OPEN  
**Tür:** PRESENTATION_FLOW  
**PDF sayfası:** Basılı s. 58  
**Bölüm:** Öz değerlendirme formu / 10 ölçüt  
**İlgili kayıt/etkinlik:** Edebiyat Atölyesi-1 — Konuşma, 12/14–13/14

### PDF / beklenen durum
PDF'de öğrenciler on ölçütün her biri için Evet/Kısmen/Hayır seçerek kendi performanslarını değerlendirir. Bu kişisel değerlendirmede tek bir doğru cevap yoktur; ölçütlerin ilk ve ikinci yarısı ayrı sunum aşamalarında ilerler.

### Sunumda gözlenen durum
12/14'ün ilk açılışı ilk dört ölçütü, sonraki görev aşaması beşinci ölçütü gösteriyor. Cevap açılınca aynı karta on ölçütün tamamı ve sonraki değerlendirme soruları geliyor. Hemen sonraki 13/14 kartı “Öz değerlendirme — 2/2” başlığıyla ikinci yarıdaki ölçütleri yeniden görev olarak gösteriyor.

### Neden sorun
İlk yarının cevabını açan tıklama, ikinci yarı için ayrılmış ölçütleri de erkenden gösteriyor; sonra aynı ölçütler bir sonraki kartta yineleniyor. Bu akış, öğrencinin ikinci grubu ayrı aşamada değerlendirmesini ve öğretmenin bu aşamayı kontrollü açmasını engelliyor.

### Beklenen davranış
12/14'ün cevap aşaması yalnız ilk gruba karşılık gelmeli. 13/14'teki kalan ölçütler, ikinci yarı açıldığında ilk kez görünmeli.

### Yeniden üretme
1. Sunumda 12/14 Öz Değerlendirme kartını açın.
2. İlk beş ölçütü gördükten sonra cevabı açın; tüm on ölçütün gösterildiğini doğrulayın.
3. 13/14 “Öz değerlendirme — 2/2” kartına ilerleyin; ikinci yarıdaki ölçütlerin tekrarlandığını gözlemleyin.

---

## ISSUE-020 — Gözlem formu öz değerlendirmeye dönüşmüş ve ölçek kaybolmuş

**Durum:** OPEN  
**Tür:** SOURCE_MISMATCH  
**PDF sayfası:** Basılı s. 64  
**Bölüm:** Çok modlu metni dinleme/izleme / Gözlem Formu  
**İlgili kayıt/etkinlik:** Metin Tahlili-3 — Dinleme / İzleme, 16/39

### PDF / beklenen durum
PDF'de öğretmenin dinleme/izleme performansını sekiz ayrı ölçüte göre Evet/Kısmen/Hayır seçenekleriyle değerlendireceği Gözlem Formu bulunur.

### Sunumda gözlenen durum
Kart “Dinleme / izleme öz değerlendirmesi” olarak açılıyor. Cevap aşamaları ölçütleri öğrenci öz değerlendirmesi biçiminde sunuyor; PDF'deki Evet/Kısmen/Hayır değerlendirme ölçeği yok ve iki ölçüt tek ifadede birleştirilmiş.

### Neden sorun
Değerlendirmeyi yapan kişi ve kayıt biçimi değiştirilmiş; formun kaynakta bulunan ölçüt yapısı tam olarak korunmuyor.

### Beklenen davranış
PDF'deki öğretmen gözlem formu ve üçlü değerlendirme seçenekleri sunumda yer almalı. Öz değerlendirme ekleniyorsa kaynak formun yerine geçirilmemeli.

### Yeniden üretme
1. “Metin Tahlili-3 — Dinleme / İzleme” dersinde 16/39 kartını açın.
2. İlk açılış başlığını ve cevap aşamalarını inceleyin.
3. PDF basılı s. 64'teki Gözlem Formu'nun sekiz ölçütü ve Evet/Kısmen/Hayır ölçeğiyle karşılaştırın.

---

## ISSUE-021 — Kelime ağacında sonraki grup anlamlardan önce gösteriliyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 65  
**Bölüm:** Kelime ağacı / sözcük-anlam eşleştirme  
**İlgili kayıt/etkinlik:** Metin Tahlili-3 — Dinleme / İzleme, 17/39

### PDF / beklenen durum
PDF'de altı sözcük ve anlamları eşleştirme etkinliği vardır. Öğrenci önce küçük bir sözcük grubunu görüp eşleştirmeyi düşünmeli, sonra o grubun anlamlarını açmalı; bundan sonra sonraki gruba geçmelidir.

### Sunumda gözlenen durum
İlk tıklama Tasavvur, Nörolojik ve Güdü sözcüklerini gösteriyor. İkinci tıklama bu grubu anlamları açılmadan kaldırıp Medeni, Sosyal ve Muhabbet sözcüklerini gösteriyor. Sonraki aşama iki grubun eşleştirmelerini bir arada özetliyor; ancak daha sonraki tıklamalarda ilk ve ikinci grubun anlamları ayrı ayrı açılıyor.

### Mevcut akış
İlk 3 sözcük → sonraki 3 sözcük → iki grubun toplu özeti → ilk 3 anlam → sonraki 3 anlam.

### Beklenen akış
İlk 3 sözcük → ilk 3 anlam → sonraki 3 sözcük → sonraki 3 anlam.

### Neden sorun
İlk sözcük grubu cevaplanmadan sonraki grup gösteriliyor; toplu özet de iki grubun bağımsız düşünme sırasını bozuyor.

### Yeniden üretme
1. “Metin Tahlili-3 — Dinleme / İzleme” dersinde 17/39 kelime ağacını açın.
2. İlk açılışı ve sonraki üç tıklamayı sırayla izleyin.
3. İkinci üç sözcüğün ilk grubun anlamları açılmadan gösterildiğini doğrulayın.

---

## ISSUE-022 — Uzun s. 73 slaytında taşma ve sonraki slayta aktarılan kaydırma konumu

**Durum:** OPEN  
**Tür:** RENDERING  
**PDF sayfası:** Basılı s. 73  
**Bölüm:** Süreci Değerlendirebilme / sorun-çözüm şablonu ve çıkış kartı  
**İlgili kayıt/etkinlik:** Metin Tahlili-3 — Dinleme / İzleme, 38–39/39

### PDF / beklenen durum
S. 73'teki sorun-çözüm tablosu ve çıkış kartı, başlıkları ve tüm içerikleriyle sınıf sunumunda okunabilir olmalıdır.

### Sunumda gözlenen durum
38/39 cevap slaydında beş maddelik uzun “Sorun–Çözüm Şablonları” listesi ilk görünümde alt kenardan kesiliyor. Listenin son maddesini görmek için aşağı kaydırınca, sonraki 39/39 slaydı bu kaydırma konumunu devralıyor ve “Çıkış Kartı — Üç Yaz · İki Sor · Bir Paylaş” başlığının üst kısmı kesiliyor. Sayfayı yukarı kaydırınca başlık geri geliyor.

### Neden sorun
38/39'un tüm maddeleri ilk görünümde okunamıyor; içeriğe ulaşmak için yapılan kaydırma, sonraki slaydın ilk açılışında başlığı görünüm dışında bırakıyor.

### Beklenen davranış
Uzun liste ekrana sığmalı veya bölünmeli. Slaytlar arasında ilerlerken yeni slaydın açılış konumu üstten başlamalı.

### Yeniden üretme
1. 38/39 cevap slaydını açın ve alt liste maddelerinin ilk görünümde kesildiğini kontrol edin.
2. İçeriğin son maddelerini görmek için aşağı kaydırın.
3. Bir sonraki slayda ilerleyin; 39/39 başlığının üst kısmının kesildiğini gözlemleyin.

---

## ISSUE-023 — E-posta karşılaştırma tablosunun son maddesi ilk görünümde kesiliyor

**Durum:** OPEN  
**Tür:** RENDERING  
**PDF sayfası:** Basılı s. 76  
**Bölüm:** E-posta ile mektubu karşılaştırma  
**İlgili kayıt/etkinlik:** Edebiyat Atölyesi-2 — Yazma, 9/17

### PDF / beklenen durum
Basılı s. 76'daki T diyagramı, e-posta ve mektubun benzerlik ve farklılıklarını karşılaştırır. Sunumdaki cevap tablosunun tüm maddeleri başlıklarıyla birlikte okunabilir olmalıdır.

### Sunumda gözlenen durum
9/17 cevabında sağ sütunun son maddesi ilk görünümde alt kenar/alt bilgi alanının altında kesiliyor. Aşağı kaydırınca son madde görünür hâle geliyor; ancak tablo başlığı ve üst bölüm ekran dışına çıkıyor.

### Neden sorun
Tablonun bütün karşılaştırma maddeleri aynı sunum görünümünde okunamıyor.

### Beklenen davranış
Tablo ekrana sığmalı ya da maddeler kontrollü aşamalara ayrılmalı; içerik kaydırma gerektirmeden okunabilmeli.

### Yeniden üretme
1. “Edebiyat Atölyesi-2 — Yazma” dersinde 9/17 kartını açın.
2. Cevabı açıp sağ sütunun alt maddelerini inceleyin.
3. İlk görünümde son maddenin kesildiğini, aşağı kaydırınca üst başlığın görünüm dışına çıktığını doğrulayın.

---

## ISSUE-024 — Öz değerlendirme formunda işaretleme seçenekleri yok

**Durum:** OPEN  
**Tür:** INCOMPLETE_CONTENT  
**PDF sayfası:** Basılı s. 78  
**Bölüm:** Süreci Değerlendirebilme / Öz Değerlendirme Formu  
**İlgili kayıt/etkinlik:** Edebiyat Atölyesi-2 — Yazma, 15/17

### PDF / beklenen durum
Basılı s. 78'de sekiz ölçüt, “Evet”, “Kısmen” ve “Hayır” sütunları olan bir Öz Değerlendirme Formu içinde yer alır. Öğrenci her ölçüt için bu seçeneklerden birini işaretler.

### Sunumda gözlenen durum
15/17'nin iki aşamasında sekiz ölçüt madde madde gösteriliyor; seçenekler veya işaretleme alanları hiçbir aşamada görünmüyor.

### Neden sorun
Seçenekler olmadan öğrenci kendi performansını kaynakta istendiği biçimde kaydedemiyor; form, yalnızca ölçüt listesini gösteren bir slayda dönüşüyor.

### Beklenen davranış
Her ölçütün yanında PDF'deki “Evet/Kısmen/Hayır” seçenekleri gösterilmeli.

### Yeniden üretme
1. “Edebiyat Atölyesi-2 — Yazma” dersinde 15/17 “Öz değerlendirme” kartını açın.
2. İlk dört ve sonraki dört ölçüt aşamasını inceleyin.
3. Her iki aşamada da değerlendirme seçeneklerinin bulunmadığını doğrulayın.

---

## ISSUE-025 — Çıkış kartı yanıtları görev açıklamasından önce açılıyor

**Durum:** OPEN  
**Tür:** PRESENTATION_FLOW  
**PDF sayfası:** Basılı s. 78  
**Bölüm:** Tema Sonu Değerlendirme / Çıkış Kartı  
**İlgili kayıt/etkinlik:** Edebiyat Atölyesi-2 — Yazma, 16/17

### PDF / beklenen durum
PDF, öğrenciden temada öğrendiği üç bilgiyi yazmasını, ilgi duyup daha çok öğrenmek istediği konularla ilgili iki soru sormasını ve zorlandığı bir konuyu paylaşmasını ister. Önce bu görevler gösterilmeli; örnek yanıtlar tıklamayla açılmalıdır.

### Sunumda gözlenen durum
Kartın ilk açılışında yalnızca “Tema Çıkış Kartı — Üç Yaz · İki Sor · Bir Paylaş” başlığı görünür; üç bilginin, iki sorunun ve paylaşımın neye ilişkin olduğu yazmaz. Bir sonraki aşamada üç örnek yanıt ve iki örnek soru birlikte açılır; “Bir Paylaş” örneği sonraki aşamada görünür.

### Neden sorun
Öğrenci, yanıtını oluşturacağı somut görev metnini görmeden örnek yanıtlarla karşılaşır.

### Beklenen davranış
İlk görünümde üç öğrenme, iki merak sorusu ve bir zorlanma paylaşımının yönergeleri gösterilmeli; örnekler ancak sonraki tıklamalarda açılmalıdır.

### Yeniden üretme
1. “Edebiyat Atölyesi-2 — Yazma” dersinde 16/17 kartını açın.
2. İlk açılışta yalnızca başlığın göründüğünü inceleyin.
3. İleri tıklayın; örnek yanıtların görev yönergeleriyle birlikte açıldığını doğrulayın.

---

## ISSUE-026 — Tablo maddeleri cevaplarıyla aynı tıklamada gösteriliyor

**Durum:** OPEN  
**Tür:** PROGRESSIVE_REVEAL  
**PDF sayfası:** Basılı s. 83  
**Bölüm:** İletişim tarihi metni / sekiz ifadeli değerlendirme tablosu  
**İlgili kayıt/etkinlik:** 1. Tema — Ölçme ve Değerlendirme, 12/14

### PDF / beklenen durum
PDF'de öğrenciler sekiz cümleyi metne göre “Evet”, “Hayır” veya “Bilgi yok” şeklinde işaretler. Her küçük cümle grubu önce cevapsız gösterilmeli, öğrencinin değerlendirmesinden sonra o grubun cevapları açılmalı; sonraki gruba ondan sonra geçilmelidir.

### Sunumda gözlenen durum
12/14'ün ilk açılışında yalnızca “Sekiz cümleyi metne göre Evet, Hayır veya Bilgi yok biçiminde değerlendiriniz.” yönergesi var; cümleler görünmüyor. İlk tıklamada 1. ve 2. cümleler doğru değerlendirmeleri ve gerekçeleriyle birlikte açılıyor. Sonraki tıklamalar da 3–4, 5–6 ve 7–8. cümleleri cevaplarıyla birlikte gösteriyor.

### Mevcut akış
Genel yönerge → ilk iki cümle ve cevapları birlikte → sonraki ikili gruplar ve cevapları birlikte.

### Beklenen akış
İlk iki cümle → ilk iki cevabı aç → sonraki iki cümle → onların cevaplarını aç → aynı sırayı kalan gruplarda sürdür.

### Neden sorun
Her cümle grubu ilk kez görünür olduğunda cevapları da görünür; öğrenci ifadeleri bağımsız değerlendirecek bir aşama bulamıyor.

### Yeniden üretme
1. “1. Tema — Ölçme ve Değerlendirme” dersinde 12/14 kartını açın.
2. İlk açılışta cümlelerin yer almadığını gözlemleyin.
3. Bir kez ilerleyin; ilk iki cümlenin cevaplarıyla aynı anda göründüğünü doğrulayın.
4. Kalan üç cevap aşamasında da ikili grupların birlikte açıldığını kontrol edin.

---

## Erişim sınırı

Basılı s. 12–83 arasındaki PDF sayfaları görsel olarak incelendi; incelenemeyen basılı sayfa yok. Dış EBA içeriklerinde giriş ekranı görüldüğü için basılı s. 53 ve 64'teki video içerikleri ile s. 78'deki dereceli puanlama anahtarı açılamadı. Basılı s. 83'teki “Olvido” çok modlu içerik sunumda “kaynak sınırlı” olarak işaretleniyor; içeriğin işitsel/görsel ayrıntıları bağımsız olarak doğrulanamadı.
