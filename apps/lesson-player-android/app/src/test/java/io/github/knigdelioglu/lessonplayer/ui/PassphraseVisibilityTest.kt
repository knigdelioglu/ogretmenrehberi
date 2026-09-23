package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class PassphraseVisibilityTest {
    @Test
    fun backupPassphraseIsMaskedUntilTeacherAsksToShowIt() {
        assertTrue(
            backupPassphraseVisualTransformation(showPassphrase = false)
                is PasswordVisualTransformation
        )
        assertSame(
            VisualTransformation.None,
            backupPassphraseVisualTransformation(showPassphrase = true)
        )
    }
}
