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
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** Domain model for a classroom section namespace */
data class ClassGroup(
    val id: String,
    val academicYear: String,
    val grade: Int,
    val section: String,
    val displayName: String,
    val archived: Boolean = false,
    val sortOrder: Int = 0
)

const val DEFAULT_CLASS_GROUP_ID = "11A"

val DEFAULT_CLASS_GROUPS = listOf(
    ClassGroup(
        id = "11A",
        academicYear = "2026-2027",
        grade = 11,
        section = "A",
        displayName = "11A",
        archived = false,
        sortOrder = 1
    ),
    ClassGroup(
        id = "11B",
        academicYear = "2026-2027",
        grade = 11,
        section = "B",
        displayName = "11B",
        archived = false,
        sortOrder = 2
    ),
    ClassGroup(
        id = "11C",
        academicYear = "2026-2027",
        grade = 11,
        section = "C",
        displayName = "11C",
        archived = false,
        sortOrder = 3
    )
)

@Entity(tableName = "class_groups")
data class ClassGroupRow(
    @PrimaryKey val id: String,
    val academicYear: String,
    val grade: Int,
    val section: String,
    val displayName: String,
    val archived: Boolean,
    val sortOrder: Int
)

fun ClassGroupRow.toDomain() = ClassGroup(id, academicYear, grade, section, displayName, archived, sortOrder)
fun ClassGroup.toRow() = ClassGroupRow(id, academicYear, grade, section, displayName, archived, sortOrder)

@Entity(
    tableName = "class_lesson_progress",
    primaryKeys = ["classGroupId", "lessonId"]
)
data class ClassLessonProgressRow(
    val classGroupId: String,
    val lessonId: String,
    val contentDigest: String,
    val stepId: String,
    val updatedAtMillis: Long
)

@Entity(tableName = "lesson_customizations")
data class LessonCustomizationRow(
    @PrimaryKey val lessonId: String,
    val contentDigest: String,
    val stepOrderJson: String,
    val overridesJson: String,
    val updatedAtMillis: Long
)

@Entity(tableName = "legacy_lesson_progress")
data class LegacyProgressRow(
    @PrimaryKey val lessonId: String,
    val contentDigest: String,
    val stepId: String,
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
    @Query("SELECT * FROM class_groups WHERE archived = 0 ORDER BY sortOrder ASC, displayName ASC")
    suspend fun activeClassGroups(): List<ClassGroupRow>

    @Query("SELECT * FROM class_groups ORDER BY sortOrder ASC, displayName ASC")
    suspend fun allClassGroups(): List<ClassGroupRow>

    @Query("SELECT * FROM class_groups WHERE id = :id LIMIT 1")
    suspend fun classGroup(id: String): ClassGroupRow?

    @Upsert
    suspend fun upsertClassGroup(row: ClassGroupRow)

    @Upsert
    suspend fun upsertClassGroups(rows: List<ClassGroupRow>)

    @Query("DELETE FROM class_groups WHERE id = :id")
    suspend fun deleteClassGroup(id: String)

    @Query("DELETE FROM class_groups")
    suspend fun deleteAllClassGroups()

    @Query("SELECT * FROM class_lesson_progress WHERE classGroupId = :classGroupId AND lessonId = :lessonId LIMIT 1")
    suspend fun readClassProgress(classGroupId: String, lessonId: String): ClassLessonProgressRow?

    @Upsert
    suspend fun upsertClassProgress(row: ClassLessonProgressRow)

    @Upsert
    suspend fun upsertClassProgress(rows: List<ClassLessonProgressRow>)

    @Query("SELECT * FROM class_lesson_progress")
    suspend fun allClassProgress(): List<ClassLessonProgressRow>

    @Query("SELECT * FROM class_lesson_progress WHERE classGroupId = :classGroupId")
    suspend fun allClassProgressForGroup(classGroupId: String): List<ClassLessonProgressRow>

    @Query("DELETE FROM class_lesson_progress WHERE classGroupId = :classGroupId AND lessonId = :lessonId")
    suspend fun deleteClassProgress(classGroupId: String, lessonId: String)

    @Query("DELETE FROM class_lesson_progress")
    suspend fun deleteAllClassProgress()

    @Query("SELECT * FROM lesson_customizations WHERE lessonId = :lessonId LIMIT 1")
    suspend fun readCustomization(lessonId: String): LessonCustomizationRow?

    @Upsert
    suspend fun upsertCustomization(row: LessonCustomizationRow)

    @Upsert
    suspend fun upsertCustomizations(rows: List<LessonCustomizationRow>)

    @Query("SELECT * FROM lesson_customizations")
    suspend fun allCustomizations(): List<LessonCustomizationRow>

    @Query("DELETE FROM lesson_customizations WHERE lessonId = :lessonId")
    suspend fun deleteCustomization(lessonId: String)

    @Query("DELETE FROM lesson_customizations")
    suspend fun deleteAllCustomizations()

    @Query("SELECT * FROM legacy_lesson_progress")
    suspend fun allLegacyProgress(): List<LegacyProgressRow>

    @Query("DELETE FROM legacy_lesson_progress WHERE lessonId = :lessonId")
    suspend fun deleteLegacyProgress(lessonId: String)

    @Query("DELETE FROM legacy_lesson_progress")
    suspend fun deleteAllLegacyProgress()

    @Insert
    suspend fun archiveProgress(row: ArchivedProgressRow)

    @Query("SELECT * FROM archived_lesson_progress WHERE lessonId = :lessonId ORDER BY archiveId DESC")
    suspend fun archived(lessonId: String): List<ArchivedProgressRow>

    @Query("SELECT * FROM teacher_marks WHERE academicYear = :academicYear AND track = :track")
    suspend fun marks(academicYear: String, track: String): List<TeacherMarkRow>

    @Query("SELECT * FROM teacher_marks")
    suspend fun allMarks(): List<TeacherMarkRow>

    @Query("DELETE FROM teacher_marks")
    suspend fun deleteAllMarks()

    @Upsert
    suspend fun upsertMarks(rows: List<TeacherMarkRow>)

    @Upsert
    suspend fun upsertMark(row: TeacherMarkRow)
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `class_groups` (
                `id` TEXT NOT NULL,
                `academicYear` TEXT NOT NULL,
                `grade` INTEGER NOT NULL,
                `section` TEXT NOT NULL,
                `displayName` TEXT NOT NULL,
                `archived` INTEGER NOT NULL,
                `sortOrder` INTEGER NOT NULL,
                PRIMARY KEY(`id`)
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `class_lesson_progress` (
                `classGroupId` TEXT NOT NULL,
                `lessonId` TEXT NOT NULL,
                `contentDigest` TEXT NOT NULL,
                `stepId` TEXT NOT NULL,
                `updatedAtMillis` INTEGER NOT NULL,
                PRIMARY KEY(`classGroupId`, `lessonId`)
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `lesson_customizations` (
                `lessonId` TEXT NOT NULL,
                `contentDigest` TEXT NOT NULL,
                `stepOrderJson` TEXT NOT NULL,
                `overridesJson` TEXT NOT NULL,
                `updatedAtMillis` INTEGER NOT NULL,
                PRIMARY KEY(`lessonId`)
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `legacy_lesson_progress` (
                `lessonId` TEXT NOT NULL,
                `contentDigest` TEXT NOT NULL,
                `stepId` TEXT NOT NULL,
                `updatedAtMillis` INTEGER NOT NULL,
                PRIMARY KEY(`lessonId`)
            )
        """.trimIndent())

        db.execSQL("""
            INSERT INTO `lesson_customizations` (`lessonId`, `contentDigest`, `stepOrderJson`, `overridesJson`, `updatedAtMillis`)
            SELECT `lessonId`, `contentDigest`, `stepOrderJson`, `overridesJson`, `updatedAtMillis`
            FROM `lesson_progress`
        """.trimIndent())

        db.execSQL("""
            INSERT INTO `legacy_lesson_progress` (`lessonId`, `contentDigest`, `stepId`, `updatedAtMillis`)
            SELECT `lessonId`, `contentDigest`, `stepId`, `updatedAtMillis`
            FROM `lesson_progress`
        """.trimIndent())

        db.execSQL("""
            INSERT OR IGNORE INTO `class_groups` (`id`, `academicYear`, `grade`, `section`, `displayName`, `archived`, `sortOrder`)
            VALUES 
                ('11A', '2026-2027', 11, 'A', '11A', 0, 1),
                ('11B', '2026-2027', 11, 'B', '11B', 0, 2),
                ('11C', '2026-2027', 11, 'C', '11C', 0, 3)
        """.trimIndent())

        db.execSQL("DROP TABLE `lesson_progress`")
    }
}

@Database(
    entities = [
        ClassGroupRow::class,
        ClassLessonProgressRow::class,
        LessonCustomizationRow::class,
        LegacyProgressRow::class,
        ArchivedProgressRow::class,
        TeacherMarkRow::class
    ],
    version = 2,
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
                )
                .addMigrations(MIGRATION_1_2)
                .build().also { instance = it }
            }
    }
}
