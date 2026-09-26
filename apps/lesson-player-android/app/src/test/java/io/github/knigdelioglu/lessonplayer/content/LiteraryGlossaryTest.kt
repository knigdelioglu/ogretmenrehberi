package io.github.knigdelioglu.lessonplayer.content

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiteraryGlossaryTest {
    @Test
    fun matchesTermsCaseInsensitively() {
        val matches = LiteraryGlossary.matches(
            "Bu bölümde AÇIKLAYICI ANLATIM ve olay örgüsü birlikte incelenir."
        )

        assertEquals(
            listOf("Açıklayıcı anlatım", "Olay örgüsü"),
            matches.map { it.entry.term }
        )
    }

    @Test
    fun doesNotMatchInsideLongerWords() {
        val matches = LiteraryGlossary.matches(
            "Dönemsel değişim ayrı, dönem kavramı ayrıdır."
        )

        assertEquals(listOf("Dönem"), matches.map { it.entry.term })
    }

    @Test
    fun prefersLongerSpecificTermOverNestedGenericTerm() {
        val matches = LiteraryGlossary.matches(
            "Kişi-toplum çatışması eserde bir çatışma örneğidir."
        )

        assertEquals("Kişi–toplum çatışması", matches.first().entry.term)
        assertTrue(matches.any { it.entry.term == "Çatışma" })
        assertEquals(2, matches.size)
    }

    @Test
    fun recognizesSingularAliases() {
        val matches = LiteraryGlossary.matches(
            "Anlatım biçimi ile düşünceyi geliştirme yolu aynı şey değildir."
        )

        assertEquals(
            listOf("Anlatım biçimleri", "Düşünceyi geliştirme yolları"),
            matches.map { it.entry.term }
        )
    }
}
