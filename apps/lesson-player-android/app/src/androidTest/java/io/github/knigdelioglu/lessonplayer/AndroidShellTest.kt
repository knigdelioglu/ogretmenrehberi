package io.github.knigdelioglu.lessonplayer

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class AndroidShellTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun nativeLibraryIsVisibleWithoutBundledLessons() {
        composeRule.onNodeWithText("Ders, elinin altında.").assertExists()
        composeRule.onNodeWithText(
            "Bu ekran yerel uygulama iskeletidir. Doğrulanmış 48 ders akışı Faz 2'de bağlanacak."
        ).assertExists()
    }
}
