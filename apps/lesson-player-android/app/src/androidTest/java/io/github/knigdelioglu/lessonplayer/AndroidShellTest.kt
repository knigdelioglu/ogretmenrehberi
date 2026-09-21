package io.github.knigdelioglu.lessonplayer

import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
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
        composeRule.onNodeWithText("48 ders · 914 adım · internet gerekmez").assertExists()

        composeRule.onAllNodesWithText("Adımları incele")[0].performClick()
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sınıf sunumuna geç")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Önceki").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("Aç / ilerle").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("Sonraki").assertHeightIsAtLeast(48.dp)
        composeRule.onNodeWithText("Sınıf sunumuna geç").performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                hasText("Sunumdan çık")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Sunumdan çık").assertExists()
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
    }
}
