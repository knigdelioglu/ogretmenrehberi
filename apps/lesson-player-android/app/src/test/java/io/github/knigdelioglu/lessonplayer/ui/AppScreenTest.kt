package io.github.knigdelioglu.lessonplayer.ui

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
    fun backFromSecondaryDestinationReturnsToLibrary() {
        AppScreen.entries.filterNot { it == AppScreen.LIBRARY }.forEach { screen ->
            assertNotEquals(AppScreen.LIBRARY, screen)
            assertEquals(AppScreen.LIBRARY, backDestination(screen))
        }
    }
}
