package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

@Composable
internal fun LessonActionStatus(
    state: LessonActionUiState,
    retry: () -> Unit
) {
    if (!state.busy && state.message == null) return

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = if (state.isError) {
            MaterialTheme.colorScheme.errorContainer
        } else {
            MaterialTheme.colorScheme.secondaryContainer
        }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(
                horizontal = LessonSpacing.medium,
                vertical = LessonSpacing.tiny
            ),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                if (state.busy) "Kaydediliyor…" else state.message.orEmpty(),
                modifier = Modifier.weight(1f),
                color = if (state.isError) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.onSecondaryContainer
                }
            )
            if (!state.busy && state.message != null) {
                TextButton(
                    onClick = retry,
                    modifier = Modifier.heightIn(min = LessonTarget.minimum)
                ) {
                    Text("Yeniden dene")
                }
            }
        }
    }
}
