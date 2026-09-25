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

        composeRule.onAllNodes(hasTestTag("library-lesson-open"))[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-presentation-toggle").and(isEnabled()))
        }
        if (hasNodes(hasTestTag("lesson-outline-open"))) {
            composeRule.onNodeWithTag("lesson-outline-open").performClick()
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-outline-step-3"))
        }
        composeRule.onNodeWithTag("lesson-outline-step-3").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-workspace-answer")) &&
                hasNodes(hasTestTag("lesson-evidence-toggle"))
        }
        composeRule.onNodeWithTag("lesson-previous").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag("lesson-next").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithTag("lesson-workspace-answer").assertExists()
        assertTrue(
            "Teacher answer is always visible; answer toggle must not be rendered",
            !hasNodes(hasTestTag("lesson-answer-toggle"))
        )
        composeRule.onNodeWithTag("lesson-evidence-toggle").assertHeightIsAtLeast(48.dp)
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
        composeRule.onAllNodes(hasTestTag("library-lesson-open"))[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            hasNodes(hasTestTag("lesson-presentation-toggle").and(isEnabled()))
        }
        if (hasNodes(hasTestTag("lesson-outline-open"))) {
            composeRule.onNodeWithTag("lesson-outline-open").performClick()
        }
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-outline-step-1"))
        }
        composeRule.onNodeWithTag("lesson-outline-step-1").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            hasNodes(hasTestTag("lesson-editor-open"))
        }
        val lessonList = composeRule.onNodeWithTag("lesson-screen-list")
        lessonList.performScrollToNode(hasTestTag("lesson-editor-open"))
        composeRule.onNodeWithTag("lesson-editor-open").performClick()
        composeRule.onNodeWithText("Yerel adım düzenleme").assertExists()
        composeRule.onNodeWithText("Soru / başlık").assertExists()
        lessonList.performScrollToNode(hasText("Süreç maddeleri ve bilgi kartları"))
        composeRule.onNodeWithText("Süreç maddeleri ve bilgi kartları").assertExists()
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
