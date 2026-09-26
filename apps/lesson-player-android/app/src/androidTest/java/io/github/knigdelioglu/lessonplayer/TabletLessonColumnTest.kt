package io.github.knigdelioglu.lessonplayer

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeRight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.width
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.SourceRecord
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.SessionLessonScreen
import io.github.knigdelioglu.lessonplayer.ui.lesson.LessonV2TeacherAssistPane
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonV2Header
import io.github.knigdelioglu.lessonplayer.ui.ExpandedLessonLayout
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class TabletLessonColumnTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun tabletLessonScreenColumnBehavior() {
        composeRule.setContent {
            var isSidebarOpen by remember { mutableStateOf(false) }
            LessonTheme {
                ExpandedLessonLayout(
                    modifier = Modifier.fillMaxSize(),
                    isSidebarOpen = isSidebarOpen,
                    onSidebarOpenChange = { isSidebarOpen = it },
                    sidebar = { modifier ->
                        Box(modifier = modifier.testTag("test-sidebar-content")) {
                            Text("Sidebar Kolonu")
                        }
                    },
                    workspace = { modifier ->
                        Box(modifier = modifier) {
                            Text("Orta Workspace Kolonu")
                        }
                    },
                    teacherAssist = { modifier ->
                        Box(modifier = modifier) {
                            Text("Sağ Öğretmen Asistanı")
                        }
                    }
                )
            }
        }

        // 1. Başlangıçta sol kolon gizlidir
        composeRule.onNodeWithTag("tablet-lesson-sidebar-overlay").assertDoesNotExist()
        composeRule.onNodeWithText("Sidebar Kolonu").assertDoesNotExist()
        composeRule.onNodeWithTag("tablet-lesson-sidebar-scrim").assertDoesNotExist()

        // 2. Sol kolon gizliyken boşalan genişlik yalnızca orta kolona verilir
        val workspaceInitialBounds = composeRule.onNodeWithTag("tablet-lesson-workspace-column")
            .getUnclippedBoundsInRoot()
        val teacherAssistInitialBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column")
            .getUnclippedBoundsInRoot()

        assertEquals("Workspace and TeacherAssist top Y coordinates should match", workspaceInitialBounds.top, teacherAssistInitialBounds.top)

        // Workspace genişliği Teacher Assist'in yaklaşık 78/22 oranında (~3.54 katı) olmalıdır
        val ratio = workspaceInitialBounds.width / teacherAssistInitialBounds.width
        assertTrue(
            "Workspace should be ~78/22 times wider than teacher assist: ratio=$ratio",
            ratio in 3.2f..3.8f
        )

        // 3. Sol kenardan sağa kaydırınca sol kolon açılır ve overlay olarak görünür
        composeRule.onNodeWithTag("tablet-lesson-edge-swipe-area")
            .performTouchInput {
                swipeRight()
            }

        composeRule.waitForIdle()
        composeRule.mainClock.advanceTimeBy(350)
        composeRule.waitForIdle()

        // Sol kolon overlay, içerik ve scrim görünür hale gelir
        composeRule.onNodeWithTag("tablet-lesson-sidebar-overlay").assertIsDisplayed()
        composeRule.onNodeWithText("Sidebar Kolonu").assertIsDisplayed()
        composeRule.onNodeWithTag("tablet-lesson-sidebar-scrim").assertIsDisplayed()

        // Sol kolon açıldığında altındaki orta ve sağ kolonların ölçüsü ve konumu değişmez (itilmez)
        val workspaceAfterOpenBounds = composeRule.onNodeWithTag("tablet-lesson-workspace-column")
            .getUnclippedBoundsInRoot()
        val teacherAssistAfterOpenBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column")
            .getUnclippedBoundsInRoot()

        assertEquals("Workspace x should not shift", workspaceInitialBounds.left, workspaceAfterOpenBounds.left)
        assertEquals("Workspace width should not change", workspaceInitialBounds.width, workspaceAfterOpenBounds.width)
        assertEquals("TeacherAssist x should not shift", teacherAssistInitialBounds.left, teacherAssistAfterOpenBounds.left)
        assertEquals("TeacherAssist width should not change", teacherAssistInitialBounds.width, teacherAssistAfterOpenBounds.width)

        // 4. Sol kolonun dışına (scrim üzerine) dokunulunca sol kolon yeniden gizlenir
        composeRule.onNodeWithTag("tablet-lesson-sidebar-scrim").performClick()
        composeRule.waitForIdle()
        composeRule.mainClock.advanceTimeBy(350)
        composeRule.waitForIdle()

        composeRule.onNodeWithTag("tablet-lesson-sidebar-overlay").assertDoesNotExist()
        composeRule.onNodeWithText("Sidebar Kolonu").assertDoesNotExist()
        composeRule.onNodeWithTag("tablet-lesson-sidebar-scrim").assertDoesNotExist()
    }

    @Test
    fun tabletLessonWorkspaceHeaderAndTeacherAssistTopAlignmentMatches() {
        val sampleStep = LessonStep(
            id = "step-align-1",
            layout = LayoutKind.QUESTION,
            density = "compact",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Hizalama kontrol sorusu",
            displayPromptMode = "full",
            source = SourceRecord("src-1", "10", "Başlık", "TASK", "p10", "active", null),
            answer = null,
            content = null
        )
        val sampleLesson = LessonData(
            schemaVersion = "2.0",
            themeId = "t1",
            lessonId = "lesson-align",
            lessonSlug = "hizalama-dersi",
            title = "Hizalama Test Dersi",
            subtitle = "Alt Başlık",
            printedPageRange = "10",
            requiredSourceFrom = "p10",
            requiredSourceTo = "p10",
            coverageSourceRecords = 1,
            coverageAnswerEntries = 0,
            steps = listOf(sampleStep)
        )
        val session = LessonEngine.initial(sampleLesson, contentDigest = "digest-align")

        composeRule.setContent {
            LessonTheme {
                ExpandedLessonLayout(
                    modifier = Modifier.fillMaxSize(),
                    isSidebarOpen = false,
                    sidebar = { modifier -> Box(modifier = modifier) },
                    workspace = { modifier ->
                        Box(modifier = modifier) {
                            SessionLessonScreen(
                                lesson = sampleLesson,
                                state = session,
                                dispatch = {},
                                headerContent = {
                                    LessonV2Header(
                                        currentScreen = AppScreen.LESSON,
                                        lesson = sampleLesson,
                                        session = session
                                    )
                                },
                                isThreeColumn = true
                            )
                        }
                    },
                    teacherAssist = { modifier ->
                        LessonV2TeacherAssistPane(
                            step = sampleStep,
                            session = session,
                            modifier = modifier
                        )
                    }
                )
            }
        }

        val headerBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val assistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()

        assertEquals("Middle lesson header and right teacher assist pane must share identical top Y coordinate", assistBounds.top, headerBounds.top)
    }

    @Test
    fun stepTransitionMaintainsIdenticalTopBoundsThroughoutIntermediateAndSettledFrames() {
        val sampleStep1 = LessonStep(
            id = "step-align-1",
            layout = LayoutKind.QUESTION,
            density = "compact",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Hizalama kontrol sorusu 1",
            displayPromptMode = "full",
            source = SourceRecord("src-1", "10", "Başlık 1", "TASK", "p10", "active", null),
            answer = null,
            content = null
        )
        val sampleStep2 = LessonStep(
            id = "step-align-2",
            layout = LayoutKind.QUESTION,
            density = "compact",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Hizalama kontrol sorusu 2",
            displayPromptMode = "full",
            source = SourceRecord("src-2", "11", "Başlık 2", "TASK", "p11", "active", null),
            answer = null,
            content = null
        )
        val sampleLesson = LessonData(
            schemaVersion = "2.0",
            themeId = "t1",
            lessonId = "lesson-align",
            lessonSlug = "hizalama-dersi",
            title = "Hizalama Test Dersi",
            subtitle = "Alt Başlık",
            printedPageRange = "10-11",
            requiredSourceFrom = "p10",
            requiredSourceTo = "p11",
            coverageSourceRecords = 2,
            coverageAnswerEntries = 0,
            steps = listOf(sampleStep1, sampleStep2)
        )
        var session by mutableStateOf(LessonEngine.initial(sampleLesson, contentDigest = "digest-align"))
        var actionState by mutableStateOf(LessonActionUiState(busy = false))

        composeRule.setContent {
            LessonTheme {
                ExpandedLessonLayout(
                    modifier = Modifier.fillMaxSize(),
                    isSidebarOpen = false,
                    sidebar = { modifier -> Box(modifier = modifier) },
                    workspace = { modifier ->
                        Box(modifier = modifier) {
                            SessionLessonScreen(
                                lesson = sampleLesson,
                                state = session,
                                dispatch = {},
                                actionState = actionState,
                                headerContent = {
                                    LessonV2Header(
                                        currentScreen = AppScreen.LESSON,
                                        lesson = sampleLesson,
                                        session = session
                                    )
                                },
                                isThreeColumn = true
                            )
                        }
                    },
                    teacherAssist = { modifier ->
                        LessonV2TeacherAssistPane(
                            step = if (session.stepId == sampleStep1.id) sampleStep1 else sampleStep2,
                            session = session,
                            modifier = modifier
                        )
                    }
                )
            }
        }

        // Initial composition settles
        composeRule.waitForIdle()

        // 1. Initial settled state (busy = false)
        val initialHeaderBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val initialCardBounds = composeRule.onNodeWithTag("lesson-main-question-card").getUnclippedBoundsInRoot()
        val initialAssistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()
        val workspaceBounds = composeRule.onNodeWithTag("tablet-lesson-workspace-column").getUnclippedBoundsInRoot()

        assertEquals("Middle header and right teacher assist must share identical top Y initially", initialAssistBounds.top, initialHeaderBounds.top)

        // Disable autoAdvance to strictly sample individual intermediate Compose frames
        composeRule.mainClock.autoAdvance = false

        // 2a. Intermediate frame with busy = true (action dispatch / Room save start)
        actionState = LessonActionUiState(busy = true)
        composeRule.mainClock.advanceTimeByFrame()

        val intermediateHeaderBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val intermediateCardBounds = composeRule.onNodeWithTag("lesson-main-question-card").getUnclippedBoundsInRoot()
        val intermediateAssistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()

        assertEquals("Right column must remain a fixed reference during intermediate frame", initialAssistBounds.top, intermediateAssistBounds.top)
        assertEquals("Header top bounds must NOT shift during intermediate frame (busy = true)", initialHeaderBounds.top, intermediateHeaderBounds.top)
        assertEquals("Main question card top bounds must NOT shift down during intermediate frame (busy = true)", initialCardBounds.top, intermediateCardBounds.top)

        // Verify status feedback is visible during intermediate frame and within bottom clearance
        val statusNode = composeRule.onNodeWithTag("lesson-action-status")
        statusNode.assertIsDisplayed()
        val statusBounds = statusNode.getUnclippedBoundsInRoot()

        assertTrue("Status overlay top must be below the main question card", statusBounds.top >= intermediateCardBounds.bottom)
        assertTrue("Status overlay must not overlap right-side teacher assist controls", statusBounds.right <= intermediateAssistBounds.left)
        assertTrue("Status overlay bottom must be within workspace bounds", statusBounds.bottom <= workspaceBounds.bottom)
        val statusTotalHeight = workspaceBounds.bottom - statusBounds.top
        assertTrue("Status overlay total height plus bottom margin must fit within the reserved 80dp bottom inset", statusTotalHeight <= 80.dp)

        // 2b. Intermediate frame after Next while still busy
        session = LessonEngine.reduce(session, sampleLesson, LessonCommand.Next)
        composeRule.mainClock.advanceTimeByFrame()

        val steppedBusyHeaderBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val steppedBusyCardBounds = composeRule.onNodeWithTag("lesson-main-question-card").getUnclippedBoundsInRoot()
        val steppedBusyAssistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()

        assertEquals("Right column must remain fixed during stepped busy frame", initialAssistBounds.top, steppedBusyAssistBounds.top)
        assertEquals("Header top bounds must remain identical after step switch during busy", initialHeaderBounds.top, steppedBusyHeaderBounds.top)
        assertEquals("Main question card top bounds must remain identical after step switch during busy", initialCardBounds.top, steppedBusyCardBounds.top)

        // 2c. Intermediate frame after busy = false (save completed)
        actionState = LessonActionUiState(busy = false)
        composeRule.mainClock.advanceTimeByFrame()

        val postBusyHeaderBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val postBusyCardBounds = composeRule.onNodeWithTag("lesson-main-question-card").getUnclippedBoundsInRoot()
        val postBusyAssistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()

        assertEquals("Right column must remain fixed post-busy frame", initialAssistBounds.top, postBusyAssistBounds.top)
        assertEquals("Header top bounds must remain identical post-busy frame", initialHeaderBounds.top, postBusyHeaderBounds.top)
        assertEquals("Main card top bounds must remain identical post-busy frame", initialCardBounds.top, postBusyCardBounds.top)

        // 3. Re-enable autoAdvance and defer waitForIdle until settled assertions
        composeRule.mainClock.autoAdvance = true
        composeRule.waitForIdle()

        val settledHeaderBounds = composeRule.onNodeWithTag("lesson-v2-header").getUnclippedBoundsInRoot()
        val settledCardBounds = composeRule.onNodeWithTag("lesson-main-question-card").getUnclippedBoundsInRoot()
        val settledAssistBounds = composeRule.onNodeWithTag("tablet-lesson-teacher-assist-column").getUnclippedBoundsInRoot()

        assertEquals("Right column must remain fixed in settled state", initialAssistBounds.top, settledAssistBounds.top)
        assertEquals("Header top bounds must be identical across initial, intermediate, and settled frames", initialHeaderBounds.top, settledHeaderBounds.top)
        assertEquals("Main card top bounds must be identical across initial, intermediate, and settled frames", initialCardBounds.top, settledCardBounds.top)
    }
}
