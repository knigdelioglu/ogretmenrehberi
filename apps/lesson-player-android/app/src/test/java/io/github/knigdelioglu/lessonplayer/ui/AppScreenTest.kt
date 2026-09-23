package io.github.knigdelioglu.lessonplayer.ui

import io.github.knigdelioglu.lessonplayer.content.JsonValue
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class AppScreenTest {
    @Test
    fun fourDistinctNativeDestinations() {
        assertEquals(4, AppScreen.entries.size)
        assertEquals(4, AppScreen.entries.map { it.title }.toSet().size)
        assertEquals(4, AppScreen.entries.map { it.shortLabel }.toSet().size)
    }

    @Test
    fun libraryAndSettingsTitlesDescribeTheirContents() {
        assertEquals("Ders kitaplığı", AppScreen.LIBRARY.title)
        assertEquals("Veri ve yedekleme", AppScreen.SETTINGS.title)
    }

    @Test
    fun recursiveAnswerSectionsKeepReadableLabelsAndValues() {
        val value = JsonValue.Object(linkedMapOf(
            "başlık" to JsonValue.Text("Metin"),
            "maddeler" to JsonValue.Array(listOf(
                JsonValue.Text("Bir"),
                JsonValue.Object(mapOf("alt" to JsonValue.Bool(true)))
            ))
        ))

        assertEquals(
            "başlık: Metin\nmaddeler: Bir\nalt: Evet",
            readableAnswerValue(value)
        )
    }

    @Test
    fun backFromSecondaryDestinationReturnsToLibrary() {
        AppScreen.entries.filterNot { it == AppScreen.LIBRARY }.forEach { screen ->
            assertNotEquals(AppScreen.LIBRARY, screen)
            assertEquals(AppScreen.LIBRARY, backDestination(screen))
        }
    }
}
