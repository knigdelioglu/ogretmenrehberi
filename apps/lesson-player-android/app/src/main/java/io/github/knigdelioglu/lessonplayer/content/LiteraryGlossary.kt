package io.github.knigdelioglu.lessonplayer.content

import java.util.Locale

data class GlossaryEntry(
    val term: String,
    val definition: String,
    val aliases: List<String> = emptyList()
)

data class GlossaryMatch(
    val start: Int,
    val endExclusive: Int,
    val entry: GlossaryEntry
)

object LiteraryGlossary {
    private val turkishLocale = Locale.forLanguageTag("tr-TR")

    val entries: List<GlossaryEntry> = listOf(
        GlossaryEntry(
            term = "Zihniyet",
            definition = "Bir eserde yansıyan döneme özgü düşünme, inanma, değer verme ve dünyayı algılama biçimidir. Toplumun din, ahlak, aile, insan, otorite, özgürlük, gelenek ve modernleşme gibi konulara bakışı metindeki zihniyeti oluşturur. Yazarın kişisel görüşüyle birebir aynı olmak zorunda değildir."
        ),
        GlossaryEntry(
            term = "Dönem",
            definition = "Eserin yazıldığı veya ait olduğu tarihsel, toplumsal, kültürel ve edebî ortamdır. Siyasi gelişmeler, toplumsal değişimler, sanat anlayışları ve edebî akımlar dönemin özellikleri arasındadır."
        ),
        GlossaryEntry(
            term = "Üslup",
            definition = "Bir yazarın anlatma biçimidir; ne anlattığından çok nasıl anlattığıyla ilgilidir. Kelime seçimi, cümle yapısı, söz sanatları ve anlatımın sade, ağır, şiirsel, mizahi, ironik, coşkulu ya da nesnel oluşu üslubu belirler."
        ),
        GlossaryEntry(
            term = "İleti",
            definition = "Metnin okuyucuya sezdirmek, düşündürmek veya hissettirmek istediği temel anlam ya da değer yargısıdır. Özellikle edebî metinlerde çoğu zaman doğrudan söylenmez; olay, kişi, çatışma ve imgeler aracılığıyla sezdirilir. Bir eserde birden fazla ileti bulunabilir."
        ),
        GlossaryEntry(
            term = "İçerik",
            definition = "Metinde neyin anlatıldığıdır. Konu, kişiler, olaylar, durumlar, duygu ve düşünceler içeriğin kapsamına girer. Kısa formül: içerik = ne anlatılıyor; üslup = nasıl anlatılıyor."
        ),
        GlossaryEntry(
            term = "Ana düşünce",
            definition = "Yazarın özellikle öğretici veya düşünce yazılarında savunduğu ya da okuyucuya ulaştırmak istediği temel düşüncedir. Metindeki diğer düşünceler ana düşünceyi açıklamak veya desteklemek için kullanılır."
        ),
        GlossaryEntry(
            term = "Yardımcı düşünce",
            aliases = listOf("Yardımcı düşünceler"),
            definition = "Ana düşünceyi açıklayan, destekleyen, örneklendiren veya ayrıntılandıran düşüncelerdir. Bir metinde genellikle bir ana düşünceye karşılık birden fazla yardımcı düşünce bulunur."
        ),
        GlossaryEntry(
            term = "Çatışma",
            definition = "Anlatıda karşı karşıya gelen isteklerin, değerlerin, güçlerin veya durumların oluşturduğu gerilimdir. Olay örgüsünün ilerlemesini sağlayan temel unsurlardan biridir."
        ),
        GlossaryEntry(
            term = "Kişi–kişi çatışması",
            aliases = listOf("Kişi-kişi çatışması"),
            definition = "İki veya daha fazla kişinin istek, amaç ya da değerlerinin karşı karşıya gelmesidir. Örneğin miras konusunda anlaşamayan iki kardeş arasındaki gerilim."
        ),
        GlossaryEntry(
            term = "Kişi–kendisi çatışması",
            aliases = listOf("Kişi-kendisi çatışması"),
            definition = "Kahramanın kendi duygu, düşünce, vicdan veya istekleri arasında yaşadığı iç çatışmadır. Örneğin doğruyu söylemek ile çıkarını korumak arasında kalması."
        ),
        GlossaryEntry(
            term = "Kişi–toplum çatışması",
            aliases = listOf("Kişi-toplum çatışması"),
            definition = "Bireyin toplumun kuralları, gelenekleri, değerleri veya beklentileriyle karşı karşıya gelmesidir."
        ),
        GlossaryEntry(
            term = "Kişi–doğa çatışması",
            aliases = listOf("Kişi-doğa çatışması"),
            definition = "İnsanın doğal koşullar veya çevreyle mücadelesidir. Fırtına, kuraklık, soğuk ve deniz gibi unsurlar bu çatışmayı doğurabilir."
        ),
        GlossaryEntry(
            term = "Olay örgüsü",
            definition = "Bir anlatıda meydana gelen olayların neden-sonuç ve zaman ilişkisi içinde birbirine bağlanmış düzenidir. Yalnızca neler olduğunun listesi değildir; olayların birbirini nasıl doğurduğunu gösterir."
        ),
        GlossaryEntry(
            term = "Dramatik örgü",
            definition = "Özellikle tiyatroda olayların gerilim ve çatışma oluşturacak biçimde düzenlenmesidir. Başlangıç durumuyla ortaya çıkan çatışma gelişir, gerilim yükselir, dönüm noktaları yaşanır ve bir sonuca ulaşılır."
        ),
        GlossaryEntry(
            term = "Düşünceyi geliştirme yolları",
            aliases = listOf("Düşünceyi geliştirme yolu"),
            definition = "Yazarın ileri sürdüğü düşünceyi daha anlaşılır, inandırıcı veya somut hâle getirmek için kullandığı yöntemlerdir. Aynı paragrafta birden fazla düşünceyi geliştirme yolu bulunabilir."
        ),
        GlossaryEntry(
            term = "Tanımlama",
            definition = "Bir kavramın ne olduğunu açıklamaktır. Genellikle “X, …dır.” biçimindeki ifadelerde görülür ancak her tanım bu kalıpta olmak zorunda değildir."
        ),
        GlossaryEntry(
            term = "Örneklendirme",
            definition = "Soyut veya genel bir düşünceyi örneklerle somutlaştırmaktır. Bir kişi ya da eser yalnızca örnek olarak veriliyorsa bu, tanık gösterme değil örneklendirmedir."
        ),
        GlossaryEntry(
            term = "Karşılaştırma",
            definition = "İki veya daha fazla varlık, eser, kişi ya da düşüncenin benzer veya farklı yönlerini ortaya koymaktır. Sadece iki unsurun aynı paragrafta geçmesi karşılaştırma sayılmaz."
        ),
        GlossaryEntry(
            term = "Tanık gösterme",
            definition = "Bir düşünceyi desteklemek amacıyla konuyla ilgili güvenilir veya tanınmış bir kişinin görüşünden yararlanmaktır. Alıntı, tanık göstermenin aracı olabilir; fakat her alıntı tanık gösterme amacı taşımaz."
        ),
        GlossaryEntry(
            term = "Alıntı yapma",
            definition = "Başka bir kişinin sözünü doğrudan aktarmaktır. Bir görüşü desteklemek için kullanılırsa tanık göstermenin aracı olabilir; ancak her alıntının amacı tanık göstermek değildir."
        ),
        GlossaryEntry(
            term = "Sayısal verilerden yararlanma",
            definition = "Bir düşünceyi desteklemek için sayı, oran, istatistik veya araştırma sonucundan yararlanmaktır."
        ),
        GlossaryEntry(
            term = "Benzetme",
            definition = "Bir kavramı daha anlaşılır veya etkili kılmak için onu başka bir varlık ya da durumla benzerlik ilişkisi kurarak açıklamaktır."
        ),
        GlossaryEntry(
            term = "Anlatım biçimleri",
            aliases = listOf("Anlatım biçimi"),
            definition = "Yazarın anlatma amacına göre metni hangi temel yolla kurduğunu gösterir. Geleneksel sınıflandırmada öyküleyici, betimleyici, açıklayıcı ve tartışmacı anlatım temel anlatım biçimleridir."
        ),
        GlossaryEntry(
            term = "Öyküleyici anlatım",
            definition = "Bir olayın veya hareketin zaman içinde gerçekleşmesini anlatan biçimdir. Kişi, olay, zaman, mekân ve hareket bildiren fiiller sık görülür. Temel soru: “Ne oldu?”"
        ),
        GlossaryEntry(
            term = "Betimleyici anlatım",
            definition = "Bir varlığı, kişiyi, mekânı veya durumu okuyucunun zihninde canlandırmayı amaçlayan anlatımdır. Temel soru: “Nasıl?”"
        ),
        GlossaryEntry(
            term = "Açıklayıcı betimleme",
            definition = "Bilgi vermek ve varlığı olabildiğince nesnel biçimde tanıtmak amacıyla yapılan betimlemedir."
        ),
        GlossaryEntry(
            term = "Sanatsal betimleme",
            definition = "Okuyucuda izlenim ve duygu oluşturmanın öne çıktığı, yazarın kişisel algısının daha belirgin olduğu betimlemedir."
        ),
        GlossaryEntry(
            term = "Açıklayıcı anlatım",
            definition = "Bir konu hakkında okuyucuya bilgi vermek, bir kavramı öğretmek veya açıklamak amacıyla kullanılan anlatım biçimidir. Ders kitapları, makaleler ve ansiklopedilerde sık görülür. Temel soru: “Bu nedir / nasıl gerçekleşir?”"
        ),
        GlossaryEntry(
            term = "Tartışmacı anlatım",
            definition = "Bir düşünceyi savunmak, başka bir görüşü eleştirmek veya okuyucunun düşüncesini değiştirmek amacıyla kullanılan anlatım biçimidir. Temel soru: “Yazar bizi neye inandırmaya çalışıyor?”"
        )
    )

    private val entryByTerm = entries.associateBy { it.term }

    fun entry(term: String): GlossaryEntry? = entryByTerm[term]

    fun matches(text: String): List<GlossaryMatch> {
        if (text.isBlank()) return emptyList()

        val normalizedText = text.lowercase(turkishLocale)
        val candidates = buildList {
            entries.forEach { entry ->
                (listOf(entry.term) + entry.aliases).forEach { alias ->
                    val needle = alias.lowercase(turkishLocale)
                    var fromIndex = 0
                    while (fromIndex <= normalizedText.length - needle.length) {
                        val start = normalizedText.indexOf(needle, startIndex = fromIndex)
                        if (start < 0) break
                        val end = start + needle.length
                        if (isBoundary(text, start, end)) {
                            add(GlossaryMatch(start, end, entry))
                        }
                        fromIndex = start + 1
                    }
                }
            }
        }

        val sorted = candidates.sortedWith(
            compareBy<GlossaryMatch> { it.start }
                .thenByDescending { it.endExclusive - it.start }
        )

        val selected = mutableListOf<GlossaryMatch>()
        sorted.forEach { candidate ->
            val overlaps = selected.lastOrNull()?.let { candidate.start < it.endExclusive } == true
            if (!overlaps) selected += candidate
        }
        return selected
    }

    private fun isBoundary(text: String, start: Int, end: Int): Boolean {
        val leftOk = start == 0 || !text[start - 1].isLetterOrDigit()
        val rightOk = end == text.length || !text[end].isLetterOrDigit()
        return leftOk && rightOk
    }
}
