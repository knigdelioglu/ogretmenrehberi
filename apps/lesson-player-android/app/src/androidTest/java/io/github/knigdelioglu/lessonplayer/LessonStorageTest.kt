package io.github.knigdelioglu.lessonplayer

import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.ContentSource
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import io.github.knigdelioglu.lessonplayer.storage.ProgressRow
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
            database.dao().upsertProgress(ProgressRow(
                lessonId = lesson.lessonId,
                contentDigest = bundle.lessonDigest(lesson.lessonId),
                stepId = lesson.steps.first().id,
                stepOrderJson = "[\"wrong-step\"]",
                overridesJson = "{}",
                updatedAtMillis = 1L
            ))
            assertEquals(lesson.steps.first().id,
                store.restore(lesson, bundle.lessonDigest(lesson.lessonId)).stepId)
            val backup = store.archived(lesson.lessonId).single()
            assertEquals("[\"wrong-step\"]", backup.stepOrderJson)
            assertEquals("INVALID_SAVED_STATE", backup.reason)
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
}
