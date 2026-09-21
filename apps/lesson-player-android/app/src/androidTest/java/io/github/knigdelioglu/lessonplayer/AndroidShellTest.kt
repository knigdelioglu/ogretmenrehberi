package io.github.knigdelioglu.lessonplayer

import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.createComposeRule
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Rule
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
        onNodeWithText("Ders, elinin altında.").assertExists()
        onNodeWithText("48 ders · 914 adım · internet gerekmez").assertExists()

        onAllNodesWithText("Adımları incele").onFirst().performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sınıf sunumuna geç")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        onNodeWithText("Sınıf sunumuna geç").performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sunumdan çık")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        onNodeWithText("Sunumdan çık").assertExists()
        onNodeWithText("Öğretmen notu").assertDoesNotExist()
    }
}
