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
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.R
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.storage.ClassGroup
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget

/**
 * Sidebar color styling tokens allowing distinct themes (e.g. light surface on tablet lesson overlay).
 */
data class LessonSidebarColors(
    val background: Color,
    val surface: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val sectionTitle: Color,
    val divider: Color,
    val selectorSurface: Color,
    val selectorBorder: Color? = null,
    val menuBackground: Color,
    val actionActive: Color,
    val playButtonSurface: Color,
    val playButtonBorder: Color? = null,
    val playButtonTint: Color,
    val navActiveBackground: Color,
    val navActiveBorder: Color? = null,
    val navActiveContent: Color,
    val navInactiveContent: Color,
    val stepBadgeBackground: Color,
    val stepBadgeText: Color,
    val stepActiveBadgeBackground: Color,
    val stepActiveBadgeText: Color,
    val stepActiveBackground: Color,
    val stepActiveBorder: Color,
    val stepActiveTitle: Color,
    val stepActiveSubtext: Color
) {
    companion object {
        fun dark(): LessonSidebarColors = LessonSidebarColors(
            background = LessonColors.SidebarBg,
            surface = LessonColors.SidebarSurface,
            textPrimary = LessonColors.SidebarText,
            textSecondary = LessonColors.SidebarSubtext,
            sectionTitle = LessonColors.SidebarSubtext,
            divider = LessonColors.SidebarSurface,
            selectorSurface = LessonColors.SidebarSurface,
            selectorBorder = null,
            menuBackground = LessonColors.SidebarBg,
            actionActive = LessonColors.SidebarActive,
            playButtonSurface = LessonColors.SidebarSurface,
            playButtonBorder = LessonColors.SidebarActive.copy(alpha = 0.5f),
            playButtonTint = LessonColors.SidebarActive,
            navActiveBackground = LessonColors.SidebarActive,
            navActiveBorder = LessonColors.SidebarActive,
            navActiveContent = LessonColors.SidebarBg,
            navInactiveContent = LessonColors.SidebarText,
            stepBadgeBackground = LessonColors.SidebarSurface,
            stepBadgeText = LessonColors.SidebarText,
            stepActiveBadgeBackground = LessonColors.SidebarActive,
            stepActiveBadgeText = LessonColors.SidebarBg,
            stepActiveBackground = LessonColors.SidebarActive,
            stepActiveBorder = LessonColors.SidebarActive,
            stepActiveTitle = LessonColors.SidebarBg,
            stepActiveSubtext = LessonColors.SidebarBg.copy(alpha = 0.78f)
        )

        fun light(): LessonSidebarColors = LessonSidebarColors(
            background = Color(0xFFFAFBFE).copy(alpha = 0.98f),
            surface = Color(0xFFECEFF8),
            textPrimary = Color(0xFF171729),
            textSecondary = Color(0xFF5E6278),
            sectionTitle = Color(0xFF5E6278),
            divider = Color(0xFFD9DDE8),
            selectorSurface = Color(0xFFECEFF8),
            selectorBorder = Color(0xFFD9DDE8),
            menuBackground = Color(0xFFFFFFFF),
            actionActive = Color(0xFF5434D4),
            playButtonSurface = Color(0xFFECEFF8),
            playButtonBorder = Color(0xFF5434D4).copy(alpha = 0.4f),
            playButtonTint = Color(0xFF5434D4),
            navActiveBackground = Color(0xFFEDE8FE),
            navActiveBorder = Color(0xFF5434D4),
            navActiveContent = Color(0xFF5434D4),
            navInactiveContent = Color(0xFF171729),
            stepBadgeBackground = Color(0xFFECEFF8),
            stepBadgeText = Color(0xFF171729),
            stepActiveBadgeBackground = Color(0xFF5434D4),
            stepActiveBadgeText = Color.White,
            stepActiveBackground = Color(0xFFEDE8FE),
            stepActiveBorder = Color(0xFF5434D4),
            stepActiveTitle = Color(0xFF171729),
            stepActiveSubtext = Color(0xFF4C2CA6)
        )
    }
}

/**
 * Sidebar adımlarının LazyColumn içinde başlama ofseti.
 * DERS AKIŞI başlığı LazyColumn dışında Column içinde yer aldığından LazyColumn doğrudan adımlarla başlar (ofset = 0).
 */
internal const val LESSON_SIDEBAR_HEADER_ITEM_COUNT = 0

/**
 * İlk açılışta veya montaj anında LazyColumn'un aktif adımı doğrudan göstereceği indeks.
 * Animasyon olmadan doğrudan doğru adımın görünmesini sağlar.
 */
internal fun calculateLessonSidebarInitialIndex(session: LessonSession?): Int {
    if (session == null) return 0
    val stepIndex = session.order.indexOf(session.stepId)
    val effectiveIndex = if (stepIndex >= 0) stepIndex else 0
    return effectiveIndex + LESSON_SIDEBAR_HEADER_ITEM_COUNT
}

/**
 * Sidebar açıkken aktif adım değiştiğinde otomatik kaydırma gerekip gerekmediğini ve hedef indeksi belirler.
 * İlk açılışta (veya aynı adım tekrarlandığında) kaydırma tetiklemez (null döner).
 * Adım değiştiğinde ise LazyColumn başlık ofseti hesaba katılarak hedef indeks döner.
 */
internal fun resolveLessonSidebarAutoScrollTarget(
    currentStepIndex: Int?,
    lastStepIndex: Int?,
    headerItemCount: Int = LESSON_SIDEBAR_HEADER_ITEM_COUNT
): Int? {
    if (currentStepIndex == null || currentStepIndex == lastStepIndex) {
        return null
    }
    return currentStepIndex + headerItemCount
}

@Composable
fun rememberLessonSidebarListState(session: LessonSession?): LazyListState {
    val initialIndex = remember { calculateLessonSidebarInitialIndex(session) }
    return rememberLazyListState(initialFirstVisibleItemIndex = initialIndex)
}

/**
 * Sol Sidebar (Geniş Landscape Tablette ~%22 genişlik).
 * Uygulama navigasyonu (gerçek AppScreen sekmeleri), aktif şube seçici ve aktif ders adımlarını barındırır.
 */
@Composable
fun LessonV2Sidebar(
    currentScreen: AppScreen,
    onNavigate: (AppScreen) -> Unit,
    onReturnToCurrent: () -> Unit = {},
    session: LessonSession?,
    lesson: LessonData?,
    onSelectStep: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    activeClassGroup: ClassGroup? = null,
    classGroups: List<ClassGroup> = emptyList(),
    groupProgressSummaries: Map<String, String> = emptyMap(),
    onSelectClassGroup: (String) -> Unit = {},
    onAddNewClassGroup: () -> Unit = {},
    hasSavedProgress: Boolean = false,
    onResumeClassGroup: (String) -> Unit = {},
    colors: LessonSidebarColors = LessonSidebarColors.light(),
    listState: LazyListState = rememberLessonSidebarListState(session)
) {
    var lastStepIndex by remember {
        mutableStateOf(session?.let { s -> s.order.indexOf(s.stepId).takeIf { it >= 0 } })
    }

    LaunchedEffect(session?.stepId, session?.order) {
        val currentStepIndex = session?.let { s -> s.order.indexOf(s.stepId).takeIf { it >= 0 } }
        val targetIndex = resolveLessonSidebarAutoScrollTarget(currentStepIndex, lastStepIndex)
        if (targetIndex != null) {
            lastStepIndex = currentStepIndex
            listState.animateScrollToItem(targetIndex)
        }
    }

    Surface(
        modifier = modifier.fillMaxHeight(),
        color = colors.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(LessonSpacing.medium)
        ) {
            // Logo / Başlık ve Şube Seçici
            Column(
                modifier = Modifier.padding(bottom = LessonSpacing.medium),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "ÖĞRETMEN REHBERİ",
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.sectionTitle,
                    fontWeight = FontWeight.Bold
                )
                if (activeClassGroup != null) {
                    val canResume = enabled && hasSavedProgress
                    val resumeContentDescription = if (hasSavedProgress) {
                        "${activeClassGroup.displayName} kaldığı yerden devam et"
                    } else {
                        "${activeClassGroup.displayName} için kayıtlı ilerleme yok"
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ClassGroupDropdownSelector(
                            activeGroup = activeClassGroup,
                            classGroups = classGroups,
                            progressSummaries = groupProgressSummaries,
                            onSelectGroup = onSelectClassGroup,
                            onAddNewGroup = onAddNewClassGroup,
                            enabled = enabled,
                            colors = colors
                        )

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (canResume) colors.playButtonSurface else colors.playButtonSurface.copy(alpha = 0.4f),
                            border = if (canResume) colors.playButtonBorder?.let { BorderStroke(1.dp, it) } else null,
                            modifier = Modifier
                                .size(36.dp)
                                .clickable(
                                    enabled = canResume,
                                    onClickLabel = resumeContentDescription,
                                    onClick = { onResumeClassGroup(activeClassGroup.id) }
                                )
                                .testTag("sidebar-class-group-resume-button")
                                .semantics {
                                    contentDescription = resumeContentDescription
                                }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    painter = painterResource(R.drawable.ic_play),
                                    contentDescription = null,
                                    tint = if (canResume) colors.playButtonTint else colors.textSecondary.copy(alpha = 0.38f),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = "11. SINIF",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Uygulama Navigasyonu
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
                        color = if (isSelected) colors.navActiveBackground else Color.Transparent,
                        border = if (isSelected) colors.navActiveBorder?.let { BorderStroke(1.dp, it) } else null
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
                                tint = if (isSelected) colors.navActiveContent else colors.navInactiveContent,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = screen.title,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isSelected) colors.navActiveContent else colors.navInactiveContent,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            // Aktif Ders Adımları
            if (lesson != null && session != null) {
                Spacer(modifier = Modifier.height(LessonSpacing.medium))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(colors.divider)
                )
                Spacer(modifier = Modifier.height(LessonSpacing.medium))

                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "DERS AKIŞI",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.sectionTitle,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${session.order.size} adım · seçili ${session.order.indexOf(session.stepId) + 1}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.textSecondary
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
                            color = if (isSelected) colors.stepActiveBackground else Color.Transparent,
                            border = if (isSelected) BorderStroke(1.5.dp, colors.stepActiveBorder) else null
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
                                    color = if (isSelected) colors.stepActiveBadgeBackground else colors.stepBadgeBackground
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = (index + 1).toString(),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = if (isSelected) colors.stepActiveBadgeText else colors.stepBadgeText,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = step?.let(::lessonSidebarStepTitle).orEmpty(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (isSelected) colors.stepActiveTitle else colors.textPrimary,
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
                                            color = if (isSelected) colors.stepActiveSubtext
                                                else colors.textSecondary,
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
internal fun ClassGroupDropdownSelector(
    activeGroup: ClassGroup,
    classGroups: List<ClassGroup>,
    progressSummaries: Map<String, String>,
    onSelectGroup: (String) -> Unit,
    onAddNewGroup: () -> Unit,
    enabled: Boolean = true,
    colors: LessonSidebarColors = LessonSidebarColors.light(),
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = colors.selectorSurface,
            border = colors.selectorBorder?.let { BorderStroke(1.dp, it) },
            modifier = Modifier
                .clickable(enabled = enabled) { expanded = true }
                .testTag("sidebar-class-group-selector")
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "${activeGroup.displayName} ▾",
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(colors.menuBackground)
        ) {
            classGroups.forEach { group ->
                val isSelected = group.id == activeGroup.id
                DropdownMenuItem(
                    text = {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                            ) {
                                if (isSelected) {
                                    Text(
                                        text = "✓",
                                        color = colors.actionActive,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = group.displayName,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) colors.actionActive else colors.textPrimary
                                )
                            }
                            val summary = progressSummaries[group.id] ?: "Henüz başlanmadı"
                            Text(
                                text = summary,
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    },
                    onClick = {
                        expanded = false
                        onSelectGroup(group.id)
                    },
                    modifier = Modifier.testTag("class-group-option-${group.id}")
                )
            }
            HorizontalDivider(color = colors.divider)
            DropdownMenuItem(
                text = {
                    Text(
                        text = "+ Yeni Şube Ekle",
                        color = colors.actionActive,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                onClick = {
                    expanded = false
                    onAddNewGroup()
                },
                modifier = Modifier.testTag("add-class-group-button")
            )
        }
    }
}



internal fun lessonSidebarStepTitle(step: LessonStep): String {
    return sequenceOf(
        step.outlineTitle,
        step.answer?.promptSummary,
        step.content?.sections?.firstOrNull()?.title,
        step.source.bookHeading,
        step.content?.items?.firstOrNull(),
        step.displayPrompt
    ).first { !it.isNullOrBlank() }
        .orEmpty()
        .replace(Regex("\\s+"), " ")
        .trim()
        .replace(Regex("^\\d+\\.\\s+Tema\\b\\s*(?:[—–-]\\s*)?"), "")
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
