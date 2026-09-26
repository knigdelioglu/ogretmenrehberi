package io.github.knigdelioglu.lessonplayer.ui.shell

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import io.github.knigdelioglu.lessonplayer.R
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing

enum class PhaseState {
    PAST,
    ACTIVE,
    UPCOMING
}

/**
 * Derived UI lesson presentation phase, not stored in canonical lesson data.
 */
data class LessonUiPhase(
    val id: String,
    val title: String,
    val stepIds: List<String>,
    val state: PhaseState,
    val activeStepIndexInPhase: Int,
    val totalStepsInPhase: Int
)

/**
 * Derives contiguous category segments in the current lesson order.
 */
fun deriveLessonPhases(lesson: LessonData, session: LessonSession): List<LessonUiPhase> {
    val stepsById = lesson.steps.associateBy { it.id }
    val steps = session.order.mapNotNull(stepsById::get)
    if (steps.isEmpty()) return emptyList()

    val currentStepIndexInOrder = steps.indexOfFirst { it.id == session.stepId }.coerceAtLeast(0)

    // Map each step to a pedagogical category based on LayoutKind and taskType
    fun stepCategory(step: LessonStep): String {
        val tt = step.source.taskType.uppercase()
        val layout = step.layout
        return when {
            layout == LayoutKind.ASSESSMENT || tt == "ASSESSMENT" -> "Değerlendirme"
            layout == LayoutKind.VOCABULARY || tt == "VOCABULARY" -> "Söz Varlığı"
            layout in setOf(LayoutKind.STRUCTURE, LayoutKind.COMPARISON) || tt in setOf("TABLE", "COMPARISON") -> "Çözümleme"
            tt == "PROCESS" || layout == LayoutKind.PROCESS -> "Hazırlık"
            else -> "Anlama"
        }
    }

    val orderedCategories = mutableListOf<String>()
    val categoryStepIds = mutableListOf<MutableList<String>>()
    for (step in steps) {
        val cat = stepCategory(step)
        if (orderedCategories.lastOrNull() != cat) {
            orderedCategories.add(cat)
            categoryStepIds.add(mutableListOf())
        }
        categoryStepIds.last().add(step.id)
    }

    return orderedCategories.mapIndexed { index, category ->
        val stepIds = categoryStepIds[index]
        val groupIndices = stepIds.map { id -> steps.indexOfFirst { it.id == id } }
        val phaseState = when {
            session.stepId in stepIds -> PhaseState.ACTIVE
            groupIndices.maxOrNull()?.let { it < currentStepIndexInOrder } == true -> PhaseState.PAST
            else -> PhaseState.UPCOMING
        }

        val activeIndex = if (phaseState == PhaseState.ACTIVE) stepIds.indexOf(session.stepId) + 1 else 0

        LessonUiPhase(
            id = "phase-$index-$category",
            title = category,
            stepIds = stepIds,
            state = phaseState,
            activeStepIndexInPhase = activeIndex,
            totalStepsInPhase = stepIds.size
        )
    }
}

/**
 * Üst Bağlam Çubuğu & Stepper (Header).
 * Sınıf/ders bağlamı ve dersteki kararlı UI fazlarını gösterir.
 */
@Composable
fun LessonV2Header(
    currentScreen: AppScreen,
    lesson: LessonData?,
    session: LessonSession?,
    modifier: Modifier = Modifier,
    onToggleSidebar: (() -> Unit)? = null,
    isSidebarOpen: Boolean = false
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 68.dp)
            .testTag("lesson-v2-header"),
        color = LessonColors.Surface,
        border = BorderStroke(1.dp, LessonColors.Border)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = LessonSpacing.large, vertical = LessonSpacing.small),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            // Ders başlığı; sınıf bağlamı sol menüde gösterilir.
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
            ) {
                if (onToggleSidebar != null) {
                    IconButton(
                        onClick = onToggleSidebar,
                        modifier = Modifier
                            .size(36.dp)
                            .testTag("lesson-outline-open")
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.ic_lesson),
                            contentDescription = if (isSidebarOpen) "Menüyü kapat" else "Menüyü aç",
                            tint = LessonColors.TextPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Text(
                    text = if (currentScreen == AppScreen.LESSON && lesson != null) lesson.title else currentScreen.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 21.sp,
                        lineHeight = 26.sp
                    ),
                    color = LessonColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }

            // Fazlar ders sırasındaki ardışık içerik bölümlerini izler.
            if (currentScreen == AppScreen.LESSON && lesson != null && session != null) {
                val phases = deriveLessonPhases(lesson, session)
                LessonV2Stepper(phases = phases, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

/** Thin connector, circular step markers, and short labels for ordered phase segments. */
@Composable
fun LessonV2Stepper(
    phases: List<LessonUiPhase>,
    modifier: Modifier = Modifier
) {
    if (phases.isEmpty()) return
    val scrollState = rememberScrollState()
    BoxWithConstraints(modifier = modifier) {
        val stepWidth = maxOf(112.dp, maxWidth / phases.size)
        val contentWidth = stepWidth * phases.size
        Row(modifier = Modifier.horizontalScroll(scrollState)) {
            Box(modifier = Modifier.width(contentWidth)) {
                Canvas(modifier = Modifier.fillMaxWidth().heightIn(min = 22.dp)) {
                    if (phases.size > 1) {
                        val centerY = 9.dp.toPx()
                        val firstCenter = size.width / (2f * phases.size)
                        drawLine(
                            color = LessonColors.Border,
                            start = androidx.compose.ui.geometry.Offset(firstCenter, centerY),
                            end = androidx.compose.ui.geometry.Offset(size.width - firstCenter, centerY),
                            strokeWidth = 1.dp.toPx()
                        )
                    }
                }
                Row(modifier = Modifier.fillMaxWidth()) {
                    phases.forEach { phase ->
                        val active = phase.state == PhaseState.ACTIVE
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .semantics {
                                    stateDescription = when (phase.state) {
                                        PhaseState.PAST -> "${phase.title}, önceki adım"
                                        PhaseState.ACTIVE -> "${phase.title}, etkin adım ${phase.activeStepIndexInPhase}/${phase.totalStepsInPhase}"
                                        PhaseState.UPCOMING -> "${phase.title}, sıradaki adım"
                                    }
                                },
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier.fillMaxWidth().heightIn(min = 22.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Surface(
                                    modifier = Modifier.size(18.dp),
                                    shape = CircleShape,
                                    color = when (phase.state) {
                                        PhaseState.ACTIVE -> LessonColors.Primary
                                        PhaseState.PAST -> LessonColors.SidebarActive
                                        PhaseState.UPCOMING -> LessonColors.SurfaceSoft
                                    },
                                    border = BorderStroke(
                                        1.dp,
                                        if (phase.state == PhaseState.UPCOMING) LessonColors.Border
                                        else LessonColors.Primary
                                    )
                                ) {}
                            }
                            Text(
                                text = phase.title,
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontSize = 12.sp,
                                    lineHeight = 14.sp
                                ),
                                color = if (active) LessonColors.Primary else LessonColors.TextSecondary,
                                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }
    }
}
