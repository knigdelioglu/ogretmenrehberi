package io.github.knigdelioglu.lessonplayer.ui.shell

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing

enum class PhaseState {
    COMPLETED,
    ACTIVE,
    UPCOMING
}

/**
 * Derived UI lesson presentation phase.
 * Not stored in database or canonical JSON contract; derived monotonically from
 * step order, LayoutKind, and taskType to present 4–6 stable pedagogical phases.
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
 * Derives at most 5–6 stable pedagogical UI phases from lesson steps.
 */
fun deriveLessonPhases(lesson: LessonData, session: LessonSession): List<LessonUiPhase> {
    val steps = lesson.steps
    if (steps.isEmpty()) return emptyList()

    val currentStepIndexInOrder = session.order.indexOf(session.stepId)

    // Map each step to a pedagogical category based on LayoutKind and taskType
    fun stepCategory(step: LessonStep): String {
        val tt = step.source.taskType.uppercase()
        val layout = step.layout
        return when {
            layout == LayoutKind.ASSESSMENT || tt == "ASSESSMENT" -> "Değerlendirme"
            layout == LayoutKind.VOCABULARY || tt == "VOCABULARY" -> "Söz Varlığı"
            layout in setOf(LayoutKind.STRUCTURE, LayoutKind.COMPARISON) || tt in setOf("TABLE", "COMPARISON") -> "Çözümleme & Tahlil"
            tt == "PROCESS" || layout == LayoutKind.PROCESS -> "Süreç & Hazırlık"
            else -> "Anlama & İnceleme"
        }
    }

    // Group steps in lesson order into stable phase clusters (max 5 distinct categories)
    val orderedCategories = mutableListOf<String>()
    val categoryStepIds = mutableMapOf<String, MutableList<String>>()

    for (step in steps) {
        val cat = stepCategory(step)
        if (cat !in categoryStepIds) {
            orderedCategories.add(cat)
            categoryStepIds[cat] = mutableListOf()
        }
        categoryStepIds.getValue(cat).add(step.id)
    }

    return orderedCategories.mapIndexed { index, catName ->
        val stepIds = categoryStepIds.getValue(catName)
        val stepIndicesInOrder = stepIds.map { session.order.indexOf(it) }.filter { it >= 0 }

        val phaseState = when {
            session.stepId in stepIds -> PhaseState.ACTIVE
            stepIndicesInOrder.isNotEmpty() && stepIndicesInOrder.all { it < currentStepIndexInOrder } -> PhaseState.COMPLETED
            else -> PhaseState.UPCOMING
        }

        val activeIndex = if (session.stepId in stepIds) {
            stepIds.indexOf(session.stepId) + 1
        } else if (phaseState == PhaseState.COMPLETED) {
            stepIds.size
        } else {
            0
        }

        LessonUiPhase(
            id = "phase-$index-$catName",
            title = "${index + 1}. $catName",
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
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 68.dp),
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
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = if (currentScreen == AppScreen.LESSON && lesson != null) lesson.title else currentScreen.title,
                    style = MaterialTheme.typography.titleMedium,
                    color = LessonColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Gerçek Ders Fazları Stepperı (En fazla 5–6 kararlı faz)
            if (currentScreen == AppScreen.LESSON && lesson != null && session != null) {
                val phases = deriveLessonPhases(lesson, session)
                LessonV2Stepper(phases = phases, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

/**
 * Kararlı Ders Fazları Stepperı (30 adım yerine 4–5 pedagojik faz gösterir).
 */
@Composable
fun LessonV2Stepper(
    phases: List<LessonUiPhase>,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Row(
        modifier = modifier.horizontalScroll(scrollState),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
    ) {
        phases.forEachIndexed { index, phase ->
            val isCompleted = phase.state == PhaseState.COMPLETED
            val isActive = phase.state == PhaseState.ACTIVE

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = when {
                    isActive -> LessonColors.Primary
                    isCompleted -> LessonColors.AnswerSurface
                    else -> LessonColors.SurfaceSoft
                },
                border = BorderStroke(
                    1.dp,
                    when {
                        isActive -> LessonColors.Primary
                        isCompleted -> LessonColors.AnswerBorder
                        else -> LessonColors.Border
                    }
                ),
                modifier = Modifier.semantics {
                    stateDescription = when (phase.state) {
                        PhaseState.COMPLETED -> "${phase.title} tamamlandı"
                        PhaseState.ACTIVE -> "${phase.title} aktif (${phase.activeStepIndexInPhase}/${phase.totalStepsInPhase})"
                        PhaseState.UPCOMING -> "${phase.title} sırada"
                    }
                }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (isCompleted) {
                        Surface(
                            modifier = Modifier.size(16.dp),
                            shape = CircleShape,
                            color = LessonColors.AnswerText
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "✓",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Text(
                        text = phase.title,
                        style = MaterialTheme.typography.labelMedium,
                        color = when {
                            isActive -> Color.White
                            isCompleted -> LessonColors.AnswerText
                            else -> LessonColors.TextSecondary
                        },
                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium
                    )

                    if (isActive) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color.White.copy(alpha = 0.25f)
                        ) {
                            Text(
                                text = "${phase.activeStepIndexInPhase}/${phase.totalStepsInPhase}",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }
            }

            if (index < phases.lastIndex) {
                Text(
                    text = "→",
                    style = MaterialTheme.typography.labelMedium,
                    color = LessonColors.TextSecondary
                )
            }
        }
    }
}
