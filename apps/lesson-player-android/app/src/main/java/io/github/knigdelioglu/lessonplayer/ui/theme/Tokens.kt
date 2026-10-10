package io.github.knigdelioglu.lessonplayer.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

object LessonColors {
    // V2 Core Palette
    val Primary = Color(0xFF5434D4)
    val Header = Color(0xFF4C30B4)
    val SidebarBg = Color(0xFF282054)
    val SidebarSurface = Color(0xFF2C245C)
    val SidebarActive = Color(0xFFCCC8FC)
    val SidebarText = Color(0xFFFFFFFF)
    val SidebarSubtext = Color(0xFFA59FD6)

    val AppBg = Color(0xFFF7F8FC)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceSoft = Color(0xFFF3F4FA)
    val Border = Color(0xFFD9DDE8)

    val TextPrimary = Color(0xFF171729)
    val TextSecondary = Color(0xFF676B7C)

    // Semantic Assist Surfaces (Light)
    // Rehber (Guidance) - Soft Mavi
    val GuidanceSurface = Color(0xFFEBF3FE)
    val GuidanceBorder = Color(0xFFC6DCFC)
    val GuidanceText = Color(0xFF164E8C)

    // Cevap (Answer) - Soft Yeşil
    val AnswerSurface = Color(0xFFEAF8F0)
    val AnswerBorder = Color(0xFFBCE9CE)
    val AnswerText = Color(0xFF145C32)

    // Açıklama (Explanation) - Soft Şeftali
    val ExplanationSurface = Color(0xFFFFF4ED)
    val ExplanationBorder = Color(0xFFFCD3BD)
    val ExplanationText = Color(0xFF873809)

    // Metinsel Kanıt (Evidence) - Soft Lavanta
    val EvidenceSurface = Color(0xFFF3EFFF)
    val EvidenceBorder = Color(0xFFD9CEFD)
    val EvidenceText = Color(0xFF4C2CA6)

    // Öğretmen Notu (Note) - Soft Kehribar
    val NoteSurface = Color(0xFFFDF8EE)
    val NoteBorder = Color(0xFFF5E5BE)
    val NoteText = Color(0xFF734B0B)

    // Error
    val Error = Color(0xFFBA1A1A)
    val ErrorContainer = Color(0xFFFFDAD6)
    val OnError = Color(0xFFFFFFFF)
    val OnErrorContainer = Color(0xFF410002)
}

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
    val button = 12.dp
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

/**
 * ÖğretmenRehberi Tasarım Sistemi (ORDS) - Jetpack Compose Eşleme Tokenları
 * Web Sunumu (Modern QA) ve React Lesson Player ile 1:1 uyumlu kanonik token eşlemesi.
 * Aşama 1 sözleşmesi uyarınca mevcut ekranları etkilemeden tanımlanmıştır.
 */
object OrdsDesignTokens {
    // 1. Zemin ve Yüzeyler (Surfaces & Backgrounds)
    val BgApp = Color(0xFFF7F8F5)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceRaised = Color(0xFFFFFFFF)
    val SurfaceMuted = Color(0xFFF0F3F2)
    val Border = Color(0xFFD7E0DF)
    val BorderSubtle = Color(0xFFE8EEED)
    val BorderStrong = Color(0xFFB8C5C4)

    // 2. Metin (Typography & Inks)
    val TextPrimary = Color(0xFF182A35)
    val TextSecondary = Color(0xFF5B6B73)
    val TextMuted = Color(0xFF718087)

    // 3. Marka / Primary (Teal)
    val Primary = Color(0xFF176D68)
    val PrimarySoft = Color(0xFFE2EFEB)
    val PrimaryStrong = Color(0xFF0F524E)

    // 4. Pedagojik Destek Sütunları (Educational Assist Pillars)
    val Answer = Color(0xFF176D68)
    val AnswerSurface = Color(0xFFE2EFEB)
    val AnswerBorder = Color(0xFFB8CEC6)

    val Guidance = Color(0xFF9A650F)
    val GuidanceSurface = Color(0xFFF8EFD9)
    val GuidanceBorder = Color(0xFFECD9B0)

    val Evidence = Color(0xFF5363A7)
    val EvidenceSurface = Color(0xFFECEEFA)
    val EvidenceBorder = Color(0xFFCFD5F2)

    val Explanation = Color(0xFF765494)
    val ExplanationSurface = Color(0xFFF1EAF6)
    val ExplanationBorder = Color(0xFFDECCEB)

    val Note = Color(0xFF9A5D2F)
    val NoteSurface = Color(0xFFF4E8DC)
    val NoteBorder = Color(0xFFE6CEB8)
}

