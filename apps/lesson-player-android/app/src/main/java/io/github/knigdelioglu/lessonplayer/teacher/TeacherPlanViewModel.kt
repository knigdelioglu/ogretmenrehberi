package io.github.knigdelioglu.lessonplayer.teacher

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.knigdelioglu.lessonplayer.content.TeacherWorkflow
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

const val TEACHER_PLAN_ACADEMIC_YEAR = "2026-2027"

enum class TeacherTrack(val wire: String) {
    WORKSHOP("workshop"),
    ANNUAL("annual"),
    PORTFOLIO("portfolio")
}

data class TeacherPlanMarks(
    val workshop: Set<String> = emptySet(),
    val annual: Set<String> = emptySet(),
    val portfolio: Set<String> = emptySet()
) {
    fun contains(track: TeacherTrack, itemId: String): Boolean =
        when (track) {
            TeacherTrack.WORKSHOP -> itemId in workshop
            TeacherTrack.ANNUAL -> itemId in annual
            TeacherTrack.PORTFOLIO -> itemId in portfolio
        }

    fun updated(track: TeacherTrack, values: Set<String>): TeacherPlanMarks =
        when (track) {
            TeacherTrack.WORKSHOP -> copy(workshop = values)
            TeacherTrack.ANNUAL -> copy(annual = values)
            TeacherTrack.PORTFOLIO -> copy(portfolio = values)
        }
}

sealed interface TeacherPlanUiState {
    data object Loading : TeacherPlanUiState
    data class Ready(
        val marks: TeacherPlanMarks,
        val warning: String? = null
    ) : TeacherPlanUiState
    data class Error(val message: String) : TeacherPlanUiState
}

/**
 * Persists only the three teacher-plan tracks; it never stores student submissions
 * or grades. Item IDs are allowlisted from the canonical workflow before writes.
 */
class TeacherPlanViewModel(application: Application) : AndroidViewModel(application) {
    private val store = LessonStore(LessonDatabase.get(application))
    private val mutex = Mutex()
    private val mutableState = MutableStateFlow<TeacherPlanUiState>(
        TeacherPlanUiState.Loading
    )
    private var initializedSchema: String? = null
    private var allowed: Map<TeacherTrack, Set<String>> = emptyMap()

    val state: StateFlow<TeacherPlanUiState> = mutableState.asStateFlow()

    fun initialize(workflow: TeacherWorkflow) {
        if (initializedSchema == workflow.schemaVersion &&
            mutableState.value !is TeacherPlanUiState.Error
        ) return

        allowed = allowedMarkIds(workflow)
        initializedSchema = workflow.schemaVersion
        mutableState.value = TeacherPlanUiState.Loading
        viewModelScope.launch {
            mutex.withLock {
                try {
                    val marks = TeacherTrack.entries.associateWith { track ->
                        store.teacherMarks(TEACHER_PLAN_ACADEMIC_YEAR, track.wire)
                    }
                    mutableState.value = TeacherPlanUiState.Ready(
                        TeacherPlanMarks(
                            workshop = marks[TeacherTrack.WORKSHOP].orEmpty(),
                            annual = marks[TeacherTrack.ANNUAL].orEmpty(),
                            portfolio = marks[TeacherTrack.PORTFOLIO].orEmpty()
                        )
                    )
                } catch (error: Exception) {
                    initializedSchema = null
                    mutableState.value = TeacherPlanUiState.Error(
                        "Öğretmen planı yüklenemedi: ${error.message}"
                    )
                }
            }
        }
    }

    fun toggle(track: TeacherTrack, itemId: String) {
        if (itemId !in allowed[track].orEmpty()) return
        viewModelScope.launch {
            mutex.withLock {
                val ready = mutableState.value as? TeacherPlanUiState.Ready
                    ?: return@withLock
                val checked = !ready.marks.contains(track, itemId)
                try {
                    store.setTeacherMark(
                        TEACHER_PLAN_ACADEMIC_YEAR, track.wire, itemId, checked
                    )
                    mutableState.value = ready.copy(
                        marks = ready.marks.updated(
                            track,
                            if (checked) {
                                ready.marksFor(track) + itemId
                            } else {
                                ready.marksFor(track) - itemId
                            }
                        ),
                        warning = null
                    )
                } catch (error: Exception) {
                    mutableState.value = ready.copy(
                        warning = "Plan işareti kaydedilemedi: ${error.message}"
                    )
                }
            }
        }
    }

    private fun TeacherPlanMarks.marksFor(track: TeacherTrack): Set<String> =
        when (track) {
            TeacherTrack.WORKSHOP -> workshop
            TeacherTrack.ANNUAL -> annual
            TeacherTrack.PORTFOLIO -> portfolio
        }

    private fun allowedMarkIds(workflow: TeacherWorkflow): Map<TeacherTrack, Set<String>> =
        mapOf(
            TeacherTrack.WORKSHOP to workflow.themes
                .flatMap { theme -> theme.tasks.map { it.id } }.toSet(),
            TeacherTrack.ANNUAL to workflow.annualItems.map { it.id }.toSet(),
            TeacherTrack.PORTFOLIO to buildSet {
                workflow.themes.forEach { theme ->
                    theme.tasks.forEach { task -> add("task:${task.id}") }
                    add("reflection:${theme.id}")
                }
                workflow.annualItems.forEach { item -> add("annual:${item.id}") }
            }
        )
}
