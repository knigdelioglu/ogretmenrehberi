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

    @Test
    fun threeColumnLayoutContractForLargeLandscapeTablet() {
        val largeLandscape = lessonWindowLayout(widthDp = 1280, heightDp = 800)
        val mediumLandscape = lessonWindowLayout(widthDp = 950, heightDp = 600)
        val shortLandscape = lessonWindowLayout(widthDp = 1200, heightDp = 500)
        val portraitTablet = lessonWindowLayout(widthDp = 800, heightDp = 1200)

        assertTrue(largeLandscape.usesThreeColumn)
        assertFalse(largeLandscape.usesTeacherAssistDrawer)
        assertFalse(largeLandscape.usesTeacherAssistBottomSheet)

        assertFalse(mediumLandscape.usesThreeColumn)
        assertTrue(mediumLandscape.usesTeacherAssistDrawer)
        assertFalse(mediumLandscape.usesTeacherAssistBottomSheet)

        assertFalse(shortLandscape.usesThreeColumn)
        assertFalse(shortLandscape.usesTeacherAssistDrawer)
        assertTrue(shortLandscape.usesTeacherAssistBottomSheet)

        assertFalse(portraitTablet.usesThreeColumn)
        assertFalse(portraitTablet.usesTeacherAssistDrawer)
        assertTrue(portraitTablet.usesTeacherAssistBottomSheet)
    }

    @Test
    fun expandedDecisionUsesSafeWidthAndAllColumnMinimums() {
        val targetPreview = lessonWindowLayout(widthDp = 1280, heightDp = 800)
        val workspaceTooNarrow = lessonWindowLayout(widthDp = 1100, heightDp = 800)
        val teacherAssistTooNarrow = lessonWindowLayout(widthDp = 1240, heightDp = 800)
        val safeAreaTooNarrow = lessonWindowLayout(
            widthDp = 1280,
            heightDp = 800,
            safeDrawingInsets = LessonWindowInsetsDp(start = 24f, end = 24f)
        )

        assertTrue(targetPreview.usesThreeColumn)
        assertFalse(workspaceTooNarrow.usesThreeColumn)
        assertTrue(workspaceTooNarrow.usesTeacherAssistDrawer)
        assertFalse(teacherAssistTooNarrow.usesThreeColumn)
        assertTrue(teacherAssistTooNarrow.usesTeacherAssistDrawer)
        assertEquals(1232, safeAreaTooNarrow.widthDp)
        assertFalse(safeAreaTooNarrow.usesThreeColumn)

        val targetColumns = LessonShellLayoutContract.columnWidths(1280f)
        assertEquals(281.6f, targetColumns.sidebarDp, 0.1f)
        assertEquals(716.8f, targetColumns.workspaceDp, 0.1f)
        assertEquals(281.6f, targetColumns.teacherAssistDp, 0.1f)
        assertTrue(targetColumns.workspaceDp >= LessonShellLayoutContract.MIN_WORKSPACE_WIDTH_DP)
    }

    @Test
    fun actionBarUsesTextLabelsAtThe1280By800ExpandedWorkspaceWidth() {
        val workspaceWidth = LessonShellLayoutContract.columnWidths(1280f).workspaceDp

        assertTrue(LessonShellLayoutContract.actionBarUsesLabels(workspaceWidth, fontScale = 1f))
        assertFalse(LessonShellLayoutContract.actionBarUsesLabels(599f, fontScale = 1f))
        assertFalse(LessonShellLayoutContract.actionBarUsesLabels(workspaceWidth, fontScale = 1.2f))
    }
}
