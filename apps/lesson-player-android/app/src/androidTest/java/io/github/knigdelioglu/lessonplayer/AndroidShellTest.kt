package io.github.knigdelioglu.lessonplayer

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class AndroidShellTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun nativeLibraryUsesValidatedOfflineCatalog() {
        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodes(
                androidx.compose.ui.test.hasText("Ders, elinin altında.")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Ders, elinin altında.").assertExists()
        composeRule.onNodeWithText("48 ders · 914 adım · internet gerekmez").assertExists()
    }
}
