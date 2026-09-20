package io.github.knigdelioglu.lessonplayer.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Purpose-built teacher/lesson palette, not the stock Material template.
val Ink = Color(0xFF173B36)
val Mint = Color(0xFFE9F3EC)
val Paper = Color(0xFFF6F4EB)
val Amber = Color(0xFFCF9953)
val SoftInk = Color(0xFF4A6158)
val DeepSurface = Color(0xFF142521)

private val Light = lightColorScheme(
    primary = Ink,
    onPrimary = Color.White,
    primaryContainer = Mint,
    onPrimaryContainer = Ink,
    secondary = SoftInk,
    onSecondary = Color.White,
    background = Paper,
    onBackground = Ink,
    surface = Color(0xFFFEFDF8),
    onSurface = Ink,
    surfaceVariant = Color(0xFFE6EAE2),
    onSurfaceVariant = SoftInk,
    outline = Color(0xFFB2C5B9)
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

@Composable
fun LessonTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        typography = LessonTypography,
        content = content
    )
}
