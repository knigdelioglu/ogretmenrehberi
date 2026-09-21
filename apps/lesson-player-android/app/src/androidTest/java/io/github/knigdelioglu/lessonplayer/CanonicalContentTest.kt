package io.github.knigdelioglu.lessonplayer

import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class CanonicalContentTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private fun bytes(name: String): ByteArray =
        context.assets.open("lesson-player/$name").use { it.readBytes() }

    @Test
    fun allThemesLessonsStepsAndWorkflowOpenFromApkAssets() = runBlocking {
        val bundle = ContentRepository(context).load()
        assertEquals(48, bundle.lessons.size)
        assertEquals(914, bundle.lessons.sumOf { it.steps.size })
        assertEquals(listOf(7, 9, 18, 14), (1..4).map {
            bundle.byTheme["TEMA_0$it"]?.size
        })
        assertEquals(bundle.lessons.size, bundle.byId.size)
        assertEquals(8, bundle.workflow.themes.sumOf { it.tasks.size })
        assertEquals(5, bundle.workflow.annualItems.size)
        assertEquals(64, bundle.contentSha256.length)
        assertEquals(48, bundle.lessonSha256.size)
        assertEquals(bundle.byId.keys, bundle.lessonSha256.keys)
        assertTrue(bundle.lessonSha256.values.all { it.matches(Regex("[0-9a-f]{64}")) })
        bundle.lessons.forEach { lesson ->
            assertEquals(lesson.steps.size, lesson.steps.map { it.id }.distinct().size)
            assertTrue(lesson.steps.all { it.source.sourceStatus == "VERIFIED" })
        }
    }

    @Test
    fun realSourceLayoutNoteAndRecursiveAnswerStructuresSurvive() = runBlocking {
        val bundle = ContentRepository(context).load()
        val karagoz = bundle.byId.getValue("T11-T01-KARAGOZ")
        val note = karagoz.steps.first { it.id == "s26-reference" }
        assertTrue(note.content?.note?.contains("kitap örneklerini") == true)
        assertEquals(LayoutKind.REFERENCE, note.layout)
        assertEquals(4, note.content?.sections?.size)
        val vocabulary = karagoz.steps.first { it.id == "s25-q1" }
        assertEquals(LayoutKind.VOCABULARY, vocabulary.layout)
        assertTrue(vocabulary.answer?.answerSections is JsonValue.Object)
        val misleadingName = bundle.byId.getValue("T11-T04-MERDIVEN-ANLAMA-266-270")
            .steps.first { it.id == "s266-vocabulary" }
        assertEquals(LayoutKind.STRUCTURE, misleadingName.layout)
        assertNotNull(misleadingName.answer)
        assertTrue(bundle.lessons.flatMap { it.steps }.any { it.answer?.answerSections is JsonValue.Array ||
            it.answer?.answerSections is JsonValue.Object })
    }

    @Test
    fun answerTamperingAndManifestTamperingFailClosed() {
        val lessons = bytes("lessons.json")
        val workflow = bytes("teacher-workflow.json")
        val manifest = bytes("content-manifest.json")
        val modified = lessons.copyOf()
        modified[modified.size / 2] = (modified[modified.size / 2].toInt() xor 1).toByte()
        assertThrows(IllegalArgumentException::class.java) {
            ContentRepository.decode(modified, workflow, manifest)
        }
        val modifiedWorkflow = workflow.copyOf()
        modifiedWorkflow[10] = (modifiedWorkflow[10].toInt() xor 1).toByte()
        assertThrows(IllegalArgumentException::class.java) {
            ContentRepository.decode(lessons, modifiedWorkflow, manifest)
        }
        val restored = ContentRepository.decode(lessons, workflow, manifest)
        assertEquals(ContentRepository.sha256(lessons), restored.contentSha256)
        assertEquals(ContentRepository.sha256(workflow), restored.workflowSha256)
    }
}
