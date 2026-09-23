package io.github.knigdelioglu.lessonplayer

import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.player.PresentationTextSize
import io.github.knigdelioglu.lessonplayer.storage.LessonPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class LessonPreferencesTest {
    @Test
    fun presentationTextSizePersistsLocallyAcrossPreferenceInstances() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val preferences = LessonPreferences(context)
        val previous = preferences.presentationTextSize.first()
        try {
            preferences.setPresentationTextSize(PresentationTextSize.EXTRA_LARGE)
            assertEquals(
                PresentationTextSize.EXTRA_LARGE,
                LessonPreferences(context).presentationTextSize.first()
            )
        } finally {
            preferences.setPresentationTextSize(previous)
        }
    }
}
