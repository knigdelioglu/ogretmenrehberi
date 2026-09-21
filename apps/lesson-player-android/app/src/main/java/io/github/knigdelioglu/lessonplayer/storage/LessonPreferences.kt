package io.github.knigdelioglu.lessonplayer.storage

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.lessonDataStore by preferencesDataStore(name = "lesson_player_settings")

/** Simple display preferences; teacher edits and progress live in Room instead. */
class LessonPreferences(private val context: Context) {
    private val lastLesson = stringPreferencesKey("last_lesson_id")
    private val presentation = booleanPreferencesKey("presentation_mode")

    val lastLessonId: Flow<String?> =
        context.lessonDataStore.data.map { it[lastLesson] }

    val presentationMode: Flow<Boolean> =
        context.lessonDataStore.data.map { it[presentation] ?: false }

    suspend fun rememberLesson(id: String) {
        context.lessonDataStore.edit { it[lastLesson] = id }
    }

    suspend fun setPresentationMode(value: Boolean) {
        context.lessonDataStore.edit { it[presentation] = value }
    }
}
