package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.runtime.Composable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
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
    LessonTheme(darkTheme = true) {
        androidx.compose.material3.Text("Lesson Player · Android 16")
    }
}

@Preview(name = "03 · Medium tablet", widthDp = 840, heightDp = 900, showBackground = true)
@Composable
private fun MediumTabletPreview() {
    LessonTheme { WindowLayoutPreview(840, 900) }
}

@Preview(name = "04 · Expanded tablet", widthDp = 1280, heightDp = 800, showBackground = true)
@Composable
private fun ExpandedTabletPreview() {
    LessonTheme { WindowLayoutPreview(1280, 800) }
}

@Composable
private fun WindowLayoutPreview(widthDp: Int, heightDp: Int) {
    val layout = lessonWindowLayout(widthDp, heightDp)
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "${layout.widthClass} · ${if (layout.usesLessonOutline) "ders akışı + içerik" else "tek içerik"}",
                style = MaterialTheme.typography.titleMedium
            )
            Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (layout.usesRail) {
                    Surface(modifier = Modifier.width(72.dp), color = MaterialTheme.colorScheme.secondaryContainer) {}
                }
                if (layout.usesLessonOutline) {
                    Surface(modifier = Modifier.width(260.dp), color = MaterialTheme.colorScheme.surfaceVariant) {}
                }
                Surface(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.primaryContainer) {}
            }
        }
    }
}
