package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonVisualDensity
import io.github.knigdelioglu.lessonplayer.ui.theme.lessonVisualDensity

/** Canonical flow content, distinct from answer-bank answerSections. */
@Composable
internal fun LessonContentLayout(step: LessonStep, answerVisible: Boolean = false) {
    if (step.layout == LayoutKind.VOCABULARY) return
    val density = lessonVisualDensity(step.density)

    // COMPARISON can render answer_sections table even when step.content is null (e.g. s31-q7)
    if (step.layout == LayoutKind.COMPARISON) {
        ComparisonContentLayout(
            step = step,
            answerVisible = answerVisible,
            density = density
        )
        return
    }

    val content = step.content ?: return

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
            LayoutKind.STRUCTURE -> {
                StructureSchemaLayout(
                    items = content.items,
                    sections = content.sections,
                    density = density
                )
            }
            LayoutKind.ASSESSMENT -> {
                AssessmentCriteriaLayout(
                    items = content.items,
                    sections = content.sections,
                    density = density
                )
            }
            LayoutKind.COMPARISON, LayoutKind.VOCABULARY -> Unit
        }
    }
}

/**
 * Honest comparison renderer for LayoutKind.COMPARISON.
 * - content.items is an instructional guide / focus directive, NOT an invented criteria column.
 * - Tabular comparison is constructed from real content.sections (when available) and revealed answer.answer_sections.
 * - Answer visibility is strictly guarded by answerVisible (RevealKey.ANSWER); when closed, answer matrix is NEVER rendered.
 * - When answer is revealed, answer table is rendered in a single place without duplicate presentation.
 */
@Composable
internal fun ComparisonContentLayout(
    step: LessonStep,
    answerVisible: Boolean,
    density: LessonVisualDensity
) {
    val content = step.content
    val sections = content?.sections.orEmpty()
    val items = content?.items.orEmpty()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("comparison-content-layout"),
        verticalArrangement = Arrangement.spacedBy(density.blockGap)
    ) {
        // Yönerge / Odak maddeleri varsa numaralı yönerge satırları olarak dürüstçe göster
        if (items.isNotEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
            ) {
                Text(
                    text = "KARŞILAŞTIRMA BOYUTLARI VE YÖNERGELER",
                    style = MaterialTheme.typography.labelMedium,
                    color = LessonColors.Header,
                    fontWeight = FontWeight.Bold
                )
                items.forEachIndexed { index, item ->
                    AccentRow((index + 1).toString().padStart(2, '0'), item, density.rowPadding)
                }
            }
        }

        // Gerçek içerik bölümleri (sections) varsa iki veya çok sütunlu gerçek karşılaştırma tablosu
        if (sections.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("comparison-source-sections"),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, LessonColors.Border),
                color = LessonColors.Surface
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Tablo başlık satırı
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(LessonColors.SurfaceSoft)
                            .padding(horizontal = LessonSpacing.medium, vertical = LessonSpacing.small),
                        horizontalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                    ) {
                        sections.forEach { section ->
                            Text(
                                text = section.title.uppercase(),
                                style = MaterialTheme.typography.labelLarge,
                                color = LessonColors.Header,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Tablo gövde hücreleri
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(LessonSpacing.medium),
                        horizontalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                    ) {
                        sections.forEach { section ->
                            Text(
                                text = section.body,
                                style = MaterialTheme.typography.bodyLarge,
                                color = LessonColors.TextPrimary,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }

        // Cevap AÇIKSA ve answer_sections mevcutsa: tek yerde yapılandırılmış karşılaştırma tablosu olarak render et
        visibleComparisonAnswerSections(step, answerVisible)?.let { answerSections ->
            ComparisonAnswerTable(answerSections)
        }
    }
}

internal data class ComparisonAnswerMatrix(
    val headers: List<String>,
    val rows: List<List<String>>
)

/** Teacher answer data is exposed to the renderer only after its reveal state opens. */
internal fun visibleComparisonAnswerSections(
    step: LessonStep,
    answerVisible: Boolean
): JsonValue? = step.answer?.answerSections?.takeIf { answerVisible }

/** Top-level entities become columns; nested keys become comparison criteria. */
internal fun comparisonAnswerMatrix(answerSections: JsonValue): ComparisonAnswerMatrix? {
    val entries = (answerSections as? JsonValue.Object)?.values.orEmpty()
    if (entries.isEmpty()) return null

    val nestedColumns = entries.values.mapNotNull { it as? JsonValue.Object }
    if (nestedColumns.size == entries.size) {
        val criteria = linkedSetOf<String>()
        nestedColumns.forEach { column -> criteria.addAll(column.values.keys) }
        if (criteria.isEmpty()) return null
        return ComparisonAnswerMatrix(
            headers = listOf("Özellik") + entries.keys.map(::comparisonLabel),
            rows = criteria.map { criterion ->
                listOf(comparisonLabel(criterion)) + nestedColumns.map { column ->
                    column.values[criterion]?.let(::readableAnswerValue).orEmpty()
                }
            }
        )
    }

    return ComparisonAnswerMatrix(
        headers = listOf("Özellik", "Değer"),
        rows = entries.map { (key, value) ->
            listOf(comparisonLabel(key), readableAnswerValue(value))
        }
    )
}

internal fun vocabularyDefinitionVisible(
    answerVisibleInline: Boolean,
    termRevealed: Boolean
): Boolean = answerVisibleInline || termRevealed

private fun comparisonLabel(value: String): String =
    value.replace('_', ' ').replaceFirstChar { it.uppercase() }

/** A scrollable row/column matrix, including a two-column form for flat key/value data. */
@Composable
internal fun ComparisonAnswerTable(answerSections: JsonValue, heading: String? = "KARŞILAŞTIRMALI CEVAP") {
    val matrix = comparisonAnswerMatrix(answerSections) ?: return
    val criterionWidth = 112.dp
    val entityWidth = 148.dp
    val tableWidth = criterionWidth + entityWidth * (matrix.headers.size - 1)

    Column(
        modifier = Modifier.fillMaxWidth().testTag("comparison-answer-table"),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
    ) {
        heading?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.labelMedium,
                color = LessonColors.AnswerText,
                fontWeight = FontWeight.Bold
            )
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, LessonColors.AnswerBorder),
            color = LessonColors.AnswerSurface
        ) {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                Column(modifier = Modifier.width(tableWidth)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().background(LessonColors.SurfaceSoft),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        matrix.headers.forEachIndexed { index, header ->
                            Text(
                                text = header,
                                modifier = Modifier
                                    .width(if (index == 0) criterionWidth else entityWidth)
                                    .padding(horizontal = 8.dp, vertical = 10.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = LessonColors.AnswerText,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(LessonColors.AnswerBorder))
                    matrix.rows.forEachIndexed { rowIndex, row ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (rowIndex % 2 == 0) LessonColors.Surface else LessonColors.AnswerSurface),
                            verticalAlignment = Alignment.Top
                        ) {
                            row.forEachIndexed { columnIndex, cell ->
                                Text(
                                    text = cell,
                                    modifier = Modifier
                                        .width(if (columnIndex == 0) criterionWidth else entityWidth)
                                        .padding(horizontal = 8.dp, vertical = 8.dp),
                                    style = if (columnIndex == 0) MaterialTheme.typography.labelMedium
                                        else MaterialTheme.typography.bodyMedium,
                                    color = if (columnIndex == 0) LessonColors.AnswerText
                                        else LessonColors.TextPrimary,
                                    fontWeight = if (columnIndex == 0) FontWeight.SemiBold
                                        else FontWeight.Normal
                                )
                            }
                        }
                        Box(Modifier.fillMaxWidth().height(1.dp).background(LessonColors.AnswerBorder))
                    }
                }
            }
        }
    }
}

/**
 * Structured numbered schema renderer for LayoutKind.STRUCTURE.
 * Renders numbered flow nodes and connected schema blocks.
 */
@Composable
internal fun StructureSchemaLayout(
    items: List<String>,
    sections: List<SupplementalSection>,
    density: LessonVisualDensity
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
    ) {
        if (items.isNotEmpty()) {
            items.forEachIndexed { index, item ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    Surface(
                        modifier = Modifier.size(36.dp),
                        shape = CircleShape,
                        color = LessonColors.Primary
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = (index + 1).toString().padStart(2, '0'),
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Surface(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, LessonColors.Border),
                        color = LessonColors.SurfaceSoft
                    ) {
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(LessonSpacing.small),
                            color = LessonColors.TextPrimary
                        )
                    }
                }
                if (index < items.lastIndex) {
                    Box(
                        modifier = Modifier
                            .padding(start = 17.dp)
                            .width(2.dp)
                            .height(14.dp)
                            .background(LessonColors.Border)
                    )
                }
            }
        }
        if (sections.isNotEmpty()) {
            Spacer(modifier = Modifier.height(LessonSpacing.tiny))
            SectionCards(sections, density)
        }
    }
}

/**
 * Numbered assessment criteria layout for LayoutKind.ASSESSMENT.
 * NOTE: In remote-content/lessons.json, content.items represents evaluation criteria and
 * instructional focus dimensions (e.g. three dimensions of style contributing to meaning in s35-q1).
 * It is NOT a multiple-choice alternative list; no A/B/C labels or selection state are applied.
 */
@Composable
internal fun AssessmentCriteriaLayout(
    items: List<String>,
    sections: List<SupplementalSection>,
    density: LessonVisualDensity
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
    ) {
        if (items.isNotEmpty()) {
            Text(
                text = "DEĞERLENDİRME ÖLÇÜTLERİ VE ODAK BOYUTLARI",
                style = MaterialTheme.typography.labelMedium,
                color = LessonColors.Header,
                fontWeight = FontWeight.Bold
            )
            items.forEachIndexed { index, item ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = LessonTarget.minimum),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, LessonColors.Border),
                    color = LessonColors.Surface
                ) {
                    Row(
                        modifier = Modifier.padding(LessonSpacing.small),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                    ) {
                        Surface(
                            modifier = Modifier.size(32.dp),
                            shape = CircleShape,
                            color = LessonColors.SurfaceSoft,
                            border = BorderStroke(1.dp, LessonColors.Border)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = (index + 1).toString().padStart(2, '0'),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = LessonColors.Primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodyLarge,
                            color = LessonColors.TextPrimary,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
        if (sections.isNotEmpty()) {
            SectionCards(sections, density)
        }
    }
}

/**
 * Vocabulary term matching and context prediction layout for LayoutKind.VOCABULARY.
 * Driven directly by canonical data fields (step.answer.answerSections and state.vocabularyTerms).
 */
@Composable
internal fun VocabularyMatchLayout(
    step: LessonStep,
    state: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    answerVisible: Boolean,
    density: LessonVisualDensity
) {
    val answer = step.answer ?: return
    val terms = (answer.answerSections as? JsonValue.Object)?.values.orEmpty()
    if (terms.isEmpty()) return

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(density.blockGap)
    ) {
        Text(
            text = "KELİME / KAVRAM TAHMİN VE EŞLEŞTİRME",
            style = MaterialTheme.typography.labelMedium,
            color = LessonColors.Header,
            fontWeight = FontWeight.Bold
        )

        terms.forEach { (term, definition) ->
            val visible = vocabularyDefinitionVisible(
                answerVisibleInline = answerVisible,
                termRevealed = term in state.vocabularyTerms[state.stepId].orEmpty()
            )
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, if (visible) LessonColors.AnswerBorder else LessonColors.Border),
                color = if (visible) LessonColors.AnswerSurface else LessonColors.Surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(LessonSpacing.medium),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = term,
                            style = MaterialTheme.typography.titleMedium,
                            color = if (visible) LessonColors.AnswerText else LessonColors.TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        if (!answerVisible) {
                            OutlinedButton(
                                onClick = { dispatch(LessonCommand.ToggleTerm(state.stepId, term)) },
                                modifier = Modifier
                                    .heightIn(min = LessonTarget.minimum)
                                    .semantics {
                                        stateDescription = if (visible) "Anlam açık" else "Anlam kapalı"
                                    }
                            ) {
                                Text(if (visible) "Anlamı gizle" else "Anlamı göster")
                            }
                        }
                    }

                    if (visible) {
                        val defText = when (definition) {
                            is JsonValue.Text -> definition.value
                            else -> readableAnswerValue(definition)
                        }
                        Text(
                            text = defText,
                            style = MaterialTheme.typography.bodyLarge,
                            color = LessonColors.AnswerText
                        )
                    } else {
                        Text(
                            text = "Önce bağlamdan anlamını tahmin ettirin.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = LessonColors.TextSecondary
                        )
                    }
                }
            }
        }

    }
}

@Composable
private fun AccentRow(marker: String, value: String, rowPadding: Dp) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = LessonColors.SurfaceSoft,
        border = BorderStroke(1.dp, LessonColors.Border)
    ) {
        Row(
            modifier = Modifier.padding(rowPadding),
            horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = LessonColors.Primary,
                modifier = Modifier.padding(end = 4.dp)
            ) {
                Text(
                    text = marker,
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                color = LessonColors.TextPrimary,
                modifier = Modifier.weight(1f)
            )
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
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = LessonColors.Surface,
        border = BorderStroke(1.dp, LessonColors.Border),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(density.cardPadding),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
        ) {
            Text(
                section.title,
                style = MaterialTheme.typography.titleMedium,
                color = LessonColors.Primary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                section.body,
                style = MaterialTheme.typography.bodyLarge,
                color = LessonColors.TextPrimary
            )
        }
    }
}

/** Preserve recursive string/list/object/null data; never stringify a Kotlin data class. */
@Composable
internal fun AnswerSections(value: JsonValue?) {
    when (value) {
        null, JsonValue.Null -> Unit
        is JsonValue.Text -> Text(value.value, style = MaterialTheme.typography.bodyLarge, color = LessonColors.TextPrimary)
        is JsonValue.Number -> Text(value.value, style = MaterialTheme.typography.bodyLarge, color = LessonColors.TextPrimary)
        is JsonValue.Bool -> Text(
            if (value.value) "Evet" else "Hayır",
            style = MaterialTheme.typography.bodyLarge,
            color = LessonColors.TextPrimary
        )
        is JsonValue.Array -> Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            value.items.forEachIndexed { index, item ->
                Row(horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                    Text(
                        (index + 1).toString() + ".",
                        style = MaterialTheme.typography.labelLarge,
                        color = LessonColors.Primary,
                        fontWeight = FontWeight.Bold
                    )
                    Column(Modifier.weight(1f)) { AnswerSections(item) }
                }
            }
        }
        is JsonValue.Object -> Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            value.values.forEach { (key, item) ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = LessonColors.SurfaceSoft,
                    border = BorderStroke(1.dp, LessonColors.Border)
                ) {
                    Column(
                        modifier = Modifier.padding(LessonSpacing.medium),
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                    ) {
                        Text(
                            key.replace("_", " "),
                            style = MaterialTheme.typography.titleMedium,
                            color = LessonColors.Header,
                            fontWeight = FontWeight.SemiBold
                        )
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
