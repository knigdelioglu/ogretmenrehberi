package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

@Composable
internal fun PhaseOneScreen(screen: AppScreen, navigate: (AppScreen) -> Unit) {
    when (screen) {
        AppScreen.LIBRARY -> LibraryScreen(navigate)
        AppScreen.LESSON -> LessonScreen()
        AppScreen.GUIDE -> GuideScreen()
        AppScreen.SETTINGS -> SettingsScreen()
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
            "FAZ 1 · ANDROID 16",
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
internal fun LibraryScreen(navigate: (AppScreen) -> Unit) {
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
                    "Bu ekran yerel uygulama iskeletidir. Doğrulanmış 48 ders akışı Faz 2'de bağlanacak.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        item {
            SectionCard(
                eyebrow = "DERS ÖNİZLEMESİ",
                title = "Soru ve cevap düzeni",
                description = "Gerçek kitap içeriği henüz yüklenmedi. Yalnız tablet arayüzünü inceleyebilirsin.",
                action = {
                    Button(
                        onClick = { navigate(AppScreen.LESSON) },
                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                    ) { Text("Ders görünümünü incele") }
                }
            )
        }
        items((1..4).toList()) { theme ->
            SectionCard(
                eyebrow = "11. SINIF",
                title = "Tema $theme",
                description = "Dersler ve sayfa aralıkları Faz 2'de kanonik JSON'dan yüklenecek."
            )
        }
    }
}

@Composable
internal fun LessonScreen() {
    var revealPreview by rememberSaveable { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item { PhaseTag() }
        item {
            SectionCard(
                eyebrow = "ÖRNEK DERS YERLEŞİMİ · GERÇEK KİTAP İÇERİĞİ DEĞİL",
                title = if (revealPreview) "Cevap alanı" else "Soru alanı",
                description = if (revealPreview)
                    "Bu alan Faz 3'te kanonik cevaplarla doldurulacak."
                else "Bu alana Faz 2'de doğrulanmış ders sorusu gelecek.",
                action = {
                    FilledTonalButton(
                        modifier = Modifier.heightIn(min = LessonTarget.minimum),
                        onClick = { revealPreview = !revealPreview }
                    ) { Text(if (revealPreview) "Soruyu göster" else "Cevap yerleşimini incele") }
                }
            )
        }
        item {
            SectionCard(
                eyebrow = "ÖĞRETMEN KONTROLÜ",
                title = "Yönlendirme ve açıklama",
                description = "Bu katmanların açılma sırası ve gerçek içeriği ders motoruyla birlikte gelecek."
            )
        }
    }
}

@Composable
internal fun GuideScreen() {
    val streams = listOf(
        Triple("01", "Edebiyat Atölyesi", "Konuşma ve yazma görevleri"),
        Triple("02", "Eser ve film takvimi", "Dört eser + bir film; tarihler öneridir"),
        Triple("03", "Portfolyo", "Kanıtlar ve öğretmen plan işaretleri")
    )
    LazyColumn(
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item {
            PhaseTag()
            Text("Üç ayrı takip hattı", modifier = Modifier.padding(top = LessonSpacing.medium),
                style = MaterialTheme.typography.headlineMedium)
            Text("Rehberin gerçek görevleri ve kalıcı işaretleri Faz 5'te bağlanacak.",
                style = MaterialTheme.typography.bodyLarge)
        }
        items(streams) { (number, title, description) ->
            SectionCard(eyebrow = "TAKİP HATTI $number", title = title, description = description)
        }
    }
}

@Composable
internal fun SettingsScreen() {
    LazyColumn(
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item { PhaseTag() }
        item {
            Text("Tablet için tasarlandı", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Görünüm şimdilik Android'in açık/koyu sistem temasını takip eder.",
                style = MaterialTheme.typography.bodyLarge
            )
        }
        item {
            SectionCard(
                eyebrow = "ERİŞİLEBİLİRLİK",
                title = "Dikey ve yatay kullanım",
                description = "Gezinme kullanılabilir pencere genişliğine göre yer değiştirir; sistem çubukları için güvenli alan ayrılır."
            )
        }
        item {
            SectionCard(
                eyebrow = "YEREL VERİ",
                title = "İnternetsiz ders ve yedek",
                description = "Ders paketleri Faz 2'de, kayıt ve JSON yedekleri Faz 3–6'da eklenecek."
            )
        }
    }
}
