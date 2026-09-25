package io.github.knigdelioglu.lessonplayer.ui.shell

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Sabit Alt Eylem Çubuğu (Action Bar).
 * Öğrenci sunumu, mevcut reveal durumuna göre Göster/Gizle, Önceki ve Sonraki
 * kontrollerini sunar. Dar alanda eylemler erişilebilir simgelere dönüşür.
 */
@Composable
fun LessonV2ActionBar(
    step: LessonStep?,
    session: LessonSession?,
    dispatch: (LessonCommand) -> Unit,
    actionBusy: Boolean,
    modifier: Modifier = Modifier
) {
    if (step == null || session == null) return
    val effectiveStep = LessonEngine.effectiveStep(step, session.overrides[step.id])
    val ordinal = session.order.indexOf(session.stepId)
    val answer = effectiveStep.answer
    val send: (LessonCommand) -> Unit = { command ->
        if (!actionBusy) dispatch(command)
    }

    // Gerçek içerik ve anahtar kontrolleri (enabled no-op olmaması için)
    val hasGuidance = RevealKey.GUIDANCE in effectiveStep.revealOrder && !answer?.guidance.isNullOrBlank()
    val isGuidanceRevealed = RevealKey.GUIDANCE in session.revealed

    val hasAnswer = RevealKey.ANSWER in effectiveStep.revealOrder && answer != null &&
        (!answer.answer.isNullOrBlank() || answer.answerSections != null)
    val isAnswerRevealed = RevealKey.ANSWER in session.revealed

    val hasExplanation = RevealKey.EXPLANATION in effectiveStep.revealOrder && !answer?.explanation.isNullOrBlank()
    val isExplanationRevealed = RevealKey.EXPLANATION in session.revealed

    val hasEvidence = RevealKey.EVIDENCE in effectiveStep.revealOrder && !answer?.evidenceQuotes.isNullOrEmpty()
    val isEvidenceRevealed = RevealKey.EVIDENCE in session.revealed

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp),
        color = LessonColors.Surface,
        border = BorderStroke(1.dp, LessonColors.Border)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = LessonSpacing.medium, vertical = LessonSpacing.tiny),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            BoxWithConstraints(modifier = Modifier.weight(1f)) {
                val showLabels = maxWidth >= 840.dp * LocalDensity.current.fontScale
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    if (showLabels) {
                        FilledTonalButton(
                            onClick = { send(LessonCommand.SetPresentationMode(true)) },
                            enabled = !actionBusy,
                            modifier = Modifier.heightIn(min = LessonTarget.minimum)
                                .testTag("lesson-presentation-toggle")
                        ) { Text("Öğrenciye Göster") }
                    } else {
                        IconButton(
                            onClick = { send(LessonCommand.SetPresentationMode(true)) },
                            enabled = !actionBusy,
                            modifier = Modifier.sizeIn(
                                minWidth = LessonTarget.minimum,
                                minHeight = LessonTarget.minimum
                            ).testTag("lesson-presentation-toggle")
                                .semantics { contentDescription = "Öğrenciye göster" }
                        ) {
                            PresentationGlyph(color = LessonColors.Primary)
                        }
                    }

                    if (hasGuidance) RevealActionButton(
                        label = if (isGuidanceRevealed) "Yönlendirmeyi Gizle" else "Yönlendirmeyi Göster",
                        shortLabel = "Yönlendirme",
                        isRevealed = isGuidanceRevealed,
                        showLabel = showLabels,
                        color = LessonColors.GuidanceText,
                        containerColor = LessonColors.GuidanceSurface,
                        testTag = "lesson-guidance-toggle",
                        onClick = { send(LessonCommand.ToggleReveal(RevealKey.GUIDANCE)) }
                    )
                    if (hasAnswer) RevealActionButton(
                        label = if (isAnswerRevealed) "Cevabı Gizle" else "Cevabı Göster",
                        shortLabel = "Cevap",
                        isRevealed = isAnswerRevealed,
                        showLabel = showLabels,
                        color = LessonColors.AnswerText,
                        containerColor = LessonColors.AnswerSurface,
                        testTag = "lesson-answer-toggle",
                        onClick = { send(LessonCommand.ToggleReveal(RevealKey.ANSWER)) }
                    )
                    if (hasExplanation) RevealActionButton(
                        label = if (isExplanationRevealed) "Açıklamayı Gizle" else "Açıklamayı Göster",
                        shortLabel = "Açıklama",
                        isRevealed = isExplanationRevealed,
                        showLabel = showLabels,
                        color = LessonColors.ExplanationText,
                        containerColor = LessonColors.ExplanationSurface,
                        testTag = "lesson-explanation-toggle",
                        onClick = { send(LessonCommand.ToggleReveal(RevealKey.EXPLANATION)) }
                    )
                    if (hasEvidence) RevealActionButton(
                        label = if (isEvidenceRevealed) "Kanıtı Gizle" else "Kanıtı Göster",
                        shortLabel = "Metinsel kanıt",
                        isRevealed = isEvidenceRevealed,
                        showLabel = showLabels,
                        color = LessonColors.EvidenceText,
                        containerColor = LessonColors.EvidenceSurface,
                        testTag = "lesson-evidence-toggle",
                        onClick = { send(LessonCommand.ToggleReveal(RevealKey.EVIDENCE)) }
                    )
                }
            }

            // Adım gezinmesi merkez araç çubuğunun sağında sabit kalır.
            Row(horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                OutlinedButton(
                    onClick = { send(LessonCommand.Previous) },
                    enabled = !actionBusy && ordinal > 0,
                    modifier = Modifier.heightIn(min = LessonTarget.minimum)
                ) {
                    Text("Önceki")
                }

                OutlinedButton(
                    onClick = { send(LessonCommand.Next) },
                    enabled = !actionBusy && ordinal < session.order.lastIndex,
                    modifier = Modifier.heightIn(min = LessonTarget.minimum)
                ) {
                    Text("Sonraki")
                }
            }
        }
    }
}

@Composable
private fun RevealActionButton(
    label: String,
    shortLabel: String,
    isRevealed: Boolean,
    showLabel: Boolean,
    color: Color,
    containerColor: Color,
    testTag: String,
    onClick: () -> Unit
) {
    if (showLabel) {
        OutlinedButton(
            onClick = onClick,
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = if (isRevealed) containerColor else Color.Transparent,
                contentColor = color
            ),
            modifier = Modifier.heightIn(min = LessonTarget.minimum)
                .testTag(testTag)
                .semantics { stateDescription = if (isRevealed) "$shortLabel açık" else "$shortLabel kapalı" }
        ) {
            Text(label)
        }
    } else {
        IconButton(
            onClick = onClick,
            modifier = Modifier.sizeIn(
                minWidth = LessonTarget.minimum,
                minHeight = LessonTarget.minimum
            ).testTag(testTag)
                .semantics {
                    contentDescription = label
                    stateDescription = if (isRevealed) "$shortLabel açık" else "$shortLabel kapalı"
                }
        ) {
            VisibilityGlyph(isRevealed = isRevealed, color = color)
        }
    }
}

@Composable
private fun PresentationGlyph(modifier: Modifier = Modifier, color: Color) {
    Canvas(modifier = modifier.size(24.dp)) {
        val stroke = 2.dp.toPx()
        drawRoundRect(
            color = color,
            topLeft = Offset(size.width * 0.12f, size.height * 0.12f),
            size = Size(size.width * 0.76f, size.height * 0.58f),
            cornerRadius = CornerRadius(stroke * 1.5f),
            style = Stroke(stroke)
        )
        drawLine(
            color = color,
            start = Offset(size.width * 0.5f, size.height * 0.72f),
            end = Offset(size.width * 0.5f, size.height * 0.88f),
            strokeWidth = stroke
        )
        drawLine(
            color = color,
            start = Offset(size.width * 0.32f, size.height * 0.9f),
            end = Offset(size.width * 0.68f, size.height * 0.9f),
            strokeWidth = stroke
        )
    }
}

@Composable
private fun VisibilityGlyph(isRevealed: Boolean, color: Color) {
    Canvas(modifier = Modifier.size(24.dp)) {
        val eye = Path().apply {
            moveTo(size.width * 0.08f, size.height * 0.5f)
            cubicTo(
                size.width * 0.28f, size.height * 0.19f,
                size.width * 0.72f, size.height * 0.19f,
                size.width * 0.92f, size.height * 0.5f
            )
            cubicTo(
                size.width * 0.72f, size.height * 0.81f,
                size.width * 0.28f, size.height * 0.81f,
                size.width * 0.08f, size.height * 0.5f
            )
        }
        drawPath(path = eye, color = color, style = Stroke(width = 2.dp.toPx()))
        drawCircle(
            color = color,
            radius = size.minDimension * 0.12f,
            center = Offset(size.width * 0.5f, size.height * 0.5f)
        )
        if (isRevealed) {
            drawLine(
                color = color,
                start = Offset(size.width * 0.16f, size.height * 0.84f),
                end = Offset(size.width * 0.84f, size.height * 0.16f),
                strokeWidth = 2.dp.toPx()
            )
        }
    }
}
