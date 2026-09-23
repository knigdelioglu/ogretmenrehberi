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
        assertFalse(medium.usesRail)
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

    @Test
    fun portraitUsesBottomNavigationAndLandscapeOutlineDependsOnUsableSpace() {
        val portrait = lessonWindowLayout(widthDp = 800, heightDp = 1280)
        val enoughRoom = lessonWindowLayout(widthDp = 1100, heightDp = 800)
        val outlineDoesNotFit = lessonWindowLayout(widthDp = 960, heightDp = 600)

        assertFalse(portrait.usesRail)
        assertFalse(portrait.usesLessonOutline)
        assertTrue(enoughRoom.usesRail)
        assertTrue(enoughRoom.usesLessonOutline)
        assertTrue(outlineDoesNotFit.usesRail)
        assertFalse(outlineDoesNotFit.usesLessonOutline)
        assertTrue(usesTwoPaneLibrary(1000f, 700f))
        assertFalse(usesTwoPaneLibrary(800f, 1200f))
        assertFalse(usesTwoPaneLibrary(880f, 600f))
        assertTrue(lessonOutlineFits(896f, 560f, isLandscape = true))
        assertFalse(lessonOutlineFits(895f, 700f, isLandscape = true))
        assertFalse(lessonOutlineFits(1200f, 559f, isLandscape = true))
        assertFalse(lessonOutlineFits(1200f, 700f, isLandscape = false))
    }
}
