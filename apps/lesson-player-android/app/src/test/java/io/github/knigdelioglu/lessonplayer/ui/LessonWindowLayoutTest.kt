package io.github.knigdelioglu.lessonplayer.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LessonWindowLayoutTest {
    @Test
    fun widthClassesDriveNavigationAndOutlineContract() {
        val compact = lessonWindowLayout(widthDp = 599, heightDp = 900)
        val medium = lessonWindowLayout(widthDp = 840, heightDp = 900)
        val expanded = lessonWindowLayout(widthDp = 1100, heightDp = 900)

        assertEquals(LessonWindowWidthClass.COMPACT, compact.widthClass)
        assertFalse(compact.usesRail)
        assertEquals(LessonWindowWidthClass.MEDIUM, medium.widthClass)
        assertTrue(medium.usesRail)
        assertFalse(medium.usesLessonOutline)
        assertEquals(LessonWindowWidthClass.EXPANDED, expanded.widthClass)
        assertTrue(expanded.usesRail)
        assertTrue(expanded.usesLessonOutline)
    }

    @Test
    fun shortWindowAvoidsExpandedNavigationDuringSplitOrImeResize() {
        val layout = lessonWindowLayout(widthDp = 1200, heightDp = 559)

        assertTrue(layout.isShort)
        assertFalse(layout.usesRail)
        assertFalse(layout.usesLessonOutline)
    }
}
