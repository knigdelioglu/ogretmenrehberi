package io.github.knigdelioglu.lessonplayer.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

object LessonSpacing {
    val tiny = 6.dp
    val small = 12.dp
    val medium = 18.dp
    val large = 24.dp
    val section = 32.dp
}

object LessonShape {
    val card = 22.dp
    val chip = 12.dp
}

object LessonTarget {
    val minimum = 48.dp
}

data class LessonVisualDensity(
    val screenPadding: Dp,
    val blockGap: Dp,
    val cardPadding: Dp,
    val rowPadding: Dp
)

fun lessonVisualDensity(value: String): LessonVisualDensity = when (value) {
    "large" -> LessonVisualDensity(
        screenPadding = 28.dp,
        blockGap = 24.dp,
        cardPadding = 28.dp,
        rowPadding = 24.dp
    )
    "compact" -> LessonVisualDensity(
        screenPadding = 16.dp,
        blockGap = 12.dp,
        cardPadding = 16.dp,
        rowPadding = 12.dp
    )
    else -> LessonVisualDensity(
        screenPadding = LessonSpacing.large,
        blockGap = LessonSpacing.medium,
        cardPadding = LessonSpacing.large,
        rowPadding = LessonSpacing.medium
    )
}
