package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.heightIn
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.ui.theme.lessonVisualDensity

/**
 * Adaptive teacher lesson player for the seven canonical layout kinds.
 * Presentation mode is rendered by a separate student-safe surface.
 */
@Composable
internal fun SessionLessonScreen(
    lesson: LessonData,
    state: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    actionState: LessonActionUiState = LessonActionUiState(),
    retryLastAction: () -> Unit = {},
    openLessonOutline: (() -> Unit)? = null
) {
    val sourceStep = lesson.steps.first { it.id == state.stepId }
    val step = LessonEngine.effectiveStep(sourceStep, state.overrides[sourceStep.id])
    val answer = step.answer
    val answerVisible = RevealKey.ANSWER in state.revealed
    val ordinal = state.order.indexOf(state.stepId)
    val density = lessonVisualDensity(step.density)
    val advanceEnabled = step.revealOrder.any { it !in state.revealed } ||
        ordinal < state.order.lastIndex
    val send: (LessonCommand) -> Unit = { command ->
        if (!actionState.busy) dispatch(command)
    }
    Column(modifier = Modifier.fillMaxSize()) {
        LessonActionStatus(actionState, retryLastAction)
        Box(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentAlignment = androidx.compose.ui.Alignment.TopCenter
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().widthIn(max = 960.dp)
                    .testTag("lesson-screen-list"),
                contentPadding = PaddingValues(density.screenPadding),
                verticalArrangement = Arrangement.spacedBy(density.blockGap)
            ) {
        item {
            Text(lesson.title, style = MaterialTheme.typography.headlineMedium)
            val stepLabel = "Basılı s. ${step.source.printedPageRange} · ${ordinal + 1}/${state.order.size}"
            if (openLessonOutline == null) {
                Text(stepLabel, color = MaterialTheme.colorScheme.secondary,
                    style = MaterialTheme.typography.bodyMedium)
            } else {
                TextButton(
                    onClick = openLessonOutline,
                    modifier = Modifier.heightIn(min = LessonTarget.minimum)
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
                modifier = Modifier.fillMaxWidth()
                    .heightIn(min = LessonTarget.minimum)
                    .testTag("lesson-presentation-toggle"),
                enabled = !actionState.busy
            ) {
                Text(if (state.presentationMode) "Öğretmen görünümüne dön"
                    else "Sınıf sunumuna geç")
            }
        }
        item {
            Card(
                shape = RoundedCornerShape(LessonShape.card),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(density.cardPadding),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                ) {
                    Text(
                        if (answer?.entryType == "source_limited")
                            "KAYNAK SINIRI · ${step.source.taskType}"
                        else step.source.taskType.uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    AnimatedContent(
                        targetState = if (answerVisible && step.layout != LayoutKind.VOCABULARY) {
                            answer?.answer.orEmpty()
                        } else {
                            step.displayPrompt
                        },
                        label = "teacher-prompt-answer"
                    ) { text ->
                        Text(text, style = MaterialTheme.typography.headlineMedium)
                    }
                    if (answer != null && step.layout != LayoutKind.VOCABULARY) {
                        FilledTonalButton(
                            onClick = { send(LessonCommand.ToggleReveal(RevealKey.ANSWER)) },
                            modifier = Modifier.fillMaxWidth()
                                .heightIn(min = LessonTarget.minimum)
                                .padding(top = LessonSpacing.small)
                                .semantics {
                                    stateDescription = if (answerVisible) {
                                        "Cevap açık"
                                    } else {
                                        "Cevap kapalı"
                                    }
                                }
                        ) {
                            Text(if (answerVisible) "Soruyu göster" else "Cevabı göster")
                        }
                    }
                    if (!answerVisible || step.layout in setOf(
                            LayoutKind.STRUCTURE, LayoutKind.COMPARISON,
                            LayoutKind.ASSESSMENT
                        )
                    ) {
                        if (!answerVisible) {
                            step.content?.lead?.takeIf { it != step.displayPrompt }?.let {
                                Text(it, style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                        LessonContentLayout(step)
                    }
                    if (answerVisible && step.layout != LayoutKind.VOCABULARY) {
                        AnswerSections(answer?.answerSections)
                    }
                    if (step.layout == LayoutKind.VOCABULARY) {
                        val terms = (answer?.answerSections as? JsonValue.Object)
                            ?.values.orEmpty()
                        terms.forEach { (term, definition) ->
                            Text(term, style = MaterialTheme.typography.titleMedium)
                            val visible = answerVisible ||
                                term in state.vocabularyTerms[state.stepId].orEmpty()
                            Text(
                                if (visible) when (definition) {
                                    is JsonValue.Text -> definition.value
                                    else -> readableAnswerValue(definition)
                                } else "Önce bağlamdan anlamını tahmin ettirin.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            if (!answerVisible) {
                                OutlinedButton(
                                    onClick = {
                                        send(LessonCommand.ToggleTerm(state.stepId, term))
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                    .heightIn(min = LessonTarget.minimum)
                                    .semantics {
                                        stateDescription = if (visible) {
                                            "Anlam açık"
                                        } else {
                                            "Anlam kapalı"
                                        }
                                    }
                                ) { Text(if (visible) "Gizle" else "Anlamı göster") }
                            }
                        }
                        if (answer != null) {
                            FilledTonalButton(
                                onClick = {
                                    send(LessonCommand.ToggleReveal(RevealKey.ANSWER))
                                },
                                modifier = Modifier.fillMaxWidth()
                                .heightIn(min = LessonTarget.minimum)
                                .semantics {
                                    stateDescription = if (answerVisible) {
                                        "Tüm anlamlar açık"
                                    } else {
                                        "Tüm anlamlar kapalı"
                                    }
                                }
                            ) {
                                Text(if (answerVisible) "Anlamları gizle"
                                    else "Bütün anlamları göster")
                            }
                        }
                    }
                }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                step.revealOrder.filter { it !in setOf(RevealKey.ANSWER, RevealKey.NOTE) }
                    .forEach { key ->
                        OutlinedButton(
                            onClick = { send(LessonCommand.ToggleReveal(key)) },
                            modifier = Modifier.fillMaxWidth()
                            .heightIn(min = LessonTarget.minimum)
                            .semantics {
                                stateDescription = if (key in state.revealed) {
                                    "Açık"
                                } else {
                                    "Kapalı"
                                }
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
                            text?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
                        }
                    }
                if (!state.presentationMode && RevealKey.NOTE in step.revealOrder) {
                    OutlinedButton(
                        onClick = {
                            send(LessonCommand.ToggleReveal(RevealKey.NOTE))
                        }, modifier = Modifier.fillMaxWidth()
                        .heightIn(min = LessonTarget.minimum)
                        .semantics {
                            stateDescription = if (RevealKey.NOTE in state.revealed) {
                                "Açık"
                            } else {
                                "Kapalı"
                            }
                        }
                    ) { Text("Öğretmen notu") }
                    if (RevealKey.NOTE in state.revealed) {
                        step.content?.note?.let {
                            Text(it, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
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
            } // LazyColumn: lesson content scrolls independently from navigation.
        }
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 6.dp
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(
                    horizontal = LessonSpacing.small,
                    vertical = LessonSpacing.tiny
                ),
                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
            ) {
                OutlinedButton(
                    onClick = { send(LessonCommand.Previous) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = !actionState.busy && ordinal > 0
                ) { Text("Önceki") }
                FilledTonalButton(
                    onClick = { send(LessonCommand.RevealNext) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = !actionState.busy && advanceEnabled
                ) { Text(nextLessonActionLabel(step, state)) }
                OutlinedButton(
                    onClick = { send(LessonCommand.Next) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = !actionState.busy && ordinal < state.order.lastIndex
                ) { Text("Sonraki") }
            }
        }
    } // Column
}
