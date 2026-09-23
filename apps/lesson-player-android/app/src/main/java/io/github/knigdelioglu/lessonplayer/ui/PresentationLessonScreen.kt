package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.PresentationTextSize
import io.github.knigdelioglu.lessonplayer.player.toStudentProjection
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.ui.theme.lessonVisualDensity

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
    exit: () -> Unit,
    textSize: PresentationTextSize,
    onTextSizeChange: (PresentationTextSize) -> Unit,
    actionState: LessonActionUiState = LessonActionUiState(),
    retryLastAction: () -> Unit = {}
) {
    val sourceStep = lesson.steps.first { it.id == state.stepId }
    val step = LessonEngine.effectiveStep(sourceStep, state.overrides[sourceStep.id])
    val projection = toStudentProjection(lesson, state)
    val answerVisible = RevealKey.ANSWER in state.revealed
    val ordinal = state.order.indexOf(state.stepId)
    val density = lessonVisualDensity(step.density)
    val answerDetails = projection.answerSections?.takeIf {
        readableAnswerValue(it) != projection.answerText
    }
    val advanceEnabled = step.revealOrder.any { it !in state.revealed } ||
        ordinal < state.order.lastIndex
    val send: (LessonCommand) -> Unit = { command ->
        if (!actionState.busy) dispatch(command)
    }
    val baseDensity = LocalDensity.current
    var textSizeMenuExpanded by rememberSaveable { mutableStateOf(false) }

    CompositionLocalProvider(
        LocalDensity provides Density(
            density = baseDensity.density,
            fontScale = baseDensity.fontScale * textSize.scale
        )
    ) {
      Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(
                    horizontal = LessonSpacing.medium,
                    vertical = LessonSpacing.tiny
                ),
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
                Row(
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                ) {
                    Box {
                        TextButton(
                            onClick = { textSizeMenuExpanded = true },
                            modifier = Modifier.heightIn(min = LessonTarget.minimum)
                        ) { Text("Yazı: ${textSize.label}") }
                        DropdownMenu(
                            expanded = textSizeMenuExpanded,
                            onDismissRequest = { textSizeMenuExpanded = false }
                        ) {
                            PresentationTextSize.entries.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option.label) },
                                    onClick = {
                                        onTextSizeChange(option)
                                        textSizeMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    TextButton(
                        onClick = exit,
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) { Text("Sunumdan çık") }
                }
            }
        }
        LessonActionStatus(actionState, retryLastAction)
        Box(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentAlignment = androidx.compose.ui.Alignment.TopCenter
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().widthIn(max = 960.dp),
                contentPadding = PaddingValues(
                    horizontal = density.screenPadding,
                    vertical = density.blockGap
                ),
                verticalArrangement = Arrangement.spacedBy(density.blockGap)
            ) {
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
                        modifier = Modifier.padding(density.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                    ) {
                        Text(
                            if (step.answer?.entryType == "source_limited")
                                "KAYNAK SINIRI"
                            else step.source.taskType.uppercase(),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        AnimatedContent(
                            targetState = projection.answerText ?: projection.prompt
                                ?: step.displayPrompt,
                            label = "presentation-prompt-answer"
                        ) { text ->
                            Text(text, style = MaterialTheme.typography.headlineLarge)
                        }
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
                                modifier = Modifier.padding(density.cardPadding),
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
            if (answerVisible && step.layout != LayoutKind.VOCABULARY && answerDetails != null) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f),
                        shape = MaterialTheme.shapes.extraLarge
                    ) {
                        Column(
                            modifier = Modifier.padding(density.cardPadding),
                            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                        ) {
                            Text("CEVAP AYRINTILARI", style = MaterialTheme.typography.labelLarge)
                            AnswerSections(answerDetails)
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
                FilledTonalButton(
                    onClick = { send(LessonCommand.Next) },
                    modifier = Modifier.weight(1f)
                        .heightIn(min = LessonTarget.minimum),
                    enabled = !actionState.busy && ordinal < state.order.lastIndex
                ) { Text("Sonraki") }
            }
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
