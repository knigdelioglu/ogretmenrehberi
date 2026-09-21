package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.toStudentProjection
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * The Android in-tablet class presentation surface.
 *
 * It deliberately renders from the student allowlist rather than exposing the
 * teacher session object directly. Teacher notes and guide chrome therefore
 * cannot appear accidentally when presentation mode is active.
 */
@Composable
internal fun PresentationLessonScreen(
    lesson: LessonData,
    state: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    exit: () -> Unit
) {
    val sourceStep = lesson.steps.first { it.id == state.stepId }
    val step = LessonEngine.effectiveStep(sourceStep, state.overrides[sourceStep.id])
    val projection = toStudentProjection(lesson, state)
    val answerVisible = RevealKey.ANSWER in state.revealed
    val ordinal = state.order.indexOf(state.stepId)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(
                horizontal = LessonSpacing.large,
                vertical = LessonSpacing.medium
            ),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
                        Text(
                            "SINIF SUNUMU",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            "${ordinal + 1} / ${state.order.size}",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    TextButton(
                        onClick = exit,
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) {
                        Text("Sunumdan çık")
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
                    Text(lesson.title, style = MaterialTheme.typography.headlineLarge)
                    Text(
                        "Basılı s. ${projection.printedPageRange}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 3.dp,
                    shape = MaterialTheme.shapes.extraLarge
                ) {
                    Column(
                        modifier = Modifier.padding(LessonSpacing.large),
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                    ) {
                        Text(
                            if (sourceStep.answer?.entryType == "source_limited")
                                "KAYNAK SINIRI"
                            else sourceStep.source.taskType.uppercase(),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Text(
                            projection.answerText ?: projection.prompt
                                ?: step.displayPrompt,
                            style = MaterialTheme.typography.headlineLarge
                        )
                    }
                }
            }
            if (!answerVisible || step.layout in setOf(
                    LayoutKind.STRUCTURE,
                    LayoutKind.COMPARISON,
                    LayoutKind.ASSESSMENT
                )
            ) {
                item { LessonContentLayout(step) }
            }
            if (step.layout == LayoutKind.VOCABULARY) {
                val definitions = (step.answer?.answerSections as? JsonValue.Object)
                    ?.values.orEmpty()
                if (definitions.isNotEmpty()) {
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.70f),
                            shape = MaterialTheme.shapes.extraLarge
                        ) {
                            Column(
                                modifier = Modifier.padding(LessonSpacing.large),
                                verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                            ) {
                                projection.visibleVocabulary.forEach { (term, value) ->
                                    Text(
                                        term,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        readableAnswerValue(value),
                                        style = MaterialTheme.typography.bodyLarge
                                    )
                                }
                                if (projection.visibleVocabulary.isEmpty()) {
                                    Text(
                                        "Önce kelimenin anlamını tahmin edin.",
                                        style = MaterialTheme.typography.bodyLarge
                                    )
                                }
                            }
                        }
                    }
                }
            }
            if (answerVisible && step.layout != LayoutKind.VOCABULARY) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f),
                        shape = MaterialTheme.shapes.extraLarge
                    ) {
                        Column(
                            modifier = Modifier.padding(LessonSpacing.large),
                            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                        ) {
                            Text("CEVAP", style = MaterialTheme.typography.labelLarge)
                            projection.answerText?.let {
                                Text(it, style = MaterialTheme.typography.headlineMedium)
                            }
                            AnswerSections(projection.answerSections)
                        }
                    }
                }
            }
            projection.guidance?.let { value ->
                item { PresentationRevealCard("YÖNLENDİRME", value) }
            }
            if (projection.evidenceQuotes.isNotEmpty()) {
                item {
                    PresentationRevealCard(
                        "METİNDEN KANIT",
                        projection.evidenceQuotes.joinToString("\n")
                    )
                }
            }
            projection.explanation?.let { value ->
                item { PresentationRevealCard("AÇIKLAMA", value) }
            }
        }
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        horizontal = LessonSpacing.small,
                        vertical = LessonSpacing.tiny
                    ),
                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
            ) {
                FilledTonalButton(
                    onClick = { dispatch(LessonCommand.Previous) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = ordinal > 0
                ) { Text("Önceki") }
                FilledTonalButton(
                    onClick = { dispatch(LessonCommand.RevealNext) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum)
                ) { Text("Aç / ilerle") }
                FilledTonalButton(
                    onClick = { dispatch(LessonCommand.Next) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = ordinal < state.order.lastIndex
                ) { Text("Sonraki") }
            }
        }
    }
}

@Composable
private fun PresentationRevealCard(label: String, text: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.70f),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.padding(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text(label, style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary)
            Text(text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
