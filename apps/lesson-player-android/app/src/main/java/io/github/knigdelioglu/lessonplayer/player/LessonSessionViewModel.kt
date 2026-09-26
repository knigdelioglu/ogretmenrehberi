package io.github.knigdelioglu.lessonplayer.player

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.storage.ClassGroup
import io.github.knigdelioglu.lessonplayer.storage.ClassLessonProgressRow
import io.github.knigdelioglu.lessonplayer.storage.LessonBackupCodec
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonPreferences
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

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
    data class Ready(
        val classGroup: ClassGroup,
        val session: LessonSession
    ) : LessonSessionUiState
    data class Error(val message: String) : LessonSessionUiState
}

/**
 * Single writer: IO completes before presenting a state change. If persistence fails
 * the previous state stays visible and the teacher receives an explicit error.
 * Class group changes and commands are protected by mutex to prevent cross-group state races.
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

    private val mutableClassGroups = MutableStateFlow<List<ClassGroup>>(emptyList())
    val classGroups: StateFlow<List<ClassGroup>> = mutableClassGroups.asStateFlow()

    private val mutableLegacyMigrationPending = MutableStateFlow(false)
    val legacyMigrationPending: StateFlow<Boolean> = mutableLegacyMigrationPending.asStateFlow()

    // Map: classGroupId -> (lessonId -> ClassLessonProgressRow)
    private val mutableAllGroupsProgress = MutableStateFlow<Map<String, Map<String, ClassLessonProgressRow>>>(emptyMap())
    val allGroupsProgress: StateFlow<Map<String, Map<String, ClassLessonProgressRow>>> =
        mutableAllGroupsProgress.asStateFlow()

    private var lastFailedCommand: LessonCommand? = null
    private var lastFailedLessonId: String? = null

    fun initialize(bundle: LessonBundle) {
        viewModelScope.launch {
            mutex.withLock {
                if (currentBundle?.contentSha256 == bundle.contentSha256 &&
                    mutableState.value is LessonSessionUiState.Ready) return@withLock
                mutableState.value = LessonSessionUiState.Loading
                try {
                    val groups = store.activeClassGroups()
                    mutableClassGroups.value = groups

                    val hasLegacy = store.legacyProgress().isNotEmpty()
                    mutableLegacyMigrationPending.value = hasLegacy

                    val preferredGroupId = preferences.activeClassGroupId.first()
                    val activeGroup = groups.firstOrNull { it.id == preferredGroupId } ?: groups.first()
                    preferences.setActiveClassGroupId(activeGroup.id)

                    val preferredLesson = preferences.lastLessonForGroup(activeGroup.id).first()
                    val chosen = bundle.byId[preferredLesson] ?: bundle.lessons.first()
                    val saved = store.restore(activeGroup.id, chosen, bundle.lessonDigest(chosen.lessonId))
                    val mode = preferences.presentationMode.first()
                    currentBundle = bundle
                    mutableState.value = LessonSessionUiState.Ready(
                        classGroup = activeGroup,
                        session = saved.copy(presentationMode = mode)
                    )
                    refreshProgressSummary()
                } catch (error: Exception) {
                    mutableState.value = LessonSessionUiState.Error(
                        "Kaydedilmiş ders durumu yüklenemedi: ${error.message}")
                }
            }
        }
    }

    fun selectClassGroup(groupId: String) {
        if (mutableActionState.value.busy) return
        mutableActionState.value = LessonActionUiState(busy = true)
        viewModelScope.launch {
            mutex.withLock {
                val bundle = currentBundle ?: run {
                    failAction("Ders paketi henüz hazır değil.")
                    return@withLock
                }
                val groups = store.activeClassGroups()
                mutableClassGroups.value = groups
                val targetGroup = groups.firstOrNull { it.id == groupId } ?: run {
                    failAction("Ders grubu bulunamadı.")
                    return@withLock
                }
                val currentReady = mutableState.value as? LessonSessionUiState.Ready
                if (currentReady?.classGroup?.id == groupId) {
                    clearAction()
                    return@withLock
                }

                try {
                    preferences.setActiveClassGroupId(groupId)
                    val preferredLesson = preferences.lastLessonForGroup(groupId).first()
                    val chosen = bundle.byId[preferredLesson]
                        ?: currentReady?.session?.lessonId?.let { bundle.byId[it] }
                        ?: bundle.lessons.first()
                    val restored = store.restore(groupId, chosen, bundle.lessonDigest(chosen.lessonId))
                    val mode = preferences.presentationMode.first()
                    mutableState.value = LessonSessionUiState.Ready(
                        classGroup = targetGroup,
                        session = restored.copy(presentationMode = mode)
                    )
                    refreshProgressSummary()
                    clearAction()
                } catch (error: Exception) {
                    failAction("Şube oturumu açılamadı: ${error.message}")
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
                val ready = mutableState.value as? LessonSessionUiState.Ready ?: run {
                    failAction("Oturum hazır değil.")
                    return@withLock
                }
                val bundle = currentBundle ?: run {
                    failAction("Ders paketi henüz hazır değil.")
                    return@withLock
                }
                val lesson = bundle.byId[id] ?: run {
                    failAction("Ders bulunamadı. Önceki ders korunuyor.")
                    return@withLock
                }
                try {
                    val session = store.restore(ready.classGroup.id, lesson, bundle.lessonDigest(lesson.lessonId))
                        .copy(presentationMode = preferences.presentationMode.first())
                    preferences.rememberLesson(ready.classGroup.id, id)
                    mutableState.value = ready.copy(session = session)
                    refreshProgressSummary()
                    clearAction()
                } catch (error: Exception) {
                    lastFailedLessonId = id
                    failAction("Ders açılamadı. Önceki ders korunuyor.")
                }
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
                    store.save(ready.classGroup.id, next)
                    if (command is LessonCommand.SetPresentationMode) {
                        preferences.setPresentationMode(command.enabled)
                    }
                    mutableState.value = ready.copy(session = next)
                    refreshProgressSummary()
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

    fun resolveLegacyMigration(targetGroupId: String?) {
        viewModelScope.launch {
            mutex.withLock {
                try {
                    store.assignLegacyProgress(targetGroupId)
                    mutableLegacyMigrationPending.value = false
                    val ready = mutableState.value as? LessonSessionUiState.Ready
                    val bundle = currentBundle
                    if (ready != null && bundle != null) {
                        val activeGroup = ready.classGroup
                        val preferredLesson = preferences.lastLessonForGroup(activeGroup.id).first()
                        val chosen = bundle.byId[preferredLesson] ?: bundle.byId[ready.session.lessonId] ?: bundle.lessons.first()
                        val restored = store.restore(activeGroup.id, chosen, bundle.lessonDigest(chosen.lessonId))
                        mutableState.value = ready.copy(session = restored.copy(presentationMode = preferences.presentationMode.first()))
                    }
                    refreshProgressSummary()
                } catch (error: Exception) {
                    failAction("Eski kayıt aktarılamadı: ${error.message}")
                }
            }
        }
    }

    fun addClassGroup(grade: Int, section: String, displayName: String) {
        viewModelScope.launch {
            mutex.withLock {
                try {
                    val sec = section.trim().uppercase()
                    val cleanGrade = grade.coerceIn(1, 12)
                    val id = "$cleanGrade$sec"
                    val all = store.allClassGroups()
                    val maxSort = (all.maxOfOrNull { it.sortOrder } ?: 0) + 1
                    val name = displayName.trim().ifBlank { id }
                    val newGroup = ClassGroup(
                        id = id,
                        academicYear = "2026-2027",
                        grade = cleanGrade,
                        section = sec,
                        displayName = name,
                        archived = false,
                        sortOrder = maxSort
                    )
                    store.saveClassGroup(newGroup)
                    val updated = store.activeClassGroups()
                    mutableClassGroups.value = updated

                    // Switch to the newly created class group
                    preferences.setActiveClassGroupId(newGroup.id)
                    val bundle = currentBundle
                    if (bundle != null) {
                        val chosen = bundle.lessons.first()
                        val restored = store.restore(newGroup.id, chosen, bundle.lessonDigest(chosen.lessonId))
                        mutableState.value = LessonSessionUiState.Ready(
                            classGroup = newGroup,
                            session = restored.copy(presentationMode = preferences.presentationMode.first())
                        )
                    }
                    refreshProgressSummary()
                } catch (error: Exception) {
                    failAction("Şube eklenemedi: ${error.message}")
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
                    val groups = store.activeClassGroups()
                    mutableClassGroups.value = groups
                    val preferredGroup = groups.first()
                    preferences.setActiveClassGroupId(preferredGroup.id)
                    val preferredLesson = preferences.lastLessonForGroup(preferredGroup.id).first()
                    val chosen = bundle.byId[preferredLesson] ?: bundle.lessons.first()
                    val restored = store.restore(preferredGroup.id, chosen, bundle.lessonDigest(chosen.lessonId))
                    mutableState.value = LessonSessionUiState.Ready(
                        classGroup = preferredGroup,
                        session = restored.copy(presentationMode = preferences.presentationMode.first())
                    )
                    refreshProgressSummary()
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

    private suspend fun refreshProgressSummary() {
        val allProgress = store.allClassProgress()
        mutableAllGroupsProgress.value = allProgress
            .groupBy { it.classGroupId }
            .mapValues { (_, list) -> list.associateBy { it.lessonId } }
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
