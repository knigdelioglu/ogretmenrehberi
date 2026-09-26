package io.github.knigdelioglu.lessonplayer

import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.ContentSource
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import android.content.Context
import io.github.knigdelioglu.lessonplayer.storage.ClassGroup
import io.github.knigdelioglu.lessonplayer.storage.LessonCustomizationRow
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import io.github.knigdelioglu.lessonplayer.storage.MIGRATION_1_2
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.util.UUID

class LessonStorageTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private fun offlineRepository() = ContentRepository(
        context, remoteSource = ContentSource { throw IOException("offline test") }
    )

    @Test
    fun progressAndCustomEditsSurviveRestartByStableStepId() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val first = lesson.steps.first()
            val second = lesson.steps[1]
            val contentStep = lesson.steps.first { it.content != null }
            val originalContent = contentStep.content!!
            val editedContent = originalContent.copy(
                lead = "Yerel giriş",
                items = listOf("Yerel süreç maddesi")
            )
            var session = LessonEngine.initial(lesson, bundle.lessonDigest(lesson.lessonId))
            session = LessonEngine.reduce(session, lesson, LessonCommand.GoToStep(second.id))
            session = LessonEngine.reduce(session, lesson,
                LessonCommand.MoveStep(second.id, -1))
            session = LessonEngine.reduce(session, lesson,
                LessonCommand.ApplyOverride(second.id,
                    StepOverride(displayPrompt = "Öğretmen sunum düzeni")))
            session = LessonEngine.reduce(session, lesson,
                LessonCommand.ApplyOverride(
                    contentStep.id,
                    StepOverride(content = editedContent, hasContentOverride = true)
                ))
            store.save(session)
            val restored = store.restore(lesson, bundle.lessonDigest(lesson.lessonId))
            assertEquals(second.id, restored.stepId)
            assertEquals(second.id, restored.order[0])
            assertEquals(first.id, restored.order[1])
            assertEquals("Öğretmen sunum düzeni",
                restored.overrides[second.id]?.displayPrompt)
            assertEquals("Yerel giriş",
                restored.overrides[contentStep.id]?.content?.lead)
            assertEquals(listOf("Yerel süreç maddesi"),
                restored.overrides[contentStep.id]?.content?.items)
            assertEquals(originalContent.note,
                restored.overrides[contentStep.id]?.content?.note)
            assertEquals(0, store.archived(lesson.lessonId).size)
        } finally {
            database.close()
        }
    }

    @Test
    fun contentUpdateArchivesOldSnapshotAndKeepsStableStepProgress() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val original = LessonEngine.initial(lesson, bundle.lessonDigest(lesson.lessonId))
            val second = lesson.steps[1]
            var saved = LessonEngine.reduce(original, lesson,
                LessonCommand.GoToStep(second.id))
            saved = LessonEngine.reduce(saved, lesson, LessonCommand.MoveStep(second.id, -1))
            saved = LessonEngine.reduce(saved, lesson, LessonCommand.ApplyOverride(
                second.id, StepOverride(displayPrompt = "Kaldığım sorunun öğretmen düzeni")
            ))
            store.save(saved)
            val revisedDigest = "new-content-digest"
            val inserted = lesson.steps.first().copy(
                id = "s15-new-step",
                displayPrompt = "Yeni eklenen adım"
            )
            val revisedLesson = lesson.copy(
                steps = lesson.steps.take(1) + inserted + lesson.steps.drop(1)
            )
            val restored = store.restore(revisedLesson, revisedDigest)
            assertEquals(second.id, restored.stepId)
            assertEquals(revisedDigest, restored.contentDigest)
            assertEquals(saved.order,
                restored.order.filter { it in saved.order })
            assertTrue(inserted.id in restored.order)
            assertEquals("Kaldığım sorunun öğretmen düzeni",
                restored.overrides[second.id]?.displayPrompt)
            val backup = store.archived(lesson.lessonId).single()
            assertEquals(bundle.lessonDigest(lesson.lessonId), backup.contentDigest)
            assertEquals(second.id, backup.stepId)
            assertEquals("CONTENT_DIGEST_MISMATCH", backup.reason)
            // Re-opening after migration must not create another archive.
            assertEquals(second.id, store.restore(revisedLesson, revisedDigest).stepId)
            assertEquals(1, store.archived(lesson.lessonId).size)
        } finally {
            database.close()
        }
    }

    @Test
    fun eighteenthStepSurvivesApplicationRestart() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        assertTrue("Test lesson must contain at least 18 steps", lesson.steps.size >= 18)
        val target = lesson.steps[17]
        val databaseName = "lesson-restart-${UUID.randomUUID()}.db"
        var database = Room.databaseBuilder(
            context, LessonDatabase::class.java, databaseName
        ).build()
        try {
            val state = LessonEngine.reduce(
                LessonEngine.initial(lesson, bundle.lessonDigest(lesson.lessonId)),
                lesson,
                LessonCommand.GoToStep(target.id)
            )
            LessonStore(database).save(state)
            database.close()
            database = Room.databaseBuilder(
                context, LessonDatabase::class.java, databaseName
            ).build()
            assertEquals(target.id, LessonStore(database)
                .restore(lesson, bundle.lessonDigest(lesson.lessonId)).stepId)
        } finally {
            database.close()
            context.deleteDatabase(databaseName)
        }
    }

    @Test
    fun removedCurrentStepMovesToNextSurvivingStableStep() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val current = lesson.steps[1]
            store.save(LessonEngine.reduce(LessonEngine.initial(
                lesson, bundle.lessonDigest(lesson.lessonId)
            ), lesson, LessonCommand.GoToStep(current.id)))

            val revised = lesson.copy(steps = lesson.steps.filterNot { it.id == current.id })
            val restored = store.restore(revised, "step-removed-digest")
            assertEquals(lesson.steps[2].id, restored.stepId)
            assertFalse(current.id in restored.order)
            assertEquals("step-removed-digest", restored.contentDigest)
        } finally {
            database.close()
        }
    }

    @Test
    fun changesInAnotherLessonDoNotArchiveThisLessonProgress() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val otherLesson = bundle.lessons.first { it.lessonId != lesson.lessonId }
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val ownDigest = bundle.lessonDigest(lesson.lessonId)
            assertTrue(ownDigest != bundle.lessonDigest(otherLesson.lessonId))
            val secondStep = lesson.steps[1].id
            store.save(LessonEngine.reduce(LessonEngine.initial(lesson, ownDigest),
                lesson, LessonCommand.GoToStep(secondStep)))
            // A new APK might have a different global digest because *another*
            // lesson changed; the unaffected lesson retains its own digest.
            val globalDigestAfterUnrelatedEdit = "different-whole-bundle-digest"
            assertTrue(globalDigestAfterUnrelatedEdit != bundle.contentSha256)
            val restored = store.restore(lesson, bundle.lessonDigest(lesson.lessonId))
            assertEquals(secondStep, restored.stepId)
            assertEquals(ownDigest, restored.contentDigest)
            assertTrue(store.archived(lesson.lessonId).isEmpty())
        } finally {
            database.close()
        }
    }

    @Test
    fun malformedOrderIsArchivedAndTeacherMarksAreIndependent() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            database.dao().upsertCustomization(LessonCustomizationRow(
                lessonId = lesson.lessonId,
                contentDigest = bundle.lessonDigest(lesson.lessonId),
                stepOrderJson = "[\"wrong-step\"]",
                overridesJson = "{}",
                updatedAtMillis = 1L
            ))
            assertEquals(lesson.steps.first().id,
                store.restore(lesson, bundle.lessonDigest(lesson.lessonId)).stepId)
            val backup = store.archived(lesson.lessonId).single()
            assertEquals("[\"wrong-step\"]", backup.stepOrderJson)
            assertEquals("INVALID_SAVED_CUSTOMIZATION", backup.reason)
            store.setTeacherMark("2026-2027", "workshop", "t1-speaking", true)
            store.setTeacherMark("2026-2027", "annual", "book-1", true)
            store.setTeacherMark("2027-2028", "workshop", "t1-speaking", true)
            store.setTeacherMark("2026-2027", "workshop", "t1-speaking", false)
            assertFalse("t1-speaking" in store.teacherMarks("2026-2027", "workshop"))
            assertTrue("t1-speaking" in store.teacherMarks("2027-2028", "workshop"))
            assertEquals(setOf("book-1"),
                store.teacherMarks("2026-2027", "annual"))
        } finally {
            database.close()
        }
    }

    @Test
    fun sections11A11B11CMaintainIsolatedStepProgressForSameLesson() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val digest = bundle.lessonDigest(lesson.lessonId)

            val step0 = lesson.steps[0].id
            val step1 = lesson.steps[1].id
            val step2 = lesson.steps[2].id

            // Group 11A is at step 0
            val sessionA = LessonEngine.initial(lesson, digest)
            store.save("11A", sessionA)

            // Group 11B is at step 1
            val sessionB = LessonEngine.reduce(sessionA, lesson, LessonCommand.GoToStep(step1))
            store.save("11B", sessionB)

            // Group 11C is at step 2
            val sessionC = LessonEngine.reduce(sessionA, lesson, LessonCommand.GoToStep(step2))
            store.save("11C", sessionC)

            // Verify isolated restoration
            val restoredA = store.restore("11A", lesson, digest)
            val restoredB = store.restore("11B", lesson, digest)
            val restoredC = store.restore("11C", lesson, digest)

            assertEquals(step0, restoredA.stepId)
            assertEquals(step1, restoredB.stepId)
            assertEquals(step2, restoredC.stepId)

            // Advance 11A to step 5; verify 11B and 11C are completely unaffected
            val step5 = lesson.steps[5].id
            val advancedA = LessonEngine.reduce(restoredA, lesson, LessonCommand.GoToStep(step5))
            store.save("11A", advancedA)

            assertEquals(step5, store.restore("11A", lesson, digest).stepId)
            assertEquals(step1, store.restore("11B", lesson, digest).stepId)
            assertEquals(step2, store.restore("11C", lesson, digest).stepId)
        } finally {
            database.close()
        }
    }

    @Test
    fun teacherLessonCustomizationsAreSharedAcrossAllSections() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val digest = bundle.lessonDigest(lesson.lessonId)

            // 11B is at step 3, 11C is at step 4
            val step3 = lesson.steps[3].id
            val step4 = lesson.steps[4].id
            store.save("11B", LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson, LessonCommand.GoToStep(step3)))
            store.save("11C", LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson, LessonCommand.GoToStep(step4)))

            // In 11A, the teacher reorders steps (moves step 1 to index 0) and adds an override to step 1
            val step0 = lesson.steps[0].id
            val step1 = lesson.steps[1].id
            var sessionA = LessonEngine.initial(lesson, digest)
            sessionA = LessonEngine.reduce(sessionA, lesson, LessonCommand.GoToStep(step1))
            sessionA = LessonEngine.reduce(sessionA, lesson, LessonCommand.MoveStep(step1, -1))
            sessionA = LessonEngine.reduce(sessionA, lesson, LessonCommand.ApplyOverride(
                step1, StepOverride(displayPrompt = "Şube 11A'da yazılan ortak not")
            ))
            store.save("11A", sessionA)

            // Restoring in 11B and 11C should reflect 11A's customization while preserving their respective progress
            val restoredB = store.restore("11B", lesson, digest)
            val restoredC = store.restore("11C", lesson, digest)

            assertEquals(step1, restoredB.order[0])
            assertEquals(step0, restoredB.order[1])
            assertEquals(step1, restoredC.order[0])
            assertEquals(step0, restoredC.order[1])
            assertEquals("Şube 11A'da yazılan ortak not", restoredB.overrides[step1]?.displayPrompt)
            assertEquals("Şube 11A'da yazılan ortak not", restoredC.overrides[step1]?.displayPrompt)

            // Step positions remain isolated
            assertEquals(step3, restoredB.stepId)
            assertEquals(step4, restoredC.stepId)
        } finally {
            database.close()
        }
    }

    @Test
    fun multiSectionProgressSurvivesDatabaseRestart() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val digest = bundle.lessonDigest(lesson.lessonId)
        val databaseName = "lesson-multisection-restart-${UUID.randomUUID()}.db"
        var database = Room.databaseBuilder(context, LessonDatabase::class.java, databaseName)
            .addMigrations(MIGRATION_1_2)
            .build()
        try {
            val store1 = LessonStore(database)
            val step3 = lesson.steps[3].id
            val step7 = lesson.steps[7].id
            val step11 = lesson.steps[11].id

            store1.save("11A", LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson, LessonCommand.GoToStep(step3)))
            store1.save("11B", LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson, LessonCommand.GoToStep(step7)))
            store1.save("11C", LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson, LessonCommand.GoToStep(step11)))

            database.close()

            database = Room.databaseBuilder(context, LessonDatabase::class.java, databaseName)
                .addMigrations(MIGRATION_1_2)
                .build()
            val store2 = LessonStore(database)

            assertEquals(step3, store2.restore("11A", lesson, digest).stepId)
            assertEquals(step7, store2.restore("11B", lesson, digest).stepId)
            assertEquals(step11, store2.restore("11C", lesson, digest).stepId)
        } finally {
            database.close()
            context.deleteDatabase(databaseName)
        }
    }

    @Test
    fun databaseMigrationV1ToV2PreservesCustomizationAndSupportsLegacyAssignment() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val digest = bundle.lessonDigest(lesson.lessonId)
        val databaseName = "lesson-migration-test-${UUID.randomUUID()}.db"

        // 1. Create SQLite database with v1 schema directly
        val sqlite = context.openOrCreateDatabase(databaseName, Context.MODE_PRIVATE, null)
        sqlite.execSQL("""
            CREATE TABLE IF NOT EXISTS lesson_progress (
                lessonId TEXT PRIMARY KEY NOT NULL,
                contentDigest TEXT NOT NULL,
                stepId TEXT NOT NULL,
                stepOrderJson TEXT NOT NULL,
                overridesJson TEXT NOT NULL,
                updatedAtMillis INTEGER NOT NULL
            )
        """.trimIndent())
        sqlite.execSQL("""
            CREATE TABLE IF NOT EXISTS archived_lesson_progress (
                archiveId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                lessonId TEXT NOT NULL,
                contentDigest TEXT NOT NULL,
                stepId TEXT NOT NULL,
                stepOrderJson TEXT NOT NULL,
                overridesJson TEXT NOT NULL,
                archivedAtMillis INTEGER NOT NULL,
                reason TEXT NOT NULL
            )
        """.trimIndent())
        sqlite.execSQL("""
            CREATE TABLE IF NOT EXISTS teacher_marks (
                academicYear TEXT NOT NULL,
                track TEXT NOT NULL,
                itemId TEXT NOT NULL,
                checked INTEGER NOT NULL,
                PRIMARY KEY(academicYear, track, itemId)
            )
        """.trimIndent())
        sqlite.version = 1

        val targetStep = lesson.steps[6].id
        sqlite.execSQL("""
            INSERT INTO lesson_progress VALUES (
                '${lesson.lessonId}',
                '$digest',
                '$targetStep',
                '["$targetStep"]',
                '{"$targetStep":{"displayPrompt":"v1 migration test prompt"}}',
                1234567890
            )
        """.trimIndent())
        sqlite.close()

        // 2. Open Room database with MIGRATION_1_2
        val database = Room.databaseBuilder(context, LessonDatabase::class.java, databaseName)
            .addMigrations(MIGRATION_1_2)
            .build()
        try {
            val store = LessonStore(database)

            // Class groups should contain defaults 11A, 11B, 11C
            val groups = store.activeClassGroups()
            assertEquals(listOf("11A", "11B", "11C"), groups.map { it.id })

            // Legacy progress should be detected
            assertTrue(store.hasLegacyProgress())

            // Customization should have migrated
            val custom = database.dao().readCustomization(lesson.lessonId)
            assertNotNull(custom)
            assertTrue(custom!!.overridesJson.contains("v1 migration test prompt"))

            // Assign legacy progress to 11B
            store.assignLegacyProgress("11B")
            assertFalse(store.hasLegacyProgress())

            // Verify 11B has the progress
            val restoredB = store.restore("11B", lesson, digest)
            assertEquals(targetStep, restoredB.stepId)

            // 11A was not assigned, so it starts at default first step
            val restoredA = store.restore("11A", lesson, digest)
            assertEquals(lesson.steps.first().id, restoredA.stepId)
        } finally {
            database.close()
            context.deleteDatabase(databaseName)
        }
    }

    @Test
    fun classGroupCrudAndArchiving() = runBlocking {
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val initial = store.activeClassGroups()
            assertEquals(listOf("11A", "11B", "11C"), initial.map { it.id })

            // Add new class group 10A
            val newGroup = ClassGroup(
                id = "10A",
                academicYear = "2026-2027",
                grade = 10,
                section = "A",
                displayName = "10A",
                archived = false,
                sortOrder = 4
            )
            store.saveClassGroup(newGroup)

            val updated = store.activeClassGroups()
            assertTrue(updated.any { it.id == "10A" })

            // Archive 11C
            val group11C = updated.first { it.id == "11C" }
            store.saveClassGroup(group11C.copy(archived = true))

            val activeAfterArchive = store.activeClassGroups()
            assertFalse(activeAfterArchive.any { it.id == "11C" })
            assertTrue(store.allClassGroups().any { it.id == "11C" && it.archived })
        } finally {
            database.close()
        }
    }

    @Test
    fun backupExportWipeImportPreservesMultiSectionData() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson = bundle.byId.getValue("T11-T01-KARAGOZ")
        val digest = bundle.lessonDigest(lesson.lessonId)
        val database = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(database)
            val step2 = lesson.steps[2].id
            val step4 = lesson.steps[4].id

            var sessionA = LessonEngine.initial(lesson, digest)
            sessionA = LessonEngine.reduce(sessionA, lesson, LessonCommand.GoToStep(step2))
            sessionA = LessonEngine.reduce(sessionA, lesson, LessonCommand.ApplyOverride(
                step2, StepOverride(displayPrompt = "Snapshot testi ortak not")
            ))
            store.save("11A", sessionA)

            var sessionB = store.restore("11B", lesson, digest)
            sessionB = LessonEngine.reduce(sessionB, lesson, LessonCommand.GoToStep(step4))
            store.save("11B", sessionB)

            store.setTeacherMark("2026-2027", "annual", "karagoz-okundu", true)

            // Export
            val snapshot = store.exportBackupSnapshot()
            assertEquals(2, snapshot.schemaVersion)
            assertEquals(3, snapshot.classGroups.size)
            assertEquals(2, snapshot.classProgress.size)
            assertEquals(1, snapshot.lessonCustomizations.size)
            assertEquals(1, snapshot.marks.size)

            // Wipe database
            database.dao().deleteAllClassProgress()
            database.dao().deleteAllCustomizations()
            database.dao().deleteAllClassGroups()
            database.dao().deleteAllMarks()

            assertTrue(database.dao().allClassGroups().isEmpty())

            // Import
            store.importBackupSnapshot(snapshot, bundle)

            // Verify all restored
            assertEquals(3, store.activeClassGroups().size)
            val restoredA = store.restore("11A", lesson, digest)
            val restoredB = store.restore("11B", lesson, digest)

            assertEquals(step2, restoredA.stepId)
            assertEquals(step4, restoredB.stepId)
            assertEquals("Snapshot testi ortak not", restoredA.overrides[step2]?.displayPrompt)
            assertEquals("Snapshot testi ortak not", restoredB.overrides[step2]?.displayPrompt)
            assertEquals(setOf("karagoz-okundu"), store.teacherMarks("2026-2027", "annual"))
        } finally {
            database.close()
        }
    }
}
