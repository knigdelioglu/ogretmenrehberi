package io.github.knigdelioglu.lessonplayer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Backward compatibility & central references
val Ink = LessonColors.TextPrimary
val Mint = Color(0xFFECEAFE)
val Paper = LessonColors.AppBg
val Amber = Color(0xFFAE8050)
val AmberText = LessonColors.NoteText
val SoftInk = LessonColors.TextSecondary
val DeepSurface = Color(0xFF19162C)

internal val Light = lightColorScheme(
    primary = LessonColors.Primary,
    onPrimary = Color.White,
    primaryContainer = Mint,
    onPrimaryContainer = Color(0xFF160064),
    secondary = LessonColors.Header,
    onSecondary = Color.White,
    secondaryContainer = LessonColors.SurfaceSoft,
    onSecondaryContainer = LessonColors.TextPrimary,
    tertiary = LessonColors.ExplanationText,
    onTertiary = Color.White,
    tertiaryContainer = LessonColors.ExplanationSurface,
    onTertiaryContainer = LessonColors.ExplanationText,
    background = LessonColors.AppBg,
    onBackground = LessonColors.TextPrimary,
    surface = LessonColors.Surface,
    onSurface = LessonColors.TextPrimary,
    surfaceVariant = LessonColors.SurfaceSoft,
    onSurfaceVariant = LessonColors.TextSecondary,
    outline = LessonColors.Border,
    outlineVariant = Color(0xFFE8ECF4),
    error = LessonColors.Error,
    onError = LessonColors.OnError,
    errorContainer = LessonColors.ErrorContainer,
    onErrorContainer = LessonColors.OnErrorContainer,
    inverseSurface = LessonColors.TextPrimary,
    inverseOnSurface = LessonColors.AppBg
)

private val Dark = darkColorScheme(
    primary = Color(0xFFC7BFFF),
    onPrimary = Color(0xFF260099),
    primaryContainer = Color(0xFF3D1CB7),
    onPrimaryContainer = Color(0xFFE5DEFF),
    secondary = Color(0xFFC9BEFF),
    onSecondary = Color(0xFF251080),
    background = Color(0xFF13111C),
    onBackground = Color(0xFFE5E1EC),
    surface = DeepSurface,
    onSurface = Color(0xFFE5E1EC),
    surfaceVariant = Color(0xFF282438),
    onSurfaceVariant = Color(0xFFC8C3D4),
    outline = Color(0xFF736E85)
)

private val LessonTypography = Typography(
    headlineLarge = TextStyle(fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 21.sp, lineHeight = 27.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 17.sp, lineHeight = 23.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 21.sp),
    labelLarge = TextStyle(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 11.sp, lineHeight = 14.sp)
)

internal fun contrastRatio(foreground: Color, background: Color): Double {
    fun luminance(color: Color): Double {
        fun linear(channel: Float): Double {
            val value = channel.toDouble()
            return if (value <= 0.04045) value / 12.92
            else Math.pow((value + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * linear(color.red) +
            0.7152 * linear(color.green) +
            0.0722 * linear(color.blue)
    }
    val first = luminance(foreground)
    val second = luminance(background)
    return (maxOf(first, second) + 0.05) / (minOf(first, second) + 0.05)
}

@Composable
fun LessonTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) Dark else Light,
        typography = LessonTypography,
        content = content
    )
}
