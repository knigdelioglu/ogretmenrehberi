package io.github.knigdelioglu.lessonplayer

import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.ContentOrigin
import io.github.knigdelioglu.lessonplayer.content.ContentSource
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
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.UUID

class CanonicalContentTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private fun bytes(name: String): ByteArray =
        context.assets.open("lesson-player/$name").use { it.readBytes() }
    private fun offlineRepository() = ContentRepository(
        context, remoteSource = ContentSource { throw IOException("offline test") }
    )

    @Test
    fun canonicalBundleLoadsAndValidates() = runBlocking {
        val loaded = offlineRepository().load()
        val bundle = loaded.bundle
        assertTrue(bundle.lessons.isNotEmpty())
        assertTrue(bundle.lessons.sumOf { it.steps.size } > 0)
        assertEquals(bundle.lessons.size, bundle.byId.size)
        assertEquals(bundle.byTheme.keys, bundle.workflow.themes.map { it.id }.toSet())
        assertEquals(64, bundle.contentSha256.length)
        assertEquals(bundle.lessons.size, bundle.lessonSha256.size)
        assertEquals(bundle.byId.keys, bundle.lessonSha256.keys)
        assertTrue(loaded.statusMessage.isNotBlank())
        assertTrue(bundle.lessonSha256.values.all { it.matches(Regex("[0-9a-f]{64}")) })
        bundle.lessons.forEach { lesson ->
            assertEquals(lesson.steps.size, lesson.steps.map { it.id }.distinct().size)
            assertTrue(lesson.steps.all { it.source.sourceStatus == "VERIFIED" })
        }
    }

    @Test
    fun realSourceLayoutNoteAndRecursiveAnswerStructuresSurvive() = runBlocking {
        val bundle = offlineRepository().load().bundle
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

    @Test
    fun remoteBundleCanAddLessonsAndThemesAndRemainsAvailableOffline() = runBlocking {
        val manifest = JSONObject(bytes("content-manifest.json").toString(Charsets.UTF_8))
        val themeCounts = manifest.getJSONObject("themes")
        val originalThemeCount = themeCounts.length()
        val nextThemeNumber = (themeCounts.keys().asSequence()
            .map { it.removePrefix("TEMA_").toInt() }.maxOrNull() ?: 0) + 1
        val addedThemeId = "TEMA_${nextThemeNumber.toString().padStart(2, '0')}"
        val addedLessonId = "T11-${addedThemeId.removePrefix("TEMA_")}-REMOTE-EXTRA"

        val lessons = JSONArray(bytes("lessons.json").toString(Charsets.UTF_8))
        val addedLesson = JSONObject(lessons.getJSONObject(0).toString()).apply {
            put("lesson_id", addedLessonId)
            put("lesson_slug", "${addedThemeId.lowercase()}-remote-extra")
            put("theme_id", addedThemeId)
        }
        lessons.put(addedLesson)
        val lessonsBytes = lessons.toString().toByteArray(Charsets.UTF_8)

        val workflow = JSONObject(bytes("teacher-workflow.json").toString(Charsets.UTF_8))
        val workflowThemes = workflow.getJSONArray("themes")
        val addedTheme = JSONObject(workflowThemes.getJSONObject(0).toString()).apply {
            put("id", addedThemeId)
            put("title", "Ek Tema")
            put("tasks", JSONArray())
        }
        workflowThemes.put(addedTheme)
        val workflowBytes = workflow.toString().toByteArray(Charsets.UTF_8)

        manifest.put("contentSha256", ContentRepository.sha256(lessonsBytes))
        manifest.put("workflowSha256", ContentRepository.sha256(workflowBytes))
        val counts = manifest.getJSONObject("counts")
        counts.put("lessons", counts.getInt("lessons") + 1)
        counts.put("steps", counts.getInt("steps") + addedLesson.getJSONArray("steps").length())
        counts.put("themes", originalThemeCount + 1)
        themeCounts.put(addedThemeId, 1)
        val lessonManifest = manifest.getJSONArray("lessons")
        lessonManifest.put(JSONObject()
            .put("lessonId", addedLesson.getString("lesson_id"))
            .put("themeId", addedThemeId)
            .put("steps", addedLesson.getJSONArray("steps").length())
            .put("sha256", "0".repeat(64)))
        val manifestBytes = manifest.toString().toByteArray(Charsets.UTF_8)

        val validated = ContentRepository.decode(lessonsBytes, workflowBytes, manifestBytes)
        assertEquals(originalThemeCount + 1, validated.byTheme.size)
        assertEquals(addedThemeId, validated.byId.getValue(addedLessonId).themeId)

        val files = mapOf(
            "lessons.json" to lessonsBytes,
            "teacher-workflow.json" to workflowBytes,
            "content-manifest.json" to manifestBytes
        )
        val cache = File(context.cacheDir, "remote-content-${UUID.randomUUID()}.cache")
        try {
            val remote = ContentRepository(
                context,
                remoteSource = ContentSource { name -> files.getValue(name) },
                cacheFile = cache
            ).load()
            assertEquals(ContentOrigin.REMOTE, remote.origin)
            assertEquals(validated.contentSha256, remote.bundle.contentSha256)

            val offline = ContentRepository(
                context,
                remoteSource = ContentSource { throw IOException("offline") },
                cacheFile = cache
            ).load()
            assertEquals(ContentOrigin.CACHE, offline.origin)
            assertEquals(validated.contentSha256, offline.bundle.contentSha256)
            assertTrue(offline.statusMessage.contains("çevrimdışı"))
        } finally {
            cache.delete()
        }
    }
}
