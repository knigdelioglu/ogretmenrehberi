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
        get() = LessonShellLayoutContract.fitsThreeColumns(
            usableWidthDp = widthDp.toFloat(),
            usableHeightDp = heightDp.toFloat(),
            isLandscape = isLandscape
        )

    val usesTeacherAssistDrawer: Boolean
        get() = !usesThreeColumn && isLandscape && !isShort

    val usesTeacherAssistBottomSheet: Boolean
        get() = !usesThreeColumn && !usesTeacherAssistDrawer

    val usesLessonOutline: Boolean
        get() = lessonOutlineFits(
            usableContentWidthDp = widthDp.toFloat() -
                if (usesRail) NAVIGATION_RAIL_WIDTH_DP.toFloat() else 0f,
            usableContentHeightDp = heightDp.toFloat(),
            isLandscape = isLandscape
        )

    val isShort: Boolean
        get() = heightDp < LessonShellLayoutContract.MIN_LANDSCAPE_HEIGHT_DP

    val isLandscape: Boolean
        get() = widthDp > heightDp
}

private const val NAVIGATION_RAIL_WIDTH_DP = 80
private const val OUTLINE_MIN_WIDTH_DP = 240
private const val LESSON_READER_MIN_WIDTH_DP = 640
private const val OUTLINE_GAP_DP = 16

/** Shared layout and fit contract for runtime and expanded tablet previews. */
internal object LessonShellLayoutContract {
    const val SIDEBAR_WEIGHT = 22f
    const val WORKSPACE_WEIGHT = 56f
    const val TEACHER_ASSIST_WEIGHT = 22f

    const val MIN_SIDEBAR_WIDTH_DP = 240f
    const val MIN_WORKSPACE_WIDTH_DP = 680f
    const val MIN_TEACHER_ASSIST_WIDTH_DP = 280f
    const val MIN_LANDSCAPE_HEIGHT_DP = 560f

    // Includes room for five concise labelled actions, navigation buttons, and gaps.
    const val ACTION_BAR_LABELLED_WIDTH_DP = 640f

    data class ColumnWidths(
        val sidebarDp: Float,
        val workspaceDp: Float,
        val teacherAssistDp: Float
    )

    data class HiddenSidebarColumnWidths(
        val workspaceDp: Float,
        val teacherAssistDp: Float
    )

    fun columnWidths(usableWidthDp: Float): ColumnWidths {
        val totalWeight = SIDEBAR_WEIGHT + WORKSPACE_WEIGHT + TEACHER_ASSIST_WEIGHT
        return ColumnWidths(
            sidebarDp = usableWidthDp * SIDEBAR_WEIGHT / totalWeight,
            workspaceDp = usableWidthDp * WORKSPACE_WEIGHT / totalWeight,
            teacherAssistDp = usableWidthDp * TEACHER_ASSIST_WEIGHT / totalWeight
        )
    }

    fun hiddenSidebarColumnWidths(usableWidthDp: Float): HiddenSidebarColumnWidths {
        val totalWeight = SIDEBAR_WEIGHT + WORKSPACE_WEIGHT + TEACHER_ASSIST_WEIGHT
        return HiddenSidebarColumnWidths(
            workspaceDp = usableWidthDp * (WORKSPACE_WEIGHT + SIDEBAR_WEIGHT) / totalWeight,
            teacherAssistDp = usableWidthDp * TEACHER_ASSIST_WEIGHT / totalWeight
        )
    }

    fun fitsThreeColumns(
        usableWidthDp: Float,
        usableHeightDp: Float,
        isLandscape: Boolean
    ): Boolean {
        if (!isLandscape || usableHeightDp < MIN_LANDSCAPE_HEIGHT_DP) return false
        val columns = columnWidths(usableWidthDp)
        return columns.sidebarDp >= MIN_SIDEBAR_WIDTH_DP &&
            columns.workspaceDp >= MIN_WORKSPACE_WIDTH_DP &&
            columns.teacherAssistDp >= MIN_TEACHER_ASSIST_WIDTH_DP
    }

    fun actionBarUsesLabels(centerWidthDp: Float, fontScale: Float): Boolean =
        centerWidthDp >= ACTION_BAR_LABELLED_WIDTH_DP * fontScale.coerceAtLeast(1f)
}

data class LessonWindowInsetsDp(
    val start: Float = 0f,
    val top: Float = 0f,
    val end: Float = 0f,
    val bottom: Float = 0f
)

internal fun lessonOutlineFits(
    usableContentWidthDp: Float,
    usableContentHeightDp: Float,
    isLandscape: Boolean
): Boolean = isLandscape &&
    usableContentHeightDp >= 560f &&
    usableContentWidthDp >= OUTLINE_MIN_WIDTH_DP + OUTLINE_GAP_DP +
        LESSON_READER_MIN_WIDTH_DP

internal fun lessonWindowLayout(
    widthDp: Int,
    heightDp: Int,
    safeDrawingInsets: LessonWindowInsetsDp = LessonWindowInsetsDp()
): LessonWindowLayout {
    val usableWidth = (widthDp - safeDrawingInsets.start - safeDrawingInsets.end)
        .toInt().coerceAtLeast(0)
    val usableHeight = (heightDp - safeDrawingInsets.top - safeDrawingInsets.bottom)
        .toInt().coerceAtLeast(0)
    val widthClass = when {
        usableWidth < 600 -> LessonWindowWidthClass.COMPACT
        usableWidth < 900 -> LessonWindowWidthClass.MEDIUM
        else -> LessonWindowWidthClass.EXPANDED
    }
    return LessonWindowLayout(widthClass, usableWidth, usableHeight)
}
