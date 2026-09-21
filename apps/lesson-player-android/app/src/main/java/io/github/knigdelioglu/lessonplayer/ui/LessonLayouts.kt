package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonVisualDensity
import io.github.knigdelioglu.lessonplayer.ui.theme.lessonVisualDensity

/** Canonical flow content, distinct from answer-bank answerSections. */
@Composable
internal fun LessonContentLayout(step: LessonStep) {
    val content = step.content ?: return
    if (step.layout == LayoutKind.VOCABULARY) return
    val density = lessonVisualDensity(step.density)
    Column(verticalArrangement = Arrangement.spacedBy(density.blockGap)) {
        when (step.layout) {
            LayoutKind.QUESTION, LayoutKind.REFERENCE -> {
                content.items.forEachIndexed { index, item ->
                    AccentRow((index + 1).toString().padStart(2, '0'), item, density.rowPadding)
                }
                SectionCards(content.sections, density)
            }
            LayoutKind.PROCESS -> {
                content.items.forEachIndexed { index, item ->
                    AccentRow("ADIM " + (index + 1), item, density.rowPadding)
                }
                SectionCards(content.sections, density)
            }
            LayoutKind.COMPARISON -> {
                content.items.forEach { AccentRow("ÖLÇÜT", it, density.rowPadding) }
                SectionCards(content.sections, density, paired = true)
            }
            LayoutKind.STRUCTURE -> {
                content.items.forEachIndexed { index, item ->
                    AccentRow("YAPI " + (index + 1), item, density.rowPadding)
                }
                SectionCards(content.sections, density)
            }
            LayoutKind.ASSESSMENT -> {
                content.items.forEach { AccentRow("✓", it, density.rowPadding) }
                SectionCards(content.sections, density)
            }
            LayoutKind.VOCABULARY -> Unit
        }
    }
}

@Composable
private fun AccentRow(marker: String, value: String, rowPadding: Dp) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f)
    ) {
        Row(modifier = Modifier.padding(rowPadding),
            horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            Text(marker, style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary)
            Text(value, style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun SectionCards(
    sections: List<SupplementalSection>,
    density: LessonVisualDensity,
    paired: Boolean = false
) {
    if (sections.isEmpty()) return
    BoxWithConstraints {
        if (paired && sections.size == 2 && maxWidth >= 600.dp) {
            Row(horizontalArrangement = Arrangement.spacedBy(density.blockGap)) {
                sections.forEach { SectionCard(it, density, Modifier.weight(1f)) }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(density.blockGap)) {
                sections.forEach { SectionCard(it, density) }
            }
        }
    }
}

@Composable
private fun SectionCard(
    section: SupplementalSection,
    density: LessonVisualDensity,
    modifier: Modifier = Modifier
) {
    Surface(modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.70f),
        shape = RoundedCornerShape(16.dp)) {
        Column(modifier = Modifier.padding(density.cardPadding),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
            Text(section.title, style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary)
            Text(section.body, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

/** Preserve recursive string/list/object/null data; never stringify a Kotlin data class. */
@Composable
internal fun AnswerSections(value: JsonValue?) {
    when (value) {
        null, JsonValue.Null -> Unit
        is JsonValue.Text -> Text(value.value, style = MaterialTheme.typography.bodyLarge)
        is JsonValue.Number -> Text(value.value, style = MaterialTheme.typography.bodyLarge)
        is JsonValue.Bool -> Text(if (value.value) "Evet" else "Hayır",
            style = MaterialTheme.typography.bodyLarge)
        is JsonValue.Array -> Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            value.items.forEachIndexed { index, item ->
                Row(horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                    Text((index + 1).toString() + ".",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f)) { AnswerSections(item) }
                }
            }
        }
        is JsonValue.Object -> Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            value.values.forEach { (key, item) ->
                Surface(modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.70f)) {
                    Column(modifier = Modifier.padding(LessonSpacing.medium),
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
                        Text(key.replace("_", " "), style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary)
                        AnswerSections(item)
                    }
                }
            }
        }
    }
}

internal fun readableAnswerValue(value: JsonValue): String = when (value) {
    JsonValue.Null -> ""
    is JsonValue.Text -> value.value
    is JsonValue.Number -> value.value
    is JsonValue.Bool -> if (value.value) "Evet" else "Hayır"
    is JsonValue.Array -> value.items.joinToString("\n", transform = ::readableAnswerValue)
    is JsonValue.Object -> value.values.entries.joinToString("\n") {
        it.key.replace("_", " ") + ": " + readableAnswerValue(it.value)
    }
}
