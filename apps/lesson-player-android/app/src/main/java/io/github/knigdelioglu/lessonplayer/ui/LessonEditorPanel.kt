package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.sp
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.StepContent
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Teacher-only, inline editing for presentation metadata. The canonical lesson and
 * answer bank remain immutable; every change is persisted through LessonCommand.
 */
@Composable
internal fun LessonEditorPanel(
    step: LessonStep,
    state: LessonSession,
    ordinal: Int,
    dispatch: (LessonCommand) -> Unit
) {
    var expanded by rememberSaveable(step.id) { mutableStateOf(false) }

    if (!expanded) {
        TextButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth()
                .heightIn(min = LessonTarget.minimum)
                .testTag("lesson-editor-open")
        ) {
            Text("Gelişmiş öğretmen aracı · Adımı düzenle", fontSize = 13.sp)
        }
        return
    }

    var promptDraft by rememberSaveable(step.id) { mutableStateOf(step.displayPrompt) }
    var layoutMenuOpen by remember { mutableStateOf(false) }
    var densityMenuOpen by remember { mutableStateOf(false) }

    LaunchedEffect(step.id, step.displayPrompt) {
        promptDraft = step.displayPrompt
    }

    Card(
        modifier = Modifier.fillMaxWidth().testTag("lesson-editor"),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
        )
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
                Text("Yerel adım düzenleme", style = MaterialTheme.typography.titleMedium)
                Text(
                    "YALNIZCA ÖĞRETMEN · GELİŞMİŞ ARAÇ",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    "Bu ayarlar yalnızca bu Android cihazdaki öğretmen görünümünü değiştirir.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
            }

            OutlinedTextField(
                value = promptDraft,
                onValueChange = { promptDraft = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Soru / başlık") },
                supportingText = {
                    if (promptDraft.isBlank()) {
                        Text("Boş bırakılamaz.")
                    } else {
                        Text("Kanonik metin değişmez; bu yerel gösterim metnidir.")
                    }
                },
                minLines = 3
            )
            OutlinedButton(
                onClick = {
                    dispatch(
                        LessonCommand.ApplyOverride(
                            step.id,
                            StepOverride(displayPrompt = promptDraft)
                        )
                    )
                },
                enabled = promptDraft.isNotBlank() && promptDraft != step.displayPrompt,
                modifier = Modifier.fillMaxWidth().heightIn(min = LessonTarget.minimum)
            ) {
                Text("Soru / başlık değişikliğini kaydet")
            }

            Text("Görünüm ve yoğunluk", style = MaterialTheme.typography.titleMedium)
            EditorSelector(
                label = "Görünüm",
                value = layoutLabel(step.layout),
                expanded = layoutMenuOpen,
                onExpand = { layoutMenuOpen = true },
                onDismiss = { layoutMenuOpen = false }
            ) {
                editableLayouts(step).forEach { layout ->
                    DropdownMenuItem(
                        text = { Text(layoutLabel(layout)) },
                        onClick = {
                            dispatch(
                                LessonCommand.ApplyOverride(
                                    step.id,
                                    StepOverride(layout = layout)
                                )
                            )
                            layoutMenuOpen = false
                        }
                    )
                }
            }
            EditorSelector(
                label = "Yoğunluk",
                value = densityLabel(step.density),
                expanded = densityMenuOpen,
                onExpand = { densityMenuOpen = true },
                onDismiss = { densityMenuOpen = false }
            ) {
                listOf("large", "comfortable", "compact").forEach { density ->
                    DropdownMenuItem(
                        text = { Text(densityLabel(density)) },
                        onClick = {
                            dispatch(
                                LessonCommand.ApplyOverride(
                                    step.id,
                                    StepOverride(density = density)
                                )
                            )
                            densityMenuOpen = false
                        }
                    )
                }
            }

            Text("Açılım sırası", style = MaterialTheme.typography.titleMedium)
            Text(
                "Ders içinde gösterme ve sonraki adıma geçiş düğmesinin izleyeceği sıra.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary
            )
            step.revealOrder.forEachIndexed { index, key ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    Text(
                        "${index + 1}. ${revealLabel(key)}",
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyLarge
                    )
                    OutlinedButton(
                        onClick = {
                            moveReveal(step, index, -1, dispatch)
                        },
                        enabled = index > 0,
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) { Text("↑ Yukarı") }
                    OutlinedButton(
                        onClick = {
                            moveReveal(step, index, 1, dispatch)
                        },
                        enabled = index < step.revealOrder.lastIndex,
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) { Text("↓ Aşağı") }
                }
            }

            step.content?.let { content ->
                LessonContentEditor(
                    stepId = step.id,
                    sourceContent = content,
                    dispatch = dispatch
                )
            }

            Text("Adım sırası", style = MaterialTheme.typography.titleMedium)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
            ) {
                OutlinedButton(
                    onClick = {
                        dispatch(LessonCommand.MoveStep(step.id, -1))
                    },
                    enabled = ordinal > 0,
                    modifier = Modifier.weight(1f).heightIn(min = LessonTarget.minimum)
                ) { Text("Adımı yukarı taşı") }
                OutlinedButton(
                    onClick = {
                        dispatch(LessonCommand.MoveStep(step.id, 1))
                    },
                    enabled = ordinal < state.order.lastIndex,
                    modifier = Modifier.weight(1f).heightIn(min = LessonTarget.minimum)
                ) { Text("Adımı aşağı taşı") }
            }

            OutlinedButton(
                onClick = { dispatch(LessonCommand.ResetStep(step.id)) },
                modifier = Modifier.fillMaxWidth().heightIn(min = LessonTarget.minimum)
            ) {
                Text("Bu adımın düzenlemelerini sıfırla")
            }
            OutlinedButton(
                onClick = { expanded = false },
                modifier = Modifier.fillMaxWidth().heightIn(min = LessonTarget.minimum)
            ) {
                Text("Düzenlemeyi kapat")
            }
        }
    }
}

@Composable
private fun LessonContentEditor(
    stepId: String,
    sourceContent: StepContent,
    dispatch: (LessonCommand) -> Unit
) {
    var leadDraft by rememberSaveable(stepId) {
        mutableStateOf(sourceContent.lead.orEmpty())
    }
    var itemDrafts by rememberSaveable(stepId) {
        mutableStateOf(sourceContent.items)
    }
    var sectionTitles by rememberSaveable(stepId) {
        mutableStateOf(sourceContent.sections.map { it.title })
    }
    var sectionBodies by rememberSaveable(stepId) {
        mutableStateOf(sourceContent.sections.map { it.body })
    }

    LaunchedEffect(stepId, sourceContent) {
        leadDraft = sourceContent.lead.orEmpty()
        itemDrafts = sourceContent.items
        sectionTitles = sourceContent.sections.map { it.title }
        sectionBodies = sourceContent.sections.map { it.body }
    }

    val draft = StepContent(
        lead = leadDraft.ifBlank { null },
        items = itemDrafts,
        sections = sectionTitles.indices.map { index ->
            SupplementalSection(sectionTitles[index], sectionBodies[index])
        },
        // Teacher notes stay canonical and are not exposed by this editor.
        note = sourceContent.note
    )
    val valid = itemDrafts.all(String::isNotBlank) &&
        sectionTitles.zip(sectionBodies).all { (title, body) ->
            title.isNotBlank() && body.isNotBlank()
        }

    Column(
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        Text("Süreç maddeleri ve bilgi kartları",
            style = MaterialTheme.typography.titleMedium)
        Text(
            "Bu alanlar yalnızca bu adımın yerel öğretmen düzenini değiştirir.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.secondary
        )
        OutlinedTextField(
            value = leadDraft,
            onValueChange = { leadDraft = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Giriş açıklaması (isteğe bağlı)") },
            minLines = 2
        )
        itemDrafts.forEachIndexed { index, item ->
            OutlinedTextField(
                value = item,
                onValueChange = { value ->
                    itemDrafts = itemDrafts.toMutableList().also {
                        it[index] = value
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Süreç / bilgi maddesi ${index + 1}") },
                minLines = 2
            )
        }
        sectionTitles.forEachIndexed { index, title ->
            Text(
                "Bilgi kartı ${index + 1}",
                style = MaterialTheme.typography.titleMedium
            )
            OutlinedTextField(
                value = title,
                onValueChange = { value ->
                    sectionTitles = sectionTitles.toMutableList().also {
                        it[index] = value
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Kart başlığı") }
            )
            OutlinedTextField(
                value = sectionBodies[index],
                onValueChange = { value ->
                    sectionBodies = sectionBodies.toMutableList().also {
                        it[index] = value
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Kart içeriği") },
                minLines = 4
            )
        }
        if (!valid) {
            Text(
                "Süreç maddesi ve bilgi kartı alanları boş bırakılamaz.",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        OutlinedButton(
            onClick = {
                dispatch(
                    LessonCommand.ApplyOverride(
                        stepId,
                        StepOverride(content = draft, hasContentOverride = true)
                    )
                )
            },
            enabled = valid && draft != sourceContent,
            modifier = Modifier.fillMaxWidth().heightIn(min = LessonTarget.minimum)
        ) {
            Text("Süreç / bilgi kartı değişikliklerini kaydet")
        }
    }
}

@Composable
private fun EditorSelector(
    label: String,
    value: String,
    expanded: Boolean,
    onExpand: () -> Unit,
    onDismiss: () -> Unit,
    menu: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Box {
            OutlinedButton(
                onClick = onExpand,
                modifier = Modifier.fillMaxWidth().heightIn(min = LessonTarget.minimum)
            ) {
                Text(value)
            }
            DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
                menu()
            }
        }
    }
}

private fun moveReveal(
    step: LessonStep,
    index: Int,
    delta: Int,
    dispatch: (LessonCommand) -> Unit
) {
    val target = index + delta
    if (target !in step.revealOrder.indices) return
    val order = step.revealOrder.toMutableList()
    val moved = order.removeAt(index)
    order.add(target, moved)
    dispatch(
        LessonCommand.ApplyOverride(
            step.id,
            StepOverride(revealOrder = order)
        )
    )
}

private fun editableLayouts(step: LessonStep): List<LayoutKind> =
    LayoutKind.entries.filter { layout ->
        layout != LayoutKind.VOCABULARY ||
            ((step.answer?.answerSections as? JsonValue.Object)?.values?.isNotEmpty() == true)
    }

private fun layoutLabel(layout: LayoutKind): String = when (layout) {
    LayoutKind.QUESTION -> "Soru"
    LayoutKind.VOCABULARY -> "Kelime"
    LayoutKind.PROCESS -> "Süreç"
    LayoutKind.REFERENCE -> "Başvuru"
    LayoutKind.COMPARISON -> "Karşılaştırma"
    LayoutKind.STRUCTURE -> "Yapı"
    LayoutKind.ASSESSMENT -> "Değerlendirme"
}

private fun densityLabel(density: String): String = when (density) {
    "large" -> "Geniş"
    "comfortable" -> "Rahat"
    "compact" -> "Sıkı"
    else -> density
}

private fun revealLabel(key: RevealKey): String = when (key) {
    RevealKey.GUIDANCE -> "Yönlendirme"
    RevealKey.ANSWER -> "Cevap"
    RevealKey.EVIDENCE -> "Metinden kanıt"
    RevealKey.EXPLANATION -> "Açıklama"
    RevealKey.NOTE -> "Öğretmen notu"
}
