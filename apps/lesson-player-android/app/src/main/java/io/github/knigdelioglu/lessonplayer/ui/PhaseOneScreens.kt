package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

@Composable
internal fun PhaseOneScreen(
    screen: AppScreen,
    bundle: LessonBundle,
    session: LessonSession,
    selectLesson: (String) -> Unit,
    navigateToCurrent: () -> Unit,
    dispatch: (LessonCommand) -> Unit
) {
    when (screen) {
        AppScreen.LIBRARY -> LibraryScreen(bundle, session, selectLesson, navigateToCurrent)
        AppScreen.LESSON -> SessionLessonScreen(
            bundle.byId.getValue(session.lessonId),
            session,
            dispatch
        )
        AppScreen.GUIDE -> GuideScreen(bundle)
        AppScreen.SETTINGS -> SettingsScreen(bundle)
    }
}

/**
 * Wide-tablet step navigator. The lesson surface keeps its own scroll position
 * while this compact list provides stable context and direct step navigation.
 */
@Composable
internal fun LessonOutlinePane(
    lesson: LessonData,
    session: LessonSession,
    dispatch: (LessonCommand) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxHeight().widthIn(min = 240.dp, max = 300.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    ) {
        Column(
            modifier = Modifier.padding(LessonSpacing.medium),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text("DERS AKIŞI", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary)
            Text(
                lesson.title,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "${session.order.size} adım · seçili ${session.order.indexOf(session.stepId) + 1}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
            ) {
                itemsIndexed(session.order, key = { _, stepId -> stepId }) { index, stepId ->
                    val step = lesson.steps.first { it.id == stepId }
                    val selected = stepId == session.stepId
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = if (selected) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surface.copy(alpha = 0.55f)
                        }
                    ) {
                        TextButton(
                            onClick = { dispatch(LessonCommand.GoToStep(stepId)) },
                            modifier = Modifier.fillMaxWidth()
                                .heightIn(min = LessonTarget.minimum),
                            contentPadding = PaddingValues(
                                horizontal = LessonSpacing.small,
                                vertical = LessonSpacing.tiny
                            )
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.Start,
                                verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                            ) {
                                Text(
                                    "${index + 1}. ${step.displayPrompt}",
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.onPrimaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.onSurface
                                    }
                                )
                                Text(
                                    "s. ${step.source.printedPageRange} · ${step.layout.wire}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.onPrimaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PhaseTag() {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        shape = RoundedCornerShape(LessonShape.chip)
    ) {
        Text(
            "FAZ 4 · UYARLANABİLİR DERS YÜZEYİ",
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun SectionCard(
    eyebrow: String,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(LessonShape.card),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text(
                eyebrow,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary
            )
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            action?.invoke()
        }
    }
}

@Composable
internal fun LibraryScreen(
    bundle: LessonBundle,
    session: LessonSession,
    selectLesson: (String) -> Unit,
    navigateToCurrent: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                PhaseTag()
                Text("Ders, elinin altında.", style = MaterialTheme.typography.headlineLarge)
                Text(
                    "${bundle.lessons.size} ders · ${bundle.lessons.sumOf { it.steps.size }} adım · internet gerekmez",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        item {
            SectionCard(
                eyebrow = "KALDIĞIN YER",
                title = bundle.byId.getValue(session.lessonId).title,
                description = "Adım ${session.order.indexOf(session.stepId) + 1} /${session.order.size}",
                action = {
                    Button(
                        onClick = navigateToCurrent,
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) {
                        Text("Derse devam et")
                    }
                }
            )
        }
        bundle.workflow.themes.forEach { theme ->
            item {
                Text(
                    theme.title,
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(top = LessonSpacing.medium)
                )
            }
            items(bundle.byTheme[theme.id].orEmpty(), key = { it.lessonId }) { lesson ->
                SectionCard(
                    eyebrow = "11. SINIF · ${theme.id} · BASILI s. ${lesson.printedPageRange}",
                    title = lesson.title,
                    description = "${lesson.steps.size} adım · ${lesson.subtitle}",
                    action = {
                        Button(
                            onClick = { selectLesson(lesson.lessonId) },
                            modifier = Modifier.heightIn(min = LessonTarget.minimum)
                        ) {
                            Text("Adımları incele")
                        }
                    }
                )
            }
        }
    }
}

@Composable
internal fun GuideScreen(bundle: LessonBundle) {
    LazyColumn(
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item {
            PhaseTag()
            Text(
                "Üç ayrı takip hattı",
                modifier = Modifier.padding(top = LessonSpacing.medium),
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                "Görevler kanonik öğretmen rehberinden okunuyor; işaretleme Faz 5'te gelecek.",
                style = MaterialTheme.typography.bodyLarge
            )
        }
        items(bundle.workflow.themes, key = { it.id }) { theme ->
            SectionCard(
                eyebrow = theme.id,
                title = theme.title,
                description = theme.tasks.joinToString(" · ") {
                    "${it.skill}: ${it.title}"
                }
            )
        }
        item {
            SectionCard(
                eyebrow = "YILLIK ÇALIŞMA · ÖNERİ",
                title = "Dört eser ve bir film",
                description = bundle.workflow.annualItems.joinToString(" · ") { it.title }
            )
        }
    }
}

@Composable
internal fun SettingsScreen(bundle: LessonBundle) {
    LazyColumn(
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item { PhaseTag() }
        item {
            Text("Tablet için tasarlandı", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Görünüm Android'in açık/koyu sistem temasını takip eder.",
                style = MaterialTheme.typography.bodyLarge
            )
        }
        item {
            SectionCard(
                eyebrow = "KAYNAK BÜTÜNLÜĞÜ",
                title = "Doğrulanmış ders paketi",
                description = "${bundle.lessons.size} ders · SHA-256: ${bundle.contentSha256.take(16)}…"
            )
        }
        item {
            SectionCard(
                eyebrow = "YEREL VERİ",
                title = "İnternetsiz katalog",
                description = "Ders paketi APK içinde okunur. Kişisel ilerleme yerelde tutulur; düzenleme ve JSON yedek Faz 6'da gelecek."
            )
        }
    }
}
