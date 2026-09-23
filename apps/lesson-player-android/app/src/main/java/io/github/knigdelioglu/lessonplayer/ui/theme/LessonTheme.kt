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

// Low-saturation, paper-like light palette for long reading sessions.
val Ink = Color(0xFF253443)
val Mint = Color(0xFFE8F1F6)
val Paper = Color(0xFFF7F9FB)
val Amber = Color(0xFFAE8050)
val AmberText = Color(0xFF795329)
val SoftInk = Color(0xFF526477)
val DeepSurface = Color(0xFF142521)

internal val Light = lightColorScheme(
    primary = Color(0xFF415F73),
    onPrimary = Color.White,
    primaryContainer = Mint,
    onPrimaryContainer = Ink,
    secondary = SoftInk,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFEDF3F7),
    onSecondaryContainer = Ink,
    tertiary = AmberText,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFF7EFE4),
    onTertiaryContainer = Color(0xFF634521),
    background = Paper,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Color(0xFFEEF2F5),
    onSurfaceVariant = SoftInk,
    outline = Color(0xFFB5C3CC),
    outlineVariant = Color(0xFFDCE5EB),
    error = Color(0xFFB3261E),
    onError = Color.White,
    errorContainer = Color(0xFFFCECE8),
    onErrorContainer = Color(0xFF5F1814),
    inverseSurface = Ink,
    inverseOnSurface = Paper
)

private val Dark = darkColorScheme(
    primary = Color(0xFFA9D5C3),
    onPrimary = DeepSurface,
    primaryContainer = Color(0xFF29493F),
    onPrimaryContainer = Color(0xFFE3F5EB),
    secondary = Color(0xFFDDBB83),
    onSecondary = DeepSurface,
    background = Color(0xFF101B18),
    onBackground = Color(0xFFE6F2EA),
    surface = DeepSurface,
    onSurface = Color(0xFFE6F2EA),
    surfaceVariant = Color(0xFF2B3D36),
    onSurfaceVariant = Color(0xFFC4D6CA),
    outline = Color(0xFF5B786A)
)

private val LessonTypography = Typography(
    headlineLarge = TextStyle(fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontSize = 26.sp, lineHeight = 32.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 29.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 17.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 27.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 23.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium)
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
