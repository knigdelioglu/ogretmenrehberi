package io.github.knigdelioglu.lessonplayer.ui

/**
 * Small, testable window contract for the tablet shell. The values are based on
 * the usable window rather than a device model, so split-screen and IME resize
 * transitions select the same layout as a physical tablet.
 */
enum class LessonWindowWidthClass {
    COMPACT,
    MEDIUM,
    EXPANDED
}

data class LessonWindowLayout(
    val widthClass: LessonWindowWidthClass,
    val widthDp: Int,
    val heightDp: Int
) {
    val usesRail: Boolean
        get() = widthClass != LessonWindowWidthClass.COMPACT && !isShort

    val usesLessonOutline: Boolean
        get() = widthClass == LessonWindowWidthClass.EXPANDED && !isShort

    val isShort: Boolean
        get() = heightDp < 560
}

internal fun lessonWindowLayout(widthDp: Int, heightDp: Int): LessonWindowLayout {
    val widthClass = when {
        widthDp < 600 -> LessonWindowWidthClass.COMPACT
        widthDp < 1100 -> LessonWindowWidthClass.MEDIUM
        else -> LessonWindowWidthClass.EXPANDED
    }
    return LessonWindowLayout(widthClass, widthDp, heightDp)
}
