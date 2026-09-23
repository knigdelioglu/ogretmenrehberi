package io.github.knigdelioglu.lessonplayer.storage

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import io.github.knigdelioglu.lessonplayer.player.PresentationTextSize
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.lessonDataStore by preferencesDataStore(name = "lesson_player_settings")

/** Simple display preferences; teacher edits and progress live in Room instead. */
class LessonPreferences(private val context: Context) {
    private val lastLesson = stringPreferencesKey("last_lesson_id")
    private val presentation = booleanPreferencesKey("presentation_mode")
    private val presentationTextSizeKey = stringPreferencesKey("presentation_text_size")

    val lastLessonId: Flow<String?> =
        context.lessonDataStore.data.map { it[lastLesson] }

    val presentationMode: Flow<Boolean> =
        context.lessonDataStore.data.map { it[presentation] ?: false }

    val presentationTextSize: Flow<PresentationTextSize> = context.lessonDataStore.data.map {
        it[presentationTextSizeKey]?.let { stored ->
            PresentationTextSize.entries.firstOrNull { size -> size.name == stored }
        } ?: PresentationTextSize.NORMAL
    }

    suspend fun rememberLesson(id: String) {
        context.lessonDataStore.edit { it[lastLesson] = id }
    }

    suspend fun setPresentationMode(value: Boolean) {
        context.lessonDataStore.edit { it[presentation] = value }
    }

    suspend fun setPresentationTextSize(value: PresentationTextSize) {
        context.lessonDataStore.edit { it[presentationTextSizeKey] = value.name }
    }
}
