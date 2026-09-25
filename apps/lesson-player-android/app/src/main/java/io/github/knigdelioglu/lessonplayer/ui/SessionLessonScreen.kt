package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.ui.theme.lessonVisualDensity

internal fun teacherAnswerVisibleInWorkspace(step: LessonStep): Boolean {
    val answer = step.answer ?: return false
    return !answer.answer.isNullOrBlank() || answer.answerSections != null
}

@Composable
internal fun TeacherWorkspaceAnswer(
    step: LessonStep,
    modifier: Modifier = Modifier
) {
    val answer = step.answer ?: return
    val hasAnswerText = !answer.answer.isNullOrBlank()
    val hasAnswerSections = answer.answerSections != null
    if (!hasAnswerText && !hasAnswerSections) return

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("lesson-workspace-answer"),
        shape = RoundedCornerShape(14.dp),
        color = LessonColors.AnswerSurface,
        border = BorderStroke(1.dp, LessonColors.AnswerBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(LessonSpacing.medium),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text(
                text = "CEVAP",
                style = MaterialTheme.typography.labelLarge,
                color = LessonColors.AnswerText,
                fontWeight = FontWeight.Bold
            )
            answer.answer?.takeIf { it.isNotBlank() }?.let { answerText ->
                Text(
                    text = answerText,
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontSize = 16.sp,
                        lineHeight = 24.sp
                    ),
                    color = LessonColors.AnswerText
                )
            }
            answer.answerSections?.let { sections ->
                if (step.layout == LayoutKind.COMPARISON) {
                    ComparisonAnswerTable(sections, heading = null)
                } else {
                    AnswerSections(sections)
                }
            }
        }
    }
}

/**
 * Adaptive teacher lesson player for the seven canonical layout kinds.
 * In 3-column tablet shell, teacher assist is placed on the fixed right panel,
 * and navigation actions are placed on the fixed bottom bar.
 */
@Composable
internal fun SessionLessonScreen(
    lesson: LessonData,
    state: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    actionState: LessonActionUiState = LessonActionUiState(),
    retryLastAction: () -> Unit = {},
    openLessonOutline: (() -> Unit)? = null,
    openTeacherAssist: (() -> Unit)? = null,
    isThreeColumn: Boolean = false
) {
    val sourceStep = lesson.steps.first { it.id == state.stepId }
    val step = LessonEngine.effectiveStep(sourceStep, state.overrides[sourceStep.id])
    val answer = step.answer
    val workspaceAnswerVisible = teacherAnswerVisibleInWorkspace(step)
    val ordinal = state.order.indexOf(state.stepId)
    val density = lessonVisualDensity(step.density)
    val advanceCommand = nextTeacherLessonCommand(step, state)
    val advanceEnabled = !actionState.busy && advanceCommand != null
    val send: (LessonCommand) -> Unit = { command ->
        if (!actionState.busy) dispatch(command)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        LessonActionStatus(actionState, retryLastAction)

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.TopCenter
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = if (isThreeColumn) 1200.dp else 960.dp)
                    .testTag("lesson-screen-list"),
                contentPadding = PaddingValues(density.screenPadding),
                verticalArrangement = Arrangement.spacedBy(density.blockGap)
            ) {
                // Sadece dar ekranda veya başlık üstte olmadığında adım sayacı gösterilir
                if (!isThreeColumn) {
                    item {
                        Text(
                            text = lesson.title,
                            style = MaterialTheme.typography.headlineMedium,
                            color = LessonColors.TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        val stepLabel = "Basılı s. ${step.source.printedPageRange} · ${ordinal + 1}/${state.order.size}"
                        if (openLessonOutline == null) {
                            Text(
                                text = stepLabel,
                                color = LessonColors.TextSecondary,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        } else {
                            TextButton(
                                onClick = openLessonOutline,
                                modifier = Modifier
                                    .heightIn(min = LessonTarget.minimum)
                                    .testTag("lesson-step-counter")
                            ) {
                                Text("$stepLabel · Ders akışını aç")
                            }
                        }
                    }

                    item {
                        FilledTonalButton(
                            onClick = {
                                send(LessonCommand.SetPresentationMode(!state.presentationMode))
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = LessonTarget.minimum)
                                .testTag("lesson-presentation-toggle"),
                            enabled = !actionState.busy
                        ) {
                            Text(
                                if (state.presentationMode) "Öğretmen görünümüne dön"
                                else "Sınıf sunumuna geç"
                            )
                        }
                    }
                }

                // Soru ve Ana Çalışma Kartı
                item {
                    Card(
                        shape = RoundedCornerShape(LessonShape.card),
                        colors = CardDefaults.cardColors(
                            containerColor = LessonColors.Surface
                        ),
                        border = BorderStroke(1.dp, LessonColors.Border)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(density.cardPadding),
                            verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (answer?.entryType == "source_limited")
                                        "KAYNAK SINIRI · ${step.source.taskType}"
                                    else step.source.taskType.uppercase(),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = LessonColors.Primary,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "s. ${step.source.printedPageRange}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = LessonColors.TextSecondary
                                )
                            }

                            Text(
                                text = step.displayPrompt,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontSize = 16.sp,
                                    lineHeight = 23.sp
                                ),
                                color = LessonColors.TextPrimary,
                                fontWeight = FontWeight.SemiBold
                            )

                            step.content?.lead?.takeIf { it != step.displayPrompt }?.let {
                                Text(
                                    it,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = LessonColors.TextPrimary
                                )
                            }

                            // Soru ve canonical etkinlik içeriği cevap açıldığında da yerinde kalır.
                            LessonContentLayout(step, answerVisible = false)

                            // Android uygulaması öğretmen içindir: mevcut cevap varsa her zaman açık gösterilir.
                            if (workspaceAnswerVisible && step.layout != LayoutKind.VOCABULARY) {
                                TeacherWorkspaceAnswer(step = step)
                            }

                            if (step.layout == LayoutKind.VOCABULARY) {
                                VocabularyMatchLayout(
                                    step = step,
                                    state = state,
                                    dispatch = send,
                                    answerVisible = workspaceAnswerVisible,
                                    density = density
                                )
                            }
                        }
                    }
                }

                // Dar / kompakt ekranda sağ panel olmadığı için öğretmen destek araçları
                // erişilebilir bir kart ile drawer veya bottom sheet üzerinden açılır.
                if (!isThreeColumn) {
                    if (openTeacherAssist != null) {
                        item {
                            Card(
                                onClick = openTeacherAssist,
                                shape = RoundedCornerShape(LessonShape.card),
                                colors = CardDefaults.cardColors(
                                    containerColor = LessonColors.SurfaceSoft
                                ),
                                border = BorderStroke(1.dp, LessonColors.Border),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = LessonTarget.minimum)
                                    .testTag("teacher-assist-open-card")
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(LessonSpacing.medium),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = "Öğretmen Destek Araçları",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = LessonColors.TextPrimary
                                        )
                                        val revealedSummary = step.revealOrder.filter { it in state.revealed }
                                        val summaryText = if (revealedSummary.isEmpty()) {
                                            "Yönlendirme, Açıklama, Metinsel Kanıt ve Öğretmen Notunu açın"
                                        } else {
                                            "Açık katmanlar: " + revealedSummary.joinToString(", ") { it.wire }
                                        }
                                        Text(
                                            text = summaryText,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = LessonColors.TextSecondary
                                        )
                                    }
                                    FilledTonalButton(
                                        onClick = openTeacherAssist,
                                        modifier = Modifier
                                            .heightIn(min = LessonTarget.minimum)
                                            .padding(start = LessonSpacing.small)
                                    ) {
                                        Text("Araçları Aç")
                                    }
                                }
                            }
                        }
                    } else {
                        // Fallback doğrudan butonlar (openTeacherAssist verilmediğinde geriye dönük uyumluluk)
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                                step.revealOrder.filter { it !in setOf(RevealKey.ANSWER, RevealKey.NOTE) }
                                    .forEach { key ->
                                        val hasContent = when (key) {
                                            RevealKey.GUIDANCE -> !answer?.guidance.isNullOrBlank()
                                            RevealKey.EVIDENCE -> !answer?.evidenceQuotes.isNullOrEmpty()
                                            RevealKey.EXPLANATION -> !answer?.explanation.isNullOrBlank()
                                            else -> false
                                        }
                                        if (hasContent) {
                                            OutlinedButton(
                                                onClick = { send(LessonCommand.ToggleReveal(key)) },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .heightIn(min = LessonTarget.minimum)
                                                    .semantics {
                                                        stateDescription = if (key in state.revealed) "Açık" else "Kapalı"
                                                    }
                                            ) {
                                                Text(
                                                    (if (key in state.revealed) "Gizle: " else "Göster: ") +
                                                        when (key) {
                                                            RevealKey.GUIDANCE -> "Yönlendirme"
                                                            RevealKey.EVIDENCE -> "Metinden kanıt"
                                                            RevealKey.EXPLANATION -> "Açıklama"
                                                            else -> key.wire
                                                        }
                                                )
                                            }
                                            if (key in state.revealed) {
                                                val text = when (key) {
                                                    RevealKey.GUIDANCE -> answer?.guidance
                                                    RevealKey.EVIDENCE -> answer?.evidenceQuotes?.joinToString("\n")
                                                    RevealKey.EXPLANATION -> answer?.explanation
                                                    else -> null
                                                }
                                                text?.let { Text(it, style = MaterialTheme.typography.bodyLarge, color = LessonColors.TextPrimary) }
                                            }
                                        }
                                    }
                                val teacherNote = step.content?.note?.takeIf { !it.isBlank() }
                                if (!state.presentationMode && teacherNote != null) {
                                    Surface(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        color = LessonColors.NoteSurface,
                                        border = BorderStroke(1.dp, LessonColors.NoteBorder)
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(LessonSpacing.medium),
                                            verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                                            ) {
                                                Text(
                                                    text = "ÖĞRETMEN NOTU",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = LessonColors.NoteText,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = LessonColors.NoteText.copy(alpha = 0.15f)
                                                ) {
                                                    Text(
                                                        text = "YALNIZCA ÖĞRETMEN",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = LessonColors.NoteText,
                                                        fontWeight = FontWeight.SemiBold,
                                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                            Text(
                                                text = teacherNote,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = LessonColors.NoteText
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Düzenleme Paneli
                if (!state.presentationMode) {
                    item {
                        LessonEditorPanel(
                            step = step,
                            state = state,
                            ordinal = ordinal,
                            dispatch = send
                        )
                    }
                }
            }
        }

        // Dar / kompakt ekranda alt çubuk burada çizilir (3-kolon modunda ise LessonV2ActionBar ekranın en altında sabit kalır)
        if (!isThreeColumn) {
            Surface(
                color = LessonColors.Surface,
                border = BorderStroke(1.dp, LessonColors.Border)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = LessonSpacing.small, vertical = LessonSpacing.tiny),
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                ) {
                    OutlinedButton(
                        onClick = { send(LessonCommand.Previous) },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = LessonTarget.minimum)
                            .testTag("lesson-previous"),
                        enabled = !actionState.busy && ordinal > 0
                    ) { Text("Önceki") }

                    FilledTonalButton(
                        onClick = { advanceCommand?.let(send) },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = LessonTarget.minimum)
                            .testTag("lesson-next"),
                        enabled = advanceEnabled
                    ) { Text(nextTeacherLessonActionLabel(step, state)) }

                    OutlinedButton(
                        onClick = { send(LessonCommand.Next) },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = LessonTarget.minimum),
                        enabled = !actionState.busy && ordinal < state.order.lastIndex
                    ) { Text("Sonraki") }
                }
            }
        }
    }
}
