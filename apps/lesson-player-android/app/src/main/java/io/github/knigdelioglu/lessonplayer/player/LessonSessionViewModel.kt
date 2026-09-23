package io.github.knigdelioglu.lessonplayer.player

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.storage.LessonBackupCodec
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonPreferences
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class BackupUiState(
    val busy: Boolean = false,
    val message: String? = null,
    val isError: Boolean = false
)

data class LessonActionUiState(
    val busy: Boolean = false,
    val message: String? = null,
    val isError: Boolean = false
)

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
    private val mutableBackupState = MutableStateFlow(BackupUiState())
    val backupState: StateFlow<BackupUiState> = mutableBackupState.asStateFlow()
    private val mutableActionState = MutableStateFlow(LessonActionUiState())
    val actionState: StateFlow<LessonActionUiState> = mutableActionState.asStateFlow()
    val presentationTextSize = preferences.presentationTextSize
    private var lastFailedCommand: LessonCommand? = null
    private var lastFailedLessonId: String? = null

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
        if (mutableActionState.value.busy) return
        lastFailedCommand = null
        lastFailedLessonId = null
        mutableActionState.value = LessonActionUiState(busy = true)
        viewModelScope.launch {
            mutex.withLock {
                val bundle = currentBundle ?: run {
                    failAction("Ders paketi henüz hazır değil.")
                    return@withLock
                }
                val lesson = bundle.byId[id] ?: run {
                    failAction("Ders bulunamadı. Önceki ders korunuyor.")
                    return@withLock
                }
                try {
                    val session = store.restore(lesson, bundle.lessonDigest(lesson.lessonId))
                        .copy(presentationMode = preferences.presentationMode.first())
                    // Prefer persisted selection only after a successful restore.
                    preferences.rememberLesson(id)
                    mutableState.value = LessonSessionUiState.Ready(session)
                    clearAction()
                } catch (error: Exception) {
                    lastFailedLessonId = id
                    failAction("Ders açılamadı. Önceki ders korunuyor.")
                }
            }
        }
    }

    fun exportBackup(uri: Uri, passphrase: String) {
        viewModelScope.launch {
            mutableBackupState.value = BackupUiState(busy = true)
            try {
                val bundle = currentBundle ?: error("Ders paketi henüz hazır değil")
                val snapshot = withContext(Dispatchers.IO) { store.exportBackupSnapshot() }
                val raw = withContext(Dispatchers.Default) {
                    LessonBackupCodec.encode(
                        snapshot = snapshot,
                        passphrase = passphrase.toCharArray(),
                        contentSignature = bundle.contentSha256,
                        workflowSignature = bundle.workflowSha256
                    )
                }
                withContext(Dispatchers.IO) {
                    getApplication<Application>().contentResolver.openOutputStream(uri)
                        ?.use { it.write(raw.toByteArray(Charsets.UTF_8)) }
                        ?: error("Yedek dosyası yazılamadı")
                }
                mutableBackupState.value = BackupUiState(message = "Yedek dışa aktarıldı")
            } catch (error: Exception) {
                mutableBackupState.value = BackupUiState(
                    message = error.message ?: "Yedek dışa aktarılamadı",
                    isError = true
                )
            }
        }
    }

    fun importBackup(uri: Uri, passphrase: String) {
        viewModelScope.launch {
            mutableBackupState.value = BackupUiState(busy = true)
            try {
                val bundle = currentBundle ?: error("Ders paketi henüz hazır değil")
                val raw = withContext(Dispatchers.IO) {
                    getApplication<Application>().contentResolver.openInputStream(uri)
                        ?.use { input ->
                            val bytes = input.readBytes()
                            require(bytes.size <= 10 * 1024 * 1024) { "Yedek dosyası çok büyük" }
                            String(bytes, Charsets.UTF_8)
                        } ?: error("Yedek dosyası okunamadı")
                }
                val snapshot = withContext(Dispatchers.Default) {
                    LessonBackupCodec.decode(
                        raw = raw,
                        passphrase = passphrase.toCharArray(),
                        expectedContentSignature = bundle.contentSha256,
                        expectedWorkflowSignature = bundle.workflowSha256
                    )
                }
                mutex.withLock {
                    store.importBackupSnapshot(snapshot, bundle)
                    val preferred = preferences.lastLessonId.first()
                    val chosen = bundle.byId[preferred] ?: bundle.lessons.first()
                    val restored = store.restore(chosen, bundle.lessonDigest(chosen.lessonId))
                    mutableState.value = LessonSessionUiState.Ready(
                        restored.copy(presentationMode = preferences.presentationMode.first())
                    )
                }
                mutableBackupState.value = BackupUiState(message = "Yedek geri yüklendi")
            } catch (error: Exception) {
                mutableBackupState.value = BackupUiState(
                    message = error.message ?: "Yedek geri yüklenemedi",
                    isError = true
                )
            }
        }
    }

    fun dispatch(command: LessonCommand) {
        if (mutableActionState.value.busy ||
            mutableState.value !is LessonSessionUiState.Ready ||
            currentBundle == null
        ) return
        mutableActionState.value = LessonActionUiState(busy = true)
        viewModelScope.launch {
            mutex.withLock {
                val ready = mutableState.value as? LessonSessionUiState.Ready
                    ?: run {
                        clearAction()
                        return@withLock
                    }
                val bundle = currentBundle ?: run {
                    failAction("Ders paketi henüz hazır değil.")
                    return@withLock
                }
                val lesson = bundle.byId[ready.session.lessonId] ?: run {
                    failAction("Ders bulunamadı. Önceki durum korundu.")
                    return@withLock
                }
                try {
                    val next = LessonEngine.reduce(ready.session, lesson, command)
                    if (next == ready.session) {
                        clearAction()
                        return@withLock
                    }
                    // Persist progress/customization first, never reset on bootstrap.
                    store.save(next)
                    if (command is LessonCommand.SetPresentationMode) {
                        preferences.setPresentationMode(command.enabled)
                    }
                    mutableState.value = LessonSessionUiState.Ready(next)
                    lastFailedCommand = null
                    lastFailedLessonId = null
                    clearAction()
                } catch (error: Exception) {
                    lastFailedCommand = command
                    lastFailedLessonId = null
                    failAction("İşlem kaydedilemedi. Önceki durum korundu.")
                }
            }
        }
    }

    fun retryLastAction() {
        lastFailedCommand?.let(::dispatch)
            ?: lastFailedLessonId?.let(::openLesson)
    }

    fun setPresentationTextSize(value: PresentationTextSize) {
        viewModelScope.launch {
            preferences.setPresentationTextSize(value)
        }
    }

    private fun clearAction() {
        mutableActionState.value = LessonActionUiState()
    }

    private fun failAction(message: String) {
        mutableActionState.value = LessonActionUiState(
            message = message,
            isError = true
        )
    }
}
