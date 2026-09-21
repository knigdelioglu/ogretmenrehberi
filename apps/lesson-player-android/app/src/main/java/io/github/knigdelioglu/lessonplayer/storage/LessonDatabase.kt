package io.github.knigdelioglu.lessonplayer.storage

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert

/** User state only. Canonical content stays immutable in validated APK assets. */
@Entity(tableName = "lesson_progress")
data class ProgressRow(
    @PrimaryKey val lessonId: String,
    val contentDigest: String,
    val stepId: String,
    val stepOrderJson: String,
    val overridesJson: String,
    val updatedAtMillis: Long
)

@Entity(tableName = "archived_lesson_progress")
data class ArchivedProgressRow(
    @PrimaryKey(autoGenerate = true) val archiveId: Long = 0,
    val lessonId: String,
    val contentDigest: String,
    val stepId: String,
    val stepOrderJson: String,
    val overridesJson: String,
    val archivedAtMillis: Long,
    val reason: String
)

@Entity(tableName = "teacher_marks", primaryKeys = ["academicYear", "track", "itemId"])
data class TeacherMarkRow(
    val academicYear: String,
    val track: String,
    val itemId: String,
    val checked: Boolean
)

@Dao
interface LessonDao {
    @Query("SELECT * FROM lesson_progress WHERE lessonId = :lessonId LIMIT 1")
    suspend fun readProgress(lessonId: String): ProgressRow?

    @Upsert
    suspend fun upsertProgress(row: ProgressRow)

    @Query("DELETE FROM lesson_progress WHERE lessonId = :lessonId")
    suspend fun deleteProgress(lessonId: String)

    @Insert
    suspend fun archiveProgress(row: ArchivedProgressRow)

    @Query("SELECT * FROM archived_lesson_progress WHERE lessonId = :lessonId ORDER BY archiveId DESC")
    suspend fun archived(lessonId: String): List<ArchivedProgressRow>

    @Query("SELECT * FROM teacher_marks WHERE academicYear = :academicYear AND track = :track")
    suspend fun marks(academicYear: String, track: String): List<TeacherMarkRow>

    @Upsert
    suspend fun upsertMark(row: TeacherMarkRow)
}

@Database(
    entities = [ProgressRow::class, ArchivedProgressRow::class, TeacherMarkRow::class],
    version = 1,
    exportSchema = true
)
abstract class LessonDatabase : RoomDatabase() {
    abstract fun dao(): LessonDao

    companion object {
        @Volatile private var instance: LessonDatabase? = null

        fun get(context: Context): LessonDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    LessonDatabase::class.java, "lesson-player.db"
                ).build().also { instance = it }
            }
    }
}
