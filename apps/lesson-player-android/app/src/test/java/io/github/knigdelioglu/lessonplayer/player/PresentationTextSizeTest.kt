package io.github.knigdelioglu.lessonplayer.player

import org.junit.Assert.assertEquals
import org.junit.Test

class PresentationTextSizeTest {
    @Test
    fun presentationOptionsHaveStableLabelsAndIncreasingScales() {
        assertEquals(listOf("Normal", "Büyük", "Çok büyük"),
            PresentationTextSize.entries.map { it.label })
        assertEquals(listOf(1f, 1.2f, 1.4f),
            PresentationTextSize.entries.map { it.scale })
    }
}
