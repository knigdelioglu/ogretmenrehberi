package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors

/**
 * Tablet lesson screen layout with dynamic column management:
 * 1. The leftmost column (sidebar) is initially hidden on entry.
 * 2. Swiping right from the left edge reveals the sidebar as an overlay on top of the middle screen,
 *    without pushing or resizing other columns.
 * 3. Touching outside the open sidebar (the scrim) dismisses it.
 * 4. When hidden, the vacated width is transferred exclusively to the middle workspace column,
 *    leaving the teacher assist column unchanged in size and position.
 * 5. Uses isolated graphicsLayer rendering to eliminate relayout/remeasure of the wide screen during gestures.
 */
@Composable
internal fun ExpandedLessonLayout(
    modifier: Modifier = Modifier,
    isSidebarOpen: Boolean = false,
    onSidebarOpenChange: (Boolean) -> Unit = {},
    sidebar: @Composable (Modifier) -> Unit,
    workspace: @Composable (Modifier) -> Unit,
    teacherAssist: @Composable (Modifier) -> Unit
) {
    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(LessonColors.AppBg)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        val totalWidth = maxWidth
        val sidebarWidth = (totalWidth * (LessonShellLayoutContract.SIDEBAR_WEIGHT / 100f))
            .coerceAtLeast(LessonShellLayoutContract.MIN_SIDEBAR_WIDTH_DP.dp)
        val density = LocalDensity.current
        val sidebarWidthPx = with(density) { sidebarWidth.toPx() }

        // Base 2-column layout: Workspace takes 78% (56% + sidebar's 22%), TeacherAssist takes 22%
        // Isolated in its own GPU graphicsLayer so relayout/redraw never happens during sidebar overlay animations
        Row(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { }
        ) {
            workspace(
                Modifier
                    .weight(LessonShellLayoutContract.WORKSPACE_WEIGHT + LessonShellLayoutContract.SIDEBAR_WEIGHT)
                    .fillMaxHeight()
                    .testTag("tablet-lesson-workspace-column")
            )
            teacherAssist(
                Modifier
                    .weight(LessonShellLayoutContract.TEACHER_ASSIST_WEIGHT)
                    .fillMaxHeight()
                    .testTag("tablet-lesson-teacher-assist-column")
            )
        }

        // Overlay animation state
        val animProgress = remember { Animatable(if (isSidebarOpen) 1f else 0f) }
        var isOverlayAttached by remember { mutableStateOf(isSidebarOpen) }

        LaunchedEffect(isSidebarOpen) {
            if (isSidebarOpen) {
                isOverlayAttached = true
                animProgress.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 240, easing = FastOutSlowInEasing)
                )
            } else {
                if (animProgress.value > 0f) {
                    animProgress.animateTo(
                        targetValue = 0f,
                        animationSpec = tween(durationMillis = 200, easing = FastOutSlowInEasing)
                    )
                }
                isOverlayAttached = false
            }
        }

        // Left edge swipe detection area when sidebar is closed
        if (!isSidebarOpen) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .fillMaxHeight()
                    .width(48.dp)
                    .testTag("tablet-lesson-edge-swipe-area")
                    .pointerInput(Unit) {
                        var accumulated = 0f
                        detectHorizontalDragGestures(
                            onDragStart = { accumulated = 0f },
                            onDragEnd = { accumulated = 0f },
                            onDragCancel = { accumulated = 0f }
                        ) { change, dragAmount ->
                            accumulated += dragAmount
                            if (accumulated > 15f) {
                                change.consume()
                                onSidebarOpenChange(true)
                            }
                        }
                    }
            )
        }

        // Overlay scrim & sidebar: Attached only when open or animating
        if (isOverlayAttached) {
            // Dismiss scrim with GPU alpha fade
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        alpha = animProgress.value * 0.32f
                    }
                    .background(Color.Black)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        onSidebarOpenChange(false)
                    }
                    .testTag("tablet-lesson-sidebar-scrim")
            )

            // Overlay sidebar: GPU translationX animation without layout-phase relayout
            Surface(
                modifier = Modifier
                    .width(sidebarWidth)
                    .fillMaxHeight()
                    .graphicsLayer {
                        translationX = -(1f - animProgress.value) * sidebarWidthPx
                    }
                    .shadow(elevation = 16.dp)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { /* Absorb clicks inside sidebar */ }
                    .testTag("tablet-lesson-sidebar-overlay")
                    .pointerInput(Unit) {
                        var closeAccumulated = 0f
                        detectHorizontalDragGestures(
                            onDragStart = { closeAccumulated = 0f },
                            onDragEnd = { closeAccumulated = 0f },
                            onDragCancel = { closeAccumulated = 0f }
                        ) { change, dragAmount ->
                            closeAccumulated += dragAmount
                            if (closeAccumulated < -15f) {
                                change.consume()
                                onSidebarOpenChange(false)
                            }
                        }
                    },
                color = Color(0xFFFAFBFE).copy(alpha = 0.98f)
            ) {
                sidebar(Modifier.fillMaxSize())
            }
        }
    }
}
