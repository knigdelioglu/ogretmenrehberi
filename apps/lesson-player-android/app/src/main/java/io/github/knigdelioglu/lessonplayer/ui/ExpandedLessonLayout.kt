package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors

/**
 * The real expanded lesson shell used by both LessonPlayerShell and its 1280×800 preview.
 * Column weights and safe drawing treatment come from the shared shell contract.
 */
@Composable
internal fun ExpandedLessonLayout(
    modifier: Modifier = Modifier,
    sidebar: @Composable (Modifier) -> Unit,
    workspace: @Composable (Modifier) -> Unit,
    teacherAssist: @Composable (Modifier) -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxSize()
            .background(LessonColors.AppBg)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        sidebar(
            Modifier
                .weight(LessonShellLayoutContract.SIDEBAR_WEIGHT)
                .fillMaxHeight()
        )
        workspace(
            Modifier
                .weight(LessonShellLayoutContract.WORKSPACE_WEIGHT)
                .fillMaxHeight()
        )
        teacherAssist(
            Modifier
                .weight(LessonShellLayoutContract.TEACHER_ASSIST_WEIGHT)
                .fillMaxHeight()
        )
    }
}
