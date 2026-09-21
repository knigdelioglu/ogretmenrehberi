package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme

// Data-backed screens require a validated APK asset and are previewed on the emulator.
// These lightweight previews cover chrome and loading without inventing lesson content.
@Preview(name = "01 · Loading", widthDp = 720, heightDp = 1000, showBackground = true)
@Composable
private fun LoadingPreview() {
    LessonTheme { androidx.compose.material3.Text("Dersler doğrulanıyor…") }
}

@Preview(name = "02 · Dark", widthDp = 1000, heightDp = 680, showBackground = true)
@Composable
private fun DarkPreview() {
    LessonTheme { androidx.compose.material3.Text("Lesson Player · Android 16") }
}
