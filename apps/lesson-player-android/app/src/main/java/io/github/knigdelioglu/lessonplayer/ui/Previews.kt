package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme

@Preview(name = "01 · Kitaplık", widthDp = 720, heightDp = 1000, showBackground = true)
@Composable
private fun LibraryPreview() {
    LessonTheme { LibraryScreen(navigate = {}) }
}

@Preview(name = "02 · Ders", widthDp = 1000, heightDp = 680, showBackground = true)
@Composable
private fun LessonPreview() {
    LessonTheme { LessonScreen() }
}

@Preview(name = "03 · Öğretmen rehberi", widthDp = 720, heightDp = 1000, showBackground = true)
@Composable
private fun GuidePreview() {
    LessonTheme { GuideScreen() }
}

@Preview(name = "04 · Görünüm", widthDp = 720, heightDp = 1000, showBackground = true)
@Composable
private fun SettingsPreview() {
    LessonTheme { SettingsScreen() }
}
