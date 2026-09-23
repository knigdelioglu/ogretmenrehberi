package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.ui.graphics.Color
import io.github.knigdelioglu.lessonplayer.ui.theme.AmberText
import io.github.knigdelioglu.lessonplayer.ui.theme.Ink
import io.github.knigdelioglu.lessonplayer.ui.theme.Light
import io.github.knigdelioglu.lessonplayer.ui.theme.Mint
import io.github.knigdelioglu.lessonplayer.ui.theme.Paper
import io.github.knigdelioglu.lessonplayer.ui.theme.SoftInk
import io.github.knigdelioglu.lessonplayer.ui.theme.contrastRatio
import org.junit.Assert.assertTrue
import org.junit.Test

class LessonThemeContrastTest {
    @Test
    fun readingTextMeetsNormalTextContrastOnLightSurfaces() {
        assertTrue(contrastRatio(Ink, Paper) >= 4.5)
        assertTrue(contrastRatio(Ink, Color.White) >= 4.5)
        assertTrue(contrastRatio(SoftInk, Paper) >= 4.5)
        assertTrue(contrastRatio(SoftInk, Light.surfaceVariant) >= 4.5)
        assertTrue(contrastRatio(Light.onPrimaryContainer, Mint) >= 4.5)
        assertTrue(contrastRatio(Light.onSecondaryContainer, Light.secondaryContainer) >= 4.5)
    }

    @Test
    fun actionAndAccentTextKeepContrast() {
        assertTrue(contrastRatio(Light.onPrimary, Light.primary) >= 4.5)
        assertTrue(contrastRatio(Light.onSecondary, Light.secondary) >= 4.5)
        assertTrue(contrastRatio(Light.onTertiary, Light.tertiary) >= 4.5)
        assertTrue(contrastRatio(Light.onTertiaryContainer, Light.tertiaryContainer) >= 4.5)
        assertTrue(contrastRatio(AmberText, Paper) >= 4.5)
        assertTrue(contrastRatio(AmberText, Color.White) >= 4.5)
    }
}
