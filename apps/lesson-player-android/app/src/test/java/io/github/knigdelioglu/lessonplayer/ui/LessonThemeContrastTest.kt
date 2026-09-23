package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.ui.graphics.Color
import io.github.knigdelioglu.lessonplayer.ui.theme.AmberText
import io.github.knigdelioglu.lessonplayer.ui.theme.Paper
import io.github.knigdelioglu.lessonplayer.ui.theme.contrastRatio
import org.junit.Assert.assertTrue
import org.junit.Test

class LessonThemeContrastTest {
    @Test
    fun amberTextMeetsNormalTextContrastOnWarmSurfaces() {
        assertTrue(contrastRatio(AmberText, Paper) >= 4.5)
        assertTrue(contrastRatio(AmberText, Color(0xFFFEFDF8)) >= 4.5)
    }
}
