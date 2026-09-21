package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

@Composable
internal fun PhaseOneScreen(
    screen: AppScreen,
    bundle: LessonBundle,
    selectedLessonId: String?,
    selectLesson: (String) -> Unit
) {
    when (screen) {
        AppScreen.LIBRARY -> LibraryScreen(bundle, selectLesson)
        AppScreen.LESSON -> LessonScreen(bundle.byId[selectedLessonId] ?: bundle.lessons.first())
        AppScreen.GUIDE -> GuideScreen(bundle)
        AppScreen.SETTINGS -> SettingsScreen(bundle)
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
            "FAZ 2 · ÇEVRİMDIŞI İÇERİK",
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
        Column(modifier = Modifier.padding(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
            Text(eyebrow, style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary)
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(description, style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            action?.invoke()
        }
    }
}

@Composable
internal fun LibraryScreen(bundle: LessonBundle, selectLesson: (String) -> Unit) {
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
        bundle.workflow.themes.forEach { theme ->
            item {
                Text(theme.title, style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(top = LessonSpacing.medium))
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
                        ) { Text("Adımları incele") }
                    }
                )
            }
        }
    }
}

@Composable
internal fun LessonScreen(lesson: LessonData) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item {
            PhaseTag()
            Text(lesson.title, modifier = Modifier.padding(top = LessonSpacing.medium),
                style = MaterialTheme.typography.headlineMedium)
            Text("Basılı s. ${lesson.printedPageRange} · ${lesson.steps.size} adım",
                style = MaterialTheme.typography.bodyLarge)
            Text("Salt okunur kaynak önizlemesi. Cevap açma ve ders motoru Faz 3–4'te gelecek.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(lesson.steps, key = { it.id }) { step ->
            SectionCard(
                eyebrow = "BASILI s. ${step.source.printedPageRange} · ${step.layout.wire}",
                title = step.displayPrompt,
                description = "${step.source.bookHeading} · ${step.source.taskType}"
            )
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
            Text("Üç ayrı takip hattı", modifier = Modifier.padding(top = LessonSpacing.medium),
                style = MaterialTheme.typography.headlineMedium)
            Text("Görevler kanonik öğretmen rehberinden okunuyor; işaretleme Faz 5'te gelecek.",
                style = MaterialTheme.typography.bodyLarge)
        }
        items(bundle.workflow.themes, key = { it.id }) { theme ->
            SectionCard(
                eyebrow = theme.id,
                title = theme.title,
                description = theme.tasks.joinToString(" · ") { "${it.skill}: ${it.title}" }
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
            Text("Görünüm Android'in açık/koyu sistem temasını takip eder.",
                style = MaterialTheme.typography.bodyLarge)
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
                description = "Bu dersler APK içinde okunur. Kişisel kayıt ve JSON yedek Faz 3–6'da eklenecek."
            )
        }
    }
}
