package io.github.knigdelioglu.lessonplayer

import android.content.pm.ActivityInfo
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasText
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

    @Test
    fun nativeLibraryUsesValidatedOfflineCatalogAndPresentationSurface() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Ders, elinin altında.")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Ders, elinin altında.").assertExists()
        composeRule.onNode(hasText("ders ·", substring = true)).assertExists()

        composeRule.onAllNodesWithText("Adımları incele")[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sınıf sunumuna geç")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Önceki").assertHeightIsAtLeast(48.dp)
        composeRule.onAllNodes(hasText("Göster:", substring = true))[0]
            .assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("Sonraki").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("Sınıf sunumuna geç").performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sunumdan çık")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Sunumdan çık").assertExists()
        composeRule.onNodeWithText("Yazı:", substring = true).performClick()
        composeRule.onNodeWithText("Çok büyük").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Yazı: Çok büyük")
                .fetchSemanticsNodes().isNotEmpty()
        }
        assertTrue(
            composeRule.onAllNodesWithText("Öğretmen notu")
                .fetchSemanticsNodes().isEmpty()
        )

        composeRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sınıf sunumuna geç")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Sunumdan çık").assertDoesNotExist()

        composeRule.onAllNodesWithText("Sınıf sunumuna geç")[0].performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Yazı: Çok büyük")
                .fetchSemanticsNodes().isNotEmpty()
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
            composeRule.onAllNodes(hasText("Ders, elinin altında."))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText("Adımları incele")[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(hasText("Ders akışı", substring = true))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Ders akışı", substring = true).performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("DERS AKIŞI")
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("lesson-outline-step-2").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodes(hasText("· 2/", substring = true))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("lesson-step-counter").assertTextContains("· 2/")
        composeRule.onNodeWithText("Sınıf sunumuna geç").assertExists()
    }

    @Test
    fun backupPassphraseStartsMaskedAndCanBeShownOnDemand() {
        composeRule.activityRule.scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(hasText("Ders, elinin altında."))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Ayarlar").performClick()
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithText("Veri ve yedekleme")
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithTag("settings-list")
            .performScrollToNode(hasText("Yedek parolası"))
        composeRule.onNodeWithText("Göster").assertExists()
        composeRule.onNodeWithTag("backup-passphrase").performTextInput("a11-tablet-pass")
        composeRule.onNodeWithText("Göster").performClick()
        composeRule.onNodeWithText("Gizle").assertExists()
    }
    @Test
    fun teacherCanOpenNativeEditorWithoutPresentationMode() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Ders, elinin altında.")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithText("Adımları incele")[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sınıf sunumuna geç")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        val lessonList = composeRule.onNodeWithTag("lesson-screen-list")
        lessonList.performScrollToNode(hasText("Adımı düzenle"))
        composeRule.onNodeWithText("Adımı düzenle").performClick()
        composeRule.onNodeWithText("Yerel adım düzenleme").assertExists()
        composeRule.onNodeWithText("Soru / başlık").assertExists()
        composeRule.onNodeWithText("Süreç maddeleri ve bilgi kartları").assertExists()
        composeRule.onNodeWithText("Düzenlemeyi kapat").performClick()
    }

    @Test
    fun teacherGuideShowsThreePersistentTrackingLanes() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Ders, elinin altında.")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Rehber").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Üç ayrı takip hattı")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("1 · EDEBİYAT ATÖLYESİ").assertExists()
        composeRule.onNodeWithText("Yıllık plan").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("2 · DÖRT ESER + BİR FİLM")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("2 · DÖRT ESER + BİR FİLM").assertExists()
        composeRule.onNodeWithText("Portfolyo").performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("3 · PORTFOLYO VE DEĞERLENDİRME")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("3 · PORTFOLYO VE DEĞERLENDİRME").assertExists()
        composeRule.onNodeWithText("Tema sonu yansıtma · Tema sonu 3-2-1 çıkış kartı")
            .assertExists()
    }

}
