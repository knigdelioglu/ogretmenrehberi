package io.github.knigdelioglu.lessonplayer.player

import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.StepContent

/**
 * Android-independent lesson state machine. Its inputs are immutable canonical content
 * and explicit user intents; it performs no disk IO, navigation or Compose rendering.
 */
data class StepOverride(
    val displayPrompt: String? = null,
    val layout: LayoutKind? = null,
    val density: String? = null,
    val revealOrder: List<RevealKey>? = null,
    val content: StepContent? = null,
    val hasContentOverride: Boolean = false
)

data class LessonSession(
    val lessonId: String,
    val stepId: String,
    val order: List<String>,
    val revealed: Set<RevealKey> = emptySet(),
    val vocabularyTerms: Map<String, Set<String>> = emptyMap(),
    val presentationMode: Boolean = false,
    val overrides: Map<String, StepOverride> = emptyMap(),
    val contentDigest: String
)

sealed interface LessonCommand {
    data class GoToStep(val stepId: String) : LessonCommand
    data object Next : LessonCommand
    data object Previous : LessonCommand
    data object RevealNext : LessonCommand
    data class ToggleReveal(val key: RevealKey) : LessonCommand
    data class ToggleTerm(val stepId: String, val term: String) : LessonCommand
    data class MoveStep(val stepId: String, val delta: Int) : LessonCommand
    data class SetPresentationMode(val enabled: Boolean) : LessonCommand
    data class ApplyOverride(val stepId: String, val patch: StepOverride) : LessonCommand
    data class ResetStep(val stepId: String) : LessonCommand
    data object ResetLessonPresentation : LessonCommand
}

object LessonEngine {
    fun initial(lesson: LessonData, contentDigest: String): LessonSession =
        LessonSession(
            lessonId = lesson.lessonId,
            stepId = lesson.steps.first().id,
            order = lesson.steps.map { it.id },
            contentDigest = contentDigest
        )

    fun validOrder(order: List<String>, lesson: LessonData): Boolean {
        val ids = lesson.steps.map { it.id }
        return order.size == ids.size && order.toSet().size == ids.size &&
            order.toSet() == ids.toSet()
    }

    /** URL step ID, then saved step ID, then clamped legacy numeric index. */
    fun restoredStepId(
        order: List<String>, requested: String?, saved: String?, legacyIndex: Int?
    ): String {
        require(order.isNotEmpty())
        return listOfNotNull(requested, saved).firstOrNull { it in order }
            ?: order[(legacyIndex ?: 0).coerceIn(0, order.lastIndex)]
    }

    fun effectiveStep(step: LessonStep, override: StepOverride?): LessonStep {
        if (override == null) return step
        return step.copy(
            displayPrompt = override.displayPrompt ?: step.displayPrompt,
            layout = override.layout ?: step.layout,
            density = override.density ?: step.density,
            revealOrder = override.revealOrder ?: step.revealOrder,
            content = if (override.hasContentOverride) override.content else step.content
        )
    }

    fun availableKeys(step: LessonStep): Set<RevealKey> = buildSet {
        val answer = step.answer
        if (!answer?.guidance.isNullOrBlank()) add(RevealKey.GUIDANCE)
        if (answer != null) add(RevealKey.ANSWER)
        if (!answer?.evidenceQuotes.isNullOrEmpty()) add(RevealKey.EVIDENCE)
        if (!answer?.explanation.isNullOrBlank()) add(RevealKey.EXPLANATION)
        if (!step.content?.note.isNullOrBlank()) add(RevealKey.NOTE)
    }

    fun reduce(session: LessonSession, lesson: LessonData, command: LessonCommand): LessonSession {
        require(session.lessonId == lesson.lessonId)
        require(validOrder(session.order, lesson)) { "Invalid lesson step permutation" }
        require(session.stepId in session.order) { "Unknown current step" }
        val originalById = lesson.steps.associateBy { it.id }
        fun step(id: String = session.stepId): LessonStep =
            effectiveStep(originalById.getValue(id), session.overrides[id])
        fun navigate(index: Int): LessonSession {
            val target = session.order[index.coerceIn(0, session.order.lastIndex)]
            return if (target == session.stepId) session
                else session.copy(
                    stepId = target,
                    revealed = emptySet(),
                    vocabularyTerms = session.vocabularyTerms - session.stepId
                )
        }
        fun validateOverride(id: String, candidate: StepOverride) {
            val original = originalById.getValue(id)
            val updated = effectiveStep(original, candidate)
            require(updated.displayPrompt.isNotBlank())
            require(updated.density in setOf("large", "comfortable", "compact"))
            require(updated.revealOrder.size == updated.revealOrder.distinct().size &&
                updated.revealOrder.toSet() == availableKeys(updated)) {
                "Invalid reveal order for $id"
            }
            if (updated.layout == LayoutKind.VOCABULARY) {
                require(updated.answer?.answerSections is JsonValue.Object &&
                    updated.answer.answerSections.values.isNotEmpty())
            }
        }
        return when (command) {
            is LessonCommand.GoToStep -> {
                require(command.stepId in session.order) { "Unknown target step" }
                navigate(session.order.indexOf(command.stepId))
            }
            LessonCommand.Next -> navigate(session.order.indexOf(session.stepId) + 1)
            LessonCommand.Previous -> navigate(session.order.indexOf(session.stepId) - 1)
            LessonCommand.RevealNext -> {
                val nextKey = step().revealOrder.firstOrNull { it !in session.revealed }
                if (nextKey == null) navigate(session.order.indexOf(session.stepId) + 1)
                else session.copy(revealed = session.revealed + nextKey)
            }
            is LessonCommand.ToggleReveal -> {
                require(command.key in step().revealOrder) { "Unavailable reveal layer" }
                session.copy(revealed = if (command.key in session.revealed)
                    session.revealed - command.key else session.revealed + command.key)
            }
            is LessonCommand.ToggleTerm -> {
                require(command.stepId == session.stepId)
                val current = step()
                require(current.layout == LayoutKind.VOCABULARY)
                val sections = current.answer?.answerSections as? JsonValue.Object
                    ?: error("Vocabulary requires keyed definitions")
                require(command.term in sections.values) { "Unknown vocabulary term" }
                // Web disables individual term toggles once "answer" reveals all meanings.
                if (RevealKey.ANSWER in session.revealed) session
                else {
                    val terms = session.vocabularyTerms[session.stepId].orEmpty()
                    val updated = if (command.term in terms) terms - command.term
                        else terms + command.term
                    session.copy(vocabularyTerms = session.vocabularyTerms +
                        (session.stepId to updated))
                }
            }
            is LessonCommand.MoveStep -> {
                require(command.stepId == session.stepId && command.delta in setOf(-1, 1))
                val index = session.order.indexOf(command.stepId)
                val target = index + command.delta
                if (target !in session.order.indices) session else {
                    val order = session.order.toMutableList()
                    order[index] = order[target]
                    order[target] = command.stepId
                    session.copy(order = order)
                }
            }
            is LessonCommand.SetPresentationMode ->
                if (command.enabled == session.presentationMode) session
                else session.copy(
                    presentationMode = command.enabled,
                    revealed = emptySet(),
                    vocabularyTerms = emptyMap()
                )
            is LessonCommand.ApplyOverride -> {
                require(command.stepId in originalById)
                val previous = session.overrides[command.stepId]
                val patch = command.patch
                val merged = StepOverride(
                    displayPrompt = patch.displayPrompt ?: previous?.displayPrompt,
                    layout = patch.layout ?: previous?.layout,
                    density = patch.density ?: previous?.density,
                    revealOrder = patch.revealOrder ?: previous?.revealOrder,
                    content = if (patch.hasContentOverride) patch.content else previous?.content,
                    hasContentOverride = patch.hasContentOverride ||
                        (previous?.hasContentOverride == true)
                )
                validateOverride(command.stepId, merged)
                session.copy(overrides = session.overrides + (command.stepId to merged),
                    revealed = if (command.stepId == session.stepId)
                        session.revealed.intersect(
                            effectiveStep(originalById.getValue(command.stepId),
                                merged).revealOrder.toSet()
                        ) else session.revealed)
            }
            is LessonCommand.ResetStep -> {
                require(command.stepId in originalById)
                session.copy(overrides = session.overrides - command.stepId,
                    revealed = if (command.stepId == session.stepId)
                        session.revealed.intersect(originalById.getValue(command.stepId)
                            .revealOrder.toSet()) else session.revealed)
            }
            LessonCommand.ResetLessonPresentation ->
                initial(lesson, session.contentDigest).copy(
                    presentationMode = session.presentationMode)
        }
    }
}

/**
 * Explicit student-facing allowlist. Never serialize LessonSession, LessonStep, or
 * AnswerEntry to a pupil device; their teacher-only fields are intentionally absent here.
 */
data class StudentProjection(
    val lessonId: String,
    val stepId: String,
    val printedPageRange: String,
    val prompt: String?,
    val answerText: String?,
    val answerSections: JsonValue?,
    val guidance: String?,
    val evidenceQuotes: List<String>,
    val explanation: String?,
    val visibleVocabulary: Map<String, JsonValue>
)

fun toStudentProjection(lesson: LessonData, state: LessonSession): StudentProjection {
    require(lesson.lessonId == state.lessonId)
    val original = lesson.steps.first { it.id == state.stepId }
    val effective = LessonEngine.effectiveStep(original, state.overrides[state.stepId])
    val answer = effective.answer
    val showAnswer = RevealKey.ANSWER in state.revealed
    val definitions = if (effective.layout == LayoutKind.VOCABULARY)
        (answer?.answerSections as? JsonValue.Object)?.values.orEmpty() else emptyMap()
    val visible = if (showAnswer) definitions else definitions.filterKeys {
        it in state.vocabularyTerms[state.stepId].orEmpty()
    }
    return StudentProjection(
        lessonId = lesson.lessonId, stepId = state.stepId,
        printedPageRange = effective.source.printedPageRange,
        prompt = if (showAnswer && effective.layout != LayoutKind.VOCABULARY) null
            else effective.displayPrompt,
        answerText = answer?.answer?.takeIf {
            showAnswer && effective.layout != LayoutKind.VOCABULARY
        },
        answerSections = answer?.answerSections?.takeIf {
            showAnswer && effective.layout != LayoutKind.VOCABULARY
        },
        guidance = answer?.guidance?.takeIf { RevealKey.GUIDANCE in state.revealed },
        evidenceQuotes = answer?.evidenceQuotes?.takeIf {
            RevealKey.EVIDENCE in state.revealed
        }.orEmpty(),
        explanation = answer?.explanation?.takeIf {
            RevealKey.EXPLANATION in state.revealed
        },
        visibleVocabulary = visible
    )
}
