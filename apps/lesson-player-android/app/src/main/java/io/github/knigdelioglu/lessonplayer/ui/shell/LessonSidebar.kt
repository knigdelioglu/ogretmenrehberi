package io.github.knigdelioglu.lessonplayer.ui.shell

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.R
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Sol Koyu Mor Sidebar (Geniş Landscape Tablette ~%22 genişlik).
 * Uygulama navigasyonu (gerçek AppScreen sekmeleri) ve aktif ders adımlarını tek, sabit kolon içinde barındırır.
 */
@Composable
fun LessonV2Sidebar(
    currentScreen: AppScreen,
    onNavigate: (AppScreen) -> Unit,
    onSearch: () -> Unit,
    onReturnToCurrent: () -> Unit,
    session: LessonSession?,
    lesson: LessonData?,
    onSelectStep: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val listState = rememberLazyListState()

    LaunchedEffect(session?.stepId, session?.order) {
        if (session != null) {
            val selectedIndex = session.order.indexOf(session.stepId)
            if (selectedIndex >= 0) {
                listState.animateScrollToItem(selectedIndex)
            }
        }
    }

    Surface(
        modifier = modifier.fillMaxHeight(),
        color = LessonColors.SidebarBg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(LessonSpacing.medium)
        ) {
            // Logo / Başlık
            Column(modifier = Modifier.padding(bottom = LessonSpacing.medium)) {
                Text(
                    text = "ÖĞRETMEN REHBERİ",
                    style = MaterialTheme.typography.labelMedium,
                    color = LessonColors.SidebarSubtext,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "11. SINIF",
                    style = MaterialTheme.typography.titleMedium,
                    color = LessonColors.SidebarText,
                    fontWeight = FontWeight.Bold
                )
            }

            // Uygulama Navigasyonu (Sadece gerçek AppScreen değerleri - no-op menü yok!)
            Column(
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny),
                modifier = Modifier.fillMaxWidth()
            ) {
                AppScreen.entries.forEach { screen ->
                    val isSelected = currentScreen == screen
                    val iconRes = when (screen) {
                        AppScreen.LIBRARY -> R.drawable.ic_library
                        AppScreen.LESSON -> R.drawable.ic_lesson
                        AppScreen.GUIDE -> R.drawable.ic_guide
                        AppScreen.SETTINGS -> R.drawable.ic_settings
                    }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = LessonTarget.minimum)
                            .testTag("app-navigation-${screen.name.lowercase()}"),
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) LessonColors.SidebarActive else Color.Transparent,
                        border = if (isSelected) BorderStroke(1.dp, LessonColors.SidebarActive) else null
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = enabled) { onNavigate(screen) }
                                .padding(horizontal = LessonSpacing.small, vertical = LessonSpacing.tiny)
                                .semantics {
                                    selected = isSelected
                                    stateDescription = if (isSelected) "Seçili ${screen.title}" else screen.title
                                },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                        ) {
                            Icon(
                                painter = painterResource(iconRes),
                                contentDescription = null,
                                tint = if (isSelected) LessonColors.SidebarBg else LessonColors.SidebarText,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = screen.title,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isSelected) LessonColors.SidebarBg else LessonColors.SidebarText,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(LessonSpacing.small))
            SidebarQuickAction(
                label = "Arama",
                tag = "quick-access-search",
                onClick = onSearch
            )
            if (session != null && currentScreen != AppScreen.LESSON) {
                Spacer(modifier = Modifier.height(LessonSpacing.tiny))
                SidebarQuickAction(
                    label = "Kaldığım Yer",
                    tag = "quick-access-current-lesson",
                    onClick = onReturnToCurrent
                )
            }

            // Aktif Ders Adımları (Eğer aktif ders varsa)
            if (lesson != null && session != null) {
                Spacer(modifier = Modifier.height(LessonSpacing.medium))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(LessonColors.SidebarSurface)
                )
                Spacer(modifier = Modifier.height(LessonSpacing.medium))

                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "DERS AKIŞI",
                        style = MaterialTheme.typography.labelMedium,
                        color = LessonColors.SidebarSubtext,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${session.order.size} adım · seçili ${session.order.indexOf(session.stepId) + 1}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = LessonColors.SidebarSubtext
                    )
                }

                Spacer(modifier = Modifier.height(LessonSpacing.small))

                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                ) {
                    itemsIndexed(session.order, key = { _, stepId -> stepId }) { index, stepId ->
                        val step = lesson.steps.firstOrNull { it.id == stepId }
                        val isSelected = stepId == session.stepId
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = LessonTarget.minimum),
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) LessonColors.SidebarActive else Color.Transparent,
                            border = if (isSelected) BorderStroke(1.5.dp, LessonColors.SidebarActive) else null
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(enabled = enabled) { onSelectStep(stepId) }
                                    .padding(horizontal = LessonSpacing.small, vertical = LessonSpacing.tiny)
                                    .semantics {
                                        selected = isSelected
                                        stateDescription = if (isSelected) "Seçili adım ${index + 1}" else "Adım ${index + 1}"
                                    }
                                    .testTag("lesson-outline-step-${index + 1}"),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                            ) {
                                Surface(
                                    modifier = Modifier.size(24.dp),
                                    shape = CircleShape,
                                    color = if (isSelected) LessonColors.SidebarActive else LessonColors.SidebarSurface
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = (index + 1).toString(),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = if (isSelected) LessonColors.SidebarBg else LessonColors.SidebarText,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = step?.let(::lessonSidebarStepTitle).orEmpty(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (isSelected) LessonColors.SidebarBg else LessonColors.SidebarText,
                                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    step?.let { currentStep ->
                                        Text(
                                            text = listOf(
                                                lessonSidebarStepType(currentStep),
                                                "Basılı s. ${currentStep.source.printedPageRange}"
                                            ).joinToString(" · "),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = if (isSelected) LessonColors.SidebarBg.copy(alpha = 0.78f)
                                                else LessonColors.SidebarSubtext,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SidebarQuickAction(label: String, tag: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = LessonTarget.minimum)
            .testTag(tag),
        shape = RoundedCornerShape(10.dp),
        color = LessonColors.SidebarSurface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = LessonSpacing.small, vertical = LessonSpacing.tiny),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = LessonColors.SidebarText,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

internal fun lessonSidebarStepTitle(step: LessonStep): String {
    val title = sequenceOf(
        step.answer?.promptSummary,
        step.content?.sections?.firstOrNull()?.title,
        step.source.bookHeading,
        step.content?.items?.firstOrNull(),
        step.displayPrompt
    ).first { !it.isNullOrBlank() }
        .orEmpty()
        .replace(Regex("\\s+"), " ")
        .trim()
        .substringBefore(". ")
    if (title.length <= 58) return title
    val clipped = title.take(55).substringBeforeLast(' ').ifBlank { title.take(55) }
    return "$clipped…"
}

internal fun lessonSidebarStepType(step: LessonStep): String {
    val taskType = step.source.taskType.uppercase()
    return when {
        taskType.contains("TEXT") || taskType.contains("METIN") || taskType.contains("READING") -> "Metin"
        taskType.contains("TOPIC") || taskType.contains("KONU") || taskType == "PROCESS" -> "Konu"
        taskType.contains("QUESTION") || taskType.contains("SORU") -> "Soru"
        taskType.contains("ACTIVITY") || taskType.contains("ASSESS") ||
            taskType.contains("COMPARISON") || taskType == "TABLE" -> "Etkinlik"
        else -> when (step.layout) {
            LayoutKind.REFERENCE -> "Metin"
            LayoutKind.PROCESS -> "Konu"
            LayoutKind.QUESTION -> "Soru"
            LayoutKind.VOCABULARY -> "Söz varlığı"
            LayoutKind.COMPARISON, LayoutKind.STRUCTURE, LayoutKind.ASSESSMENT -> "Etkinlik"
        }
    }
}
