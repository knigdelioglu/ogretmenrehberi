package io.github.knigdelioglu.lessonplayer.player

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonPreferences
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface LessonSessionUiState {
    data object Loading : LessonSessionUiState
    data class Ready(val session: LessonSession) : LessonSessionUiState
    data class Error(val message: String) : LessonSessionUiState
}

/**
 * Single writer: IO completes before presenting a state change. If persistence fails
 * the previous state stays visible and the teacher receives an explicit error.
 */
class LessonSessionViewModel(application: Application) : AndroidViewModel(application) {
    private val store = LessonStore(LessonDatabase.get(application))
    private val preferences = LessonPreferences(application)
    private val mutex = Mutex()
    private var currentBundle: LessonBundle? = null
    private val mutableState = MutableStateFlow<LessonSessionUiState>(LessonSessionUiState.Loading)
    val state: StateFlow<LessonSessionUiState> = mutableState.asStateFlow()

    fun initialize(bundle: LessonBundle) {
        viewModelScope.launch {
            mutex.withLock {
                if (currentBundle?.contentSha256 == bundle.contentSha256 &&
                    mutableState.value is LessonSessionUiState.Ready) return@withLock
                mutableState.value = LessonSessionUiState.Loading
                try {
                    val preferred = preferences.lastLessonId.first()
                    val chosen = bundle.byId[preferred] ?: bundle.lessons.first()
                    val saved = store.restore(chosen, bundle.lessonDigest(chosen.lessonId))
                    val mode = preferences.presentationMode.first()
                    currentBundle = bundle
                    mutableState.value = LessonSessionUiState.Ready(
                        saved.copy(presentationMode = mode))
                } catch (error: Exception) {
                    mutableState.value = LessonSessionUiState.Error(
                        "Kaydedilmiş ders durumu yüklenemedi: ${error.message}")
                }
            }
        }
    }

    fun openLesson(id: String) {
        viewModelScope.launch {
            mutex.withLock {
                val bundle = currentBundle ?: return@withLock
                val lesson = bundle.byId[id] ?: return@withLock
                try {
                    val session = store.restore(lesson, bundle.lessonDigest(lesson.lessonId))
                        .copy(presentationMode = preferences.presentationMode.first())
                    // Prefer persisted selection only after a successful restore.
                    preferences.rememberLesson(id)
                    mutableState.value = LessonSessionUiState.Ready(session)
                } catch (error: Exception) {
                    mutableState.value = LessonSessionUiState.Error(
                        "Ders açılamadı: ${error.message}")
                }
            }
        }
    }

    fun dispatch(command: LessonCommand) {
        viewModelScope.launch {
            mutex.withLock {
                val ready = mutableState.value as? LessonSessionUiState.Ready
                    ?: return@withLock
                val bundle = currentBundle ?: return@withLock
                val lesson = bundle.byId[ready.session.lessonId] ?: return@withLock
                try {
                    val next = LessonEngine.reduce(ready.session, lesson, command)
                    if (next == ready.session) return@withLock
                    // Persist progress/customization first, never reset on bootstrap.
                    store.save(next)
                    if (command is LessonCommand.SetPresentationMode) {
                        preferences.setPresentationMode(command.enabled)
                    }
                    mutableState.value = LessonSessionUiState.Ready(next)
                } catch (error: Exception) {
                    mutableState.value = LessonSessionUiState.Error(
                        "İşlem kaydedilemedi: ${error.message}")
                }
            }
        }
    }
}
