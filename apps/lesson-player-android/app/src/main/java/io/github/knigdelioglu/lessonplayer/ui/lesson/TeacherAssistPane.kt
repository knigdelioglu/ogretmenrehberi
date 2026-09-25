package io.github.knigdelioglu.lessonplayer.ui.lesson

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.AnswerSections
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Sağ Öğretmen Destek Paneli (Geniş Landscape Tablette ~%21–22 genişlik).
 * Yönlendirme, Cevap, Açıklama, Metinsel Kanıt kartlarını bağımsız aç/kapa mantığıyla sunar.
 * Yalnızca current effective step'in revealOrder'ında bulunan ve verisi mevcut katmanlar gösterilir;
 * desteklenmeyen/hayali buton veya unavailable placeholder'lı reveal callback üretilmez.
 */
@Composable
fun LessonV2TeacherAssistPane(
    step: LessonStep,
    session: LessonSession,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val effectiveStep = LessonEngine.effectiveStep(step, session.overrides[step.id])
    val answer = effectiveStep.answer
    var expandedPanels by rememberSaveable {
        mutableStateOf(setOf(RevealKey.GUIDANCE, RevealKey.ANSWER, RevealKey.EXPLANATION, RevealKey.EVIDENCE))
    }
    var isNoteExpanded by rememberSaveable {
        mutableStateOf(true)
    }

    fun toggleExpanded(key: RevealKey) {
        expandedPanels = if (key in expandedPanels) expandedPanels - key else expandedPanels + key
    }

    val hasGuidance = RevealKey.GUIDANCE in effectiveStep.revealOrder && !answer?.guidance.isNullOrBlank()
    val hasAnswer = RevealKey.ANSWER in effectiveStep.revealOrder && answer != null &&
        (!answer.answer.isNullOrBlank() || answer.answerSections != null)
    val hasExplanation = RevealKey.EXPLANATION in effectiveStep.revealOrder && !answer?.explanation.isNullOrBlank()
    val hasEvidence = RevealKey.EVIDENCE in effectiveStep.revealOrder && !answer?.evidenceQuotes.isNullOrEmpty()
    val hasNote = !effectiveStep.content?.note.isNullOrBlank()
    val hasAnyAssist = hasGuidance || hasAnswer || hasExplanation || hasEvidence || hasNote

    Surface(
        modifier = modifier.fillMaxHeight(),
        color = LessonColors.AppBg,
        border = BorderStroke(1.dp, LessonColors.Border)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(LessonSpacing.medium),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            if (!hasAnyAssist) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth().testTag("teacher-assist-empty-info"),
                        shape = RoundedCornerShape(12.dp),
                        color = LessonColors.SurfaceSoft,
                        border = BorderStroke(1.dp, LessonColors.Border)
                    ) {
                        Text(
                            text = "Bu adım için tanımlı öğretmen rehberliği veya reveal katmanı bulunmamaktadır.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = LessonColors.TextSecondary,
                            modifier = Modifier.padding(LessonSpacing.medium)
                        )
                    }
                }
            }

            // 1. Yönlendirme (Guidance) - Soft Mavi
            if (hasGuidance) {
                item {
                    val isRevealed = RevealKey.GUIDANCE in session.revealed
                    val isExpanded = RevealKey.GUIDANCE in expandedPanels
                    SemanticAssistCard(
                        title = "YÖNLENDİRME",
                        surfaceColor = LessonColors.GuidanceSurface,
                        borderColor = LessonColors.GuidanceBorder,
                        textColor = LessonColors.GuidanceText,
                        isExpanded = isExpanded,
                        onToggleExpand = { toggleExpanded(RevealKey.GUIDANCE) },
                        isRevealed = isRevealed,
                        enabled = enabled,
                        content = answer?.guidance.orEmpty()
                    )
                }
            }

            // 2. Cevap (Answer) - Soft Yeşil
            if (hasAnswer) {
                item {
                    val isRevealed = RevealKey.ANSWER in session.revealed
                    val isExpanded = RevealKey.ANSWER in expandedPanels
                    val answerText = answer?.answer.orEmpty()
                    SemanticAssistCard(
                        title = "CEVAP",
                        surfaceColor = LessonColors.AnswerSurface,
                        borderColor = LessonColors.AnswerBorder,
                        textColor = LessonColors.AnswerText,
                        isExpanded = isExpanded,
                        onToggleExpand = { toggleExpanded(RevealKey.ANSWER) },
                        isRevealed = isRevealed,
                        enabled = enabled,
                        content = answerText,
                        extraContent = if (isRevealed && answer?.answerSections != null) {
                            { AnswerSections(answer.answerSections) }
                        } else null
                    )
                }
            }

            // 3. Açıklama (Explanation) - Soft Şeftali
            if (hasExplanation) {
                item {
                    val isRevealed = RevealKey.EXPLANATION in session.revealed
                    val isExpanded = RevealKey.EXPLANATION in expandedPanels
                    SemanticAssistCard(
                        title = "AÇIKLAMA",
                        surfaceColor = LessonColors.ExplanationSurface,
                        borderColor = LessonColors.ExplanationBorder,
                        textColor = LessonColors.ExplanationText,
                        isExpanded = isExpanded,
                        onToggleExpand = { toggleExpanded(RevealKey.EXPLANATION) },
                        isRevealed = isRevealed,
                        enabled = enabled,
                        content = answer?.explanation.orEmpty()
                    )
                }
            }

            // 4. Metinsel Kanıt (Evidence) - Soft Lavanta
            if (hasEvidence) {
                item {
                    val isRevealed = RevealKey.EVIDENCE in session.revealed
                    val isExpanded = RevealKey.EVIDENCE in expandedPanels
                    val evidenceText = answer?.evidenceQuotes?.joinToString("\n\n").orEmpty()

                    SemanticAssistCard(
                        title = "METİNSEL KANIT",
                        surfaceColor = LessonColors.EvidenceSurface,
                        borderColor = LessonColors.EvidenceBorder,
                        textColor = LessonColors.EvidenceText,
                        isExpanded = isExpanded,
                        onToggleExpand = { toggleExpanded(RevealKey.EVIDENCE) },
                        isRevealed = isRevealed,
                        enabled = enabled,
                        content = evidenceText
                    )
                }
            }

            // 5. Varsa Öğretmen Notu (Yalnızca yerel aç/kapa, asla öğrenciye reveal dispatch üretmez)
            if (hasNote) {
                item {
                    TeacherNoteCard(
                        note = effectiveStep.content?.note.orEmpty(),
                        isExpanded = isNoteExpanded,
                        onToggleExpand = { isNoteExpanded = !isNoteExpanded },
                        enabled = enabled
                    )
                }
            }
        }
    }
}

/**
 * Yalnızca öğretmen için yerel aç/kapa not kartı.
 * Kesinlikle hiçbir LessonCommand (ToggleReveal) dispatch üretmez ve öğrenci reveal durumu taşımaz.
 */
@Composable
internal fun TeacherNoteCard(
    note: String,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("teacher-assist-note-card"),
        shape = RoundedCornerShape(12.dp),
        color = LessonColors.NoteSurface,
        border = BorderStroke(1.dp, LessonColors.NoteBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(LessonSpacing.small)
        ) {
            // Başlık Çubuğu & Aç/Kapa (280dp dar panelde taşmayı ve dikey harf dizilimini önleyen 2 satırlı düzen)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = LessonTarget.minimum)
                    .clickable(enabled = enabled) { onToggleExpand() }
                    .padding(vertical = LessonSpacing.tiny)
                    .semantics {
                        stateDescription = if (isExpanded) "Öğretmen Notu Açık" else "Öğretmen Notu Kapalı"
                    },
                verticalArrangement = Arrangement.Center
            ) {
                // 1. Satır: Başlık ve Aç/Kapat
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "ÖĞRETMEN NOTU",
                        style = MaterialTheme.typography.labelLarge,
                        color = LessonColors.NoteText,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isExpanded) "▲ Kapat" else "▼ Aç",
                        style = MaterialTheme.typography.labelMedium,
                        color = LessonColors.NoteText,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(LessonSpacing.tiny))

                // 2. Satır: Gizlilik Rozeti (Yatayda bölünmez, tek parça ve net kalır)
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = LessonColors.NoteText.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = "YALNIZCA ÖĞRETMEN",
                        style = MaterialTheme.typography.labelSmall,
                        color = LessonColors.NoteText,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = LessonSpacing.tiny)
                ) {
                    Text(
                        text = note,
                        style = MaterialTheme.typography.bodyMedium,
                        color = LessonColors.NoteText
                    )
                }
            }
        }
    }
}

/**
 * Semantik Öğretmen Destek Kartı.
 * Reveal durumu gösterilir; öğrenciye göster/gizle eylemleri sabit araç çubuğundadır.
 */
@Composable
private fun SemanticAssistCard(
    title: String,
    surfaceColor: Color,
    borderColor: Color,
    textColor: Color,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    isRevealed: Boolean,
    enabled: Boolean,
    content: String?,
    extraContent: (@Composable () -> Unit)? = null
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = surfaceColor,
        border = BorderStroke(1.dp, borderColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(LessonSpacing.small)
        ) {
            // Başlık Çubuğu & Aç/Kapa
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = LessonTarget.minimum)
                    .clickable(enabled = enabled) { onToggleExpand() }
                    .semantics {
                        stateDescription = if (isExpanded) "$title Paneli Açık" else "$title Paneli Kapalı"
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.labelLarge,
                        color = textColor,
                        fontWeight = FontWeight.Bold
                    )
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isRevealed) textColor.copy(alpha = 0.15f) else Color.Transparent
                    ) {
                        Text(
                            text = if (isRevealed) "Öğrenciye Açık" else "Gizli",
                            style = MaterialTheme.typography.labelMedium,
                            color = textColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = if (isExpanded) "▲ Kapat" else "▼ Aç",
                    style = MaterialTheme.typography.labelMedium,
                    color = textColor,
                    fontWeight = FontWeight.SemiBold
                )
            }

            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = LessonSpacing.tiny),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    if (content != null) {
                        Text(
                            text = content,
                            style = MaterialTheme.typography.bodyMedium,
                            color = textColor
                        )
                    }
                    extraContent?.invoke()
                }
            }
        }
    }
}

/**
 * Dikey / compact modda öğretmen araçlarını açan erişilebilir ModalBottomSheet.
 * Açık/kapalı reveal durumu daima LessonSession.revealed'dadır; yalnız sheet local UI state'tir.
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun LessonTeacherAssistSheet(
    step: LessonStep,
    session: LessonSession,
    dismiss: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    ModalBottomSheet(
        onDismissRequest = dismiss,
        containerColor = LessonColors.Surface,
        modifier = modifier.testTag("teacher-assist-sheet")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
                .padding(horizontal = LessonSpacing.medium, vertical = LessonSpacing.small)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = LessonSpacing.small),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ÖĞRETMEN DESTEK ARAÇLARI",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = LessonColors.TextPrimary
                )
                TextButton(
                    onClick = dismiss,
                    modifier = Modifier
                        .heightIn(min = LessonTarget.minimum)
                        .testTag("teacher-assist-close")
                ) {
                    Text("Kapat")
                }
            }
            LessonV2TeacherAssistPane(
                step = step,
                session = session,
                modifier = Modifier.fillMaxSize(),
                enabled = enabled
            )
        }
    }
}

/**
 * Medium / dar landscape tablette öğretmen araçlarını açan erişilebilir sağ Drawer paneli.
 * Açık/kapalı reveal durumu daima LessonSession.revealed'dadır; yalnız drawer local UI state'tir.
 */
@Composable
fun LessonTeacherAssistDrawer(
    step: LessonStep,
    session: LessonSession,
    dismiss: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .testTag("teacher-assist-drawer")
    ) {
        // Scrim (Arka plan karartması)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable(onClick = dismiss)
        )

        // Sağdan açılan çekmece paneli
        Surface(
            modifier = Modifier
                .width(360.dp)
                .fillMaxHeight()
                .align(Alignment.CenterEnd),
            color = LessonColors.SurfaceSoft,
            border = BorderStroke(1.dp, LessonColors.Border)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(LessonSpacing.medium)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = LessonSpacing.small),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ÖĞRETMEN ARAÇLARI",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = LessonColors.TextPrimary
                    )
                    TextButton(
                        onClick = dismiss,
                        modifier = Modifier
                            .heightIn(min = LessonTarget.minimum)
                            .testTag("teacher-assist-close")
                    ) {
                        Text("Kapat")
                    }
                }
                LessonV2TeacherAssistPane(
                    step = step,
                    session = session,
                    modifier = Modifier.fillMaxSize(),
                    enabled = enabled
                )
            }
        }
    }
}
