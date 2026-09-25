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
        get() = isLandscape && widthClass != LessonWindowWidthClass.COMPACT && !isShort

    val usesThreeColumn: Boolean
        get() = isLandscape && widthDp >= 1000 && !isShort

    val usesTeacherAssistDrawer: Boolean
        get() = !usesThreeColumn && isLandscape && !isShort

    val usesTeacherAssistBottomSheet: Boolean
        get() = !usesThreeColumn && !usesTeacherAssistDrawer

    val usesLessonOutline: Boolean
        get() = lessonOutlineFits(
            usableContentWidthDp = widthDp.toFloat() -
                if (usesRail) {
                    (NAVIGATION_RAIL_WIDTH_DP + SAFE_HORIZONTAL_INSETS_DP).toFloat()
                } else 0f,
            usableContentHeightDp = heightDp.toFloat(),
            isLandscape = isLandscape
        )

    val isShort: Boolean
        get() = heightDp < 560

    val isLandscape: Boolean
        get() = widthDp > heightDp
}

private const val NAVIGATION_RAIL_WIDTH_DP = 80
private const val SAFE_HORIZONTAL_INSETS_DP = 48
private const val OUTLINE_MIN_WIDTH_DP = 240
private const val LESSON_READER_MIN_WIDTH_DP = 640
private const val OUTLINE_GAP_DP = 16

internal fun lessonOutlineFits(
    usableContentWidthDp: Float,
    usableContentHeightDp: Float,
    isLandscape: Boolean
): Boolean = isLandscape &&
    usableContentHeightDp >= 560f &&
    usableContentWidthDp >= OUTLINE_MIN_WIDTH_DP + OUTLINE_GAP_DP +
        LESSON_READER_MIN_WIDTH_DP

internal fun lessonWindowLayout(widthDp: Int, heightDp: Int): LessonWindowLayout {
    val widthClass = when {
        widthDp < 600 -> LessonWindowWidthClass.COMPACT
        widthDp < 900 -> LessonWindowWidthClass.MEDIUM
        else -> LessonWindowWidthClass.EXPANDED
    }
    return LessonWindowLayout(widthClass, widthDp, heightDp)
}
