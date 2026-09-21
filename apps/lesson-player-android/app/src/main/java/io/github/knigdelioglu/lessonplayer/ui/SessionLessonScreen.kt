package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.heightIn
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Phase 3 reference teacher player: working command/persistence flow.
 * The seven purpose-designed layouts and final adaptive lesson UI belong to Phase 4.
 */
@Composable
internal fun SessionLessonScreen(
    lesson: LessonData,
    state: LessonSession,
    dispatch: (LessonCommand) -> Unit
) {
    val sourceStep = lesson.steps.first { it.id == state.stepId }
    val step = LessonEngine.effectiveStep(sourceStep, state.overrides[sourceStep.id])
    val answer = step.answer
    val answerVisible = RevealKey.ANSWER in state.revealed
    val ordinal = state.order.indexOf(state.stepId)
    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
        ) {
        item {
            Text(lesson.title, style = MaterialTheme.typography.headlineMedium)
            Text("Basılı s. ${step.source.printedPageRange} · ${ordinal + 1}/${state.order.size}",
                color = MaterialTheme.colorScheme.secondary,
                style = MaterialTheme.typography.bodyMedium)
        }
        item {
            FilledTonalButton(
                onClick = {
                    dispatch(LessonCommand.SetPresentationMode(!state.presentationMode))
                },
                modifier = Modifier.fillMaxWidth()
                    .heightIn(min = LessonTarget.minimum)
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
                    modifier = Modifier.fillMaxWidth().padding(LessonSpacing.large),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                ) {
                    Text(
                        if (answer?.entryType == "source_limited")
                            "KAYNAK SINIRI · ${step.source.taskType}"
                        else step.source.taskType.uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    Text(
                        if (answerVisible && step.layout != LayoutKind.VOCABULARY)
                            answer?.answer.orEmpty() else step.displayPrompt,
                        style = MaterialTheme.typography.headlineMedium
                    )
                    if (answer != null && step.layout != LayoutKind.VOCABULARY) {
                        FilledTonalButton(
                            onClick = { dispatch(LessonCommand.ToggleReveal(RevealKey.ANSWER)) },
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
                                        dispatch(LessonCommand.ToggleTerm(state.stepId, term))
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
                                    dispatch(LessonCommand.ToggleReveal(RevealKey.ANSWER))
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
                            onClick = { dispatch(LessonCommand.ToggleReveal(key)) },
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
                            dispatch(LessonCommand.ToggleReveal(RevealKey.NOTE))
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
        } // LazyColumn: lesson content scrolls independently from navigation.
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
                    onClick = { dispatch(LessonCommand.Previous) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = ordinal > 0
                ) { Text("Önceki") }
                FilledTonalButton(
                    onClick = { dispatch(LessonCommand.RevealNext) },
                    modifier = Modifier.weight(1f)
                ) { Text("Aç / ilerle") }
                OutlinedButton(
                    onClick = { dispatch(LessonCommand.Next) },
                    modifier = Modifier.weight(1f),
                    enabled = ordinal < state.order.lastIndex
                ) { Text("Sonraki") }
            }
        }
    } // Column
}
