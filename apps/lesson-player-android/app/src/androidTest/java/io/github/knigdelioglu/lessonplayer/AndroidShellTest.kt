package io.github.knigdelioglu.lessonplayer

import android.content.pm.ActivityInfo
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.isEnabled
import androidx.compose.ui.test.isSelected
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Assert.assertTrue
import org.junit.Rule
import androidx.compose.ui.unit.dp
import org.junit.Test

class AndroidShellTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    private fun hasNodes(matcher: SemanticsMatcher): Boolean = try {
        composeRule.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty()
    } catch (_: IllegalStateException) {
        // The Activity can be resumed before its first Compose semantics tree is attached.
        false
    }

    @Test
    fun nativeLibraryUsesValidatedOfflineCatalogAndPresentationSurface() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("library-screen-surface"))
        }
        composeRule.onNodeWithTag("library-search-field").assertExists()
        assertTrue(
            "Validated offline catalog should contain lessons",
            hasNodes(hasTestTag("library-lesson-open"))
        )

        // Filter to the canonical Karagöz lesson instead of relying on lazy-list
        // composition order; the Pixel 6 test viewport does not compose every card.
        composeRule.onNodeWithTag("library-search-field").performTextInput("Karagöz")
        // Scroll the actual catalog list: with the keyboard open, lazy items
        // may exist in data but not yet be composed in the visible viewport.
        composeRule.onNodeWithTag("library-lesson-list")
            .performScrollToNode(hasText("Karagöz — Yazıcı", substring = true))
        composeRule.onAllNodes(hasTestTag("library-lesson-open"))[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-presentation-toggle").and(isEnabled()))
        }
        if (hasNodes(hasTestTag("lesson-outline-open"))) {
            composeRule.onNodeWithTag("lesson-outline-open").performClick()
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-outline-step-2"))
        }
        composeRule.onNodeWithTag("lesson-outline-step-2").performClick()
        // The question card sits below the lesson header in a lazy list. Scroll
        // to it before checking the teacher-only canonical answer.
        composeRule.onNodeWithTag("lesson-screen-list")
            .performScrollToNode(hasTestTag("lesson-workspace-answer"))
        composeRule.onNodeWithTag("lesson-previous").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag("lesson-next").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag("lesson-workspace-answer").assertExists()
        assertTrue(
            "Teacher answer is always visible; answer toggle must not be rendered",
            !hasNodes(hasTestTag("lesson-answer-toggle"))
        )
        // Evidence lives in the teacher assist sheet, not in a legacy
        // "lesson-evidence-toggle" attached to the workspace.
        composeRule.onNodeWithTag("lesson-screen-list")
            .performScrollToNode(hasTestTag("teacher-assist-open-card"))
        composeRule.onNodeWithTag("teacher-assist-open-card").performClick()
        composeRule.onNodeWithTag("teacher-assist-sheet").assertExists()
        composeRule.onNodeWithText("METİNSEL KANIT").assertExists()
        composeRule.onNodeWithTag("teacher-assist-close").performClick()
        composeRule.onNodeWithTag("lesson-screen-list")
            .performScrollToNode(hasTestTag("lesson-presentation-toggle"))
        composeRule.onNodeWithTag("lesson-presentation-toggle")
            .assertIsEnabled().performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasText("Sunumdan çık"))
        }
        composeRule.onNodeWithText("Sunumdan çık").assertExists()
        composeRule.onNodeWithText("Yazı:", substring = true).performClick()
        composeRule.onNodeWithText("Çok büyük").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasText("Yazı: Çok büyük"))
        }
        assertTrue(
            composeRule.onAllNodesWithText("Öğretmen notu")
                .fetchSemanticsNodes().isEmpty()
        )

        composeRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-presentation-toggle").and(isEnabled()))
        }
        composeRule.onNodeWithText("Sunumdan çık").assertDoesNotExist()

        composeRule.onNodeWithTag("lesson-presentation-toggle")
            .assertIsEnabled().performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasText("Yazı: Çok büyük"))
        }
        composeRule.onNodeWithText("Yazı:", substring = true).performClick()
        composeRule.onNodeWithText("Normal").performClick()
        composeRule.onNodeWithText("Sunumdan çık").performClick()
    }

    @Test
    fun portraitFlowOpensAndSelectingAStepKeepsTheLessonScreen() {
        composeRule.activityRule.scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("library-screen-surface"))
        }
        composeRule.onAllNodes(hasTestTag("library-lesson-open"))[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-outline-open").and(isEnabled())) ||
                hasNodes(hasTestTag("lesson-outline-step-2"))
        }
        if (hasNodes(hasTestTag("lesson-outline-open"))) {
            composeRule.onNodeWithTag("lesson-outline-open")
                .assertIsEnabled().performClick()
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-outline-step-2"))
        }
        composeRule.onNodeWithTag("lesson-outline-step-2").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-step-counter").and(hasText("· 2/", substring = true))) ||
                hasNodes(hasTestTag("lesson-outline-step-2").and(isSelected()))
        }
        composeRule.onNodeWithTag("lesson-screen-list").assertExists()
        if (hasNodes(hasTestTag("lesson-step-counter"))) {
            composeRule.onNodeWithTag("lesson-step-counter")
                .assertTextContains("· 2/", substring = true)
        } else {
            composeRule.onNodeWithTag("lesson-outline-step-2").assertIsSelected()
        }
    }

    @Test
    fun backupPassphraseStartsMaskedAndCanBeShownOnDemand() {
        composeRule.activityRule.scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("library-screen-surface"))
        }
        composeRule.onNodeWithTag("app-navigation-settings").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("settings-list"))
        }
        composeRule.onNodeWithTag("settings-list")
            .performScrollToNode(hasText("Yedek parolası"))
        composeRule.onNodeWithTag("backup-passphrase-visibility-toggle")
            .assertTextContains("Göster")
        composeRule.onNodeWithTag("backup-passphrase").performTextInput("a11-tablet-pass")
        composeRule.onNodeWithTag("backup-passphrase-visibility-toggle").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("backup-passphrase-visibility-toggle").and(hasText("Gizle")))
        }
    }
    @Test
    fun teacherCanOpenNativeEditorWithoutPresentationMode() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("library-screen-surface"))
        }
        // Filter to Karagöz so the test is independent of catalog ordering and
        // which lazy-list cards happen to be composed.
        composeRule.onNodeWithTag("library-search-field").performTextInput("Karagöz")
        // Scroll the actual catalog list: with the keyboard open, lazy items
        // may exist in data but not yet be composed in the visible viewport.
        composeRule.onNodeWithTag("library-lesson-list")
            .performScrollToNode(hasText("Karagöz — Yazıcı", substring = true))
        composeRule.onAllNodes(hasTestTag("library-lesson-open"))[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-presentation-toggle").and(isEnabled()))
        }
        if (hasNodes(hasTestTag("lesson-outline-open"))) {
            composeRule.onNodeWithTag("lesson-outline-open").performClick()
        }
        // The outline restores scroll to the last selected step; its first
        // row may not be composed until explicitly scrolled into view.
        composeRule.onNodeWithTag("lesson-outline-list")
            .performScrollToNode(hasTestTag("lesson-outline-step-1"))
        composeRule.onNodeWithTag("lesson-outline-step-1").performClick()
        val lessonList = composeRule.onNodeWithTag("lesson-screen-list")
        // The editor is a lazy-list item below the initial viewport, so scroll it
        // into composition before asserting/interacting with its test tag.
        lessonList.performScrollToNode(hasTestTag("lesson-editor-open"))
        composeRule.onNodeWithTag("lesson-editor-open").performClick()
        composeRule.onNodeWithText("Yerel adım düzenleme").assertExists()
        composeRule.onNodeWithText("Soru / başlık").assertExists()
        lessonList.performScrollToNode(hasTestTag("lesson-editor"))
        // This smoke test selects the first lesson step, which may not have
        // editable content; check the editor sections that are always present.
        composeRule.onNodeWithText("Görünüm ve yoğunluk").assertExists()
        composeRule.onNodeWithText("Açılım sırası").assertExists()
        lessonList.performScrollToNode(hasText("Düzenlemeyi kapat"))
        composeRule.onNodeWithText("Düzenlemeyi kapat").performClick()
    }

    @Test
    fun teacherGuideShowsThreePersistentTrackingLanes() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("library-screen-surface"))
        }
        composeRule.onNodeWithTag("app-navigation-guide").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("teacher-guide-list"))
        }
        composeRule.onNodeWithText("1 · EDEBİYAT ATÖLYESİ").assertExists()
        composeRule.onNodeWithText("Yıllık plan").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasText("2 · DÖRT ESER + BİR FİLM"))
        }
        composeRule.onNodeWithText("2 · DÖRT ESER + BİR FİLM").assertExists()
        composeRule.onNodeWithText("Portfolyo").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasText("3 · PORTFOLYO VE DEĞERLENDİRME"))
        }
        composeRule.onNodeWithText("3 · PORTFOLYO VE DEĞERLENDİRME").assertExists()
        composeRule.onNodeWithText("Tema sonu yansıtma · Tema sonu 3-2-1 çıkış kartı")
            .assertExists()
    }

}
