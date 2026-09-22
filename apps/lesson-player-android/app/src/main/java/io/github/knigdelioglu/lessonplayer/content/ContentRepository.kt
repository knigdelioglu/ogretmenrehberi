package io.github.knigdelioglu.lessonplayer.content

import android.content.Context
import io.github.knigdelioglu.lessonplayer.BuildConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import javax.net.ssl.HttpsURLConnection

enum class ContentOrigin { REMOTE, CACHE, APK }

data class ContentLoadResult(
    val bundle: LessonBundle,
    val origin: ContentOrigin,
    val statusMessage: String
)

fun interface ContentSource {
    suspend fun fetch(fileName: String): ByteArray
}

/**
 * Loads the published canonical bundle first, keeping one validated local copy
 * for offline use. APK assets are the first-install/recovery fallback only.
 */
class ContentRepository(
    context: Context,
    private val remoteSource: ContentSource = HttpsContentSource(
        BuildConfig.LESSON_CONTENT_BASE_URL
    ),
    private val cacheFile: File = File(
        context.applicationContext.filesDir, "lesson-player-content.cache"
    )
) {
    private val appContext = context.applicationContext

    suspend fun load(): ContentLoadResult = withContext(Dispatchers.IO) {
        val cached = readCandidate(cacheFile, ContentOrigin.CACHE)
        val packaged = if (cached == null) readAssets() else null
        val fallback = cached ?: packaged

        try {
            val manifestBytes = remoteSource.fetch(MANIFEST_FILE)
            val manifest = JSONObject(manifestBytes.toString(Charsets.UTF_8))
            require(manifest.getInt("schemaVersion") == 1) {
                "Desteklenmeyen uzaktaki içerik manifesti"
            }
            val advertisedContentHash = manifest.getString("contentSha256")
            val advertisedWorkflowHash = manifest.getString("workflowSha256")
            require(isSha256(advertisedContentHash) && isSha256(advertisedWorkflowHash)) {
                "Uzak içerik imzaları geçersiz"
            }

            if (fallback != null &&
                advertisedContentHash == fallback.bundle.contentSha256 &&
                advertisedWorkflowHash == fallback.bundle.workflowSha256
            ) {
                // Validate the new manifest against the already verified payload too.
                val verified = decode(
                    fallback.files.lessons,
                    fallback.files.workflow,
                    manifestBytes
                )
                val current = Candidate(
                    ContentFiles(fallback.files.lessons, fallback.files.workflow, manifestBytes),
                    verified,
                    ContentOrigin.REMOTE
                )
                val hasOfflineCopy = fallback.origin == ContentOrigin.CACHE ||
                    saveOfflineCopy(current.files)
                return@withContext ContentLoadResult(
                    verified,
                    ContentOrigin.REMOTE,
                    if (hasOfflineCopy) "İçerik güncel; çevrimdışı kopya hazır."
                    else "İçerik güncel; APK içindeki yedek çevrimdışı kullanılabilir."
                )
            }

            val (lessonsBytes, workflowBytes) = coroutineScope {
                val lessons = async(Dispatchers.IO) { remoteSource.fetch(LESSONS_FILE) }
                val workflow = async(Dispatchers.IO) { remoteSource.fetch(WORKFLOW_FILE) }
                lessons.await() to workflow.await()
            }
            val bundle = decode(lessonsBytes, workflowBytes, manifestBytes)
            val files = ContentFiles(lessonsBytes, workflowBytes, manifestBytes)
            ContentLoadResult(
                bundle,
                ContentOrigin.REMOTE,
                if (saveOfflineCopy(files)) "Yeni içerik indirildi, doğrulandı ve çevrimdışı saklandı."
                else "Yeni içerik indirildi ve doğrulandı; cihaza çevrimdışı kaydedilemedi."
            )
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            if (fallback != null) {
                val localDescription = when (fallback.origin) {
                    ContentOrigin.CACHE -> "son doğrulanmış çevrimdışı kopya"
                    ContentOrigin.APK -> "APK içindeki başlangıç kopyası"
                    ContentOrigin.REMOTE -> error("Remote fallback cannot be selected before fetch")
                }
                ContentLoadResult(
                    fallback.bundle,
                    fallback.origin,
                    "İçerik güncellenemedi; $localDescription kullanılıyor."
                )
            } else {
                throw IllegalStateException(
                    "Uzak içerik alınamadı ve geçerli yerel içerik bulunamadı: " +
                        (error.message ?: error::class.simpleName),
                    error
                )
            }
        }
    }

    private fun readCandidate(file: File, origin: ContentOrigin): Candidate? {
        if (!file.isFile) return null
        return runCatching {
            val files = readCache(file)
            Candidate(files, decode(files.lessons, files.workflow, files.manifest), origin)
        }.getOrNull()
    }

    private fun readAssets(): Candidate? = runCatching {
        val files = ContentFiles(
            asset(LESSONS_FILE), asset(WORKFLOW_FILE), asset(MANIFEST_FILE)
        )
        Candidate(files, decode(files.lessons, files.workflow, files.manifest), ContentOrigin.APK)
    }.getOrNull()

    private fun asset(name: String): ByteArray =
        appContext.assets.open("lesson-player/$name").use { it.readBytes() }

    private fun writeCache(files: ContentFiles) {
        val parent = cacheFile.parentFile ?: error("İçerik önbelleği yolu geçersiz")
        require(parent.isDirectory || parent.mkdirs()) { "İçerik önbelleği oluşturulamadı" }
        val temporary = File(parent, "${cacheFile.name}.tmp")
        try {
            FileOutputStream(temporary).use { output ->
                DataOutputStream(output).use { data ->
                    data.writeInt(CACHE_MAGIC)
                    data.writeInt(CACHE_VERSION)
                    data.writeSizedBytes(files.lessons)
                    data.writeSizedBytes(files.workflow)
                    data.writeSizedBytes(files.manifest)
                    data.flush()
                    output.fd.sync()
                }
            }
            try {
                Files.move(
                    temporary.toPath(), cacheFile.toPath(),
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING
                )
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(temporary.toPath(), cacheFile.toPath(),
                    StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            if (temporary.exists()) temporary.delete()
        }
    }

    private fun saveOfflineCopy(files: ContentFiles): Boolean =
        runCatching { writeCache(files) }.isSuccess

    private fun readCache(file: File): ContentFiles = DataInputStream(FileInputStream(file)).use { input ->
        require(input.readInt() == CACHE_MAGIC && input.readInt() == CACHE_VERSION) {
            "Bilinmeyen içerik önbelleği"
        }
        val files = ContentFiles(
            input.readSizedBytes(), input.readSizedBytes(), input.readSizedBytes()
        )
        require(input.read() == -1) { "İçerik önbelleğinde fazladan veri var" }
        files
    }

    private fun DataOutputStream.writeSizedBytes(bytes: ByteArray) {
        require(bytes.isNotEmpty() && bytes.size <= MAX_FILE_BYTES) {
            "İçerik dosyası boyutu sınır dışında"
        }
        writeInt(bytes.size)
        write(bytes)
    }

    private fun DataInputStream.readSizedBytes(): ByteArray {
        val size = readInt()
        require(size in 1..MAX_FILE_BYTES) { "Önbellekte geçersiz içerik boyutu" }
        return ByteArray(size).also(::readFully)
    }

    private data class ContentFiles(
        val lessons: ByteArray,
        val workflow: ByteArray,
        val manifest: ByteArray
    )

    private data class Candidate(
        val files: ContentFiles,
        val bundle: LessonBundle,
        val origin: ContentOrigin
    )

    private class HttpsContentSource(private val baseUrl: String) : ContentSource {
        init {
            require(baseUrl.startsWith("https://")) {
                "İçerik adresi HTTPS olmalı"
            }
        }

        override suspend fun fetch(fileName: String): ByteArray {
            require(fileName in CONTENT_FILES) { "Bilinmeyen içerik dosyası" }
            val connection = URL("${baseUrl.trimEnd('/')}/$fileName")
                .openConnection() as? HttpsURLConnection
                ?: error("İçerik adresi HTTPS bağlantısı açmadı")
            try {
                connection.connectTimeout = CONNECT_TIMEOUT_MS
                connection.readTimeout = READ_TIMEOUT_MS
                connection.requestMethod = "GET"
                connection.useCaches = false
                connection.setRequestProperty("Cache-Control", "no-cache")
                connection.setRequestProperty("Pragma", "no-cache")
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("User-Agent", "OgretmenRehberi-LessonPlayer/1")
                require(connection.responseCode == HttpURLConnection.HTTP_OK) {
                    "İçerik sunucusu HTTP ${connection.responseCode} döndürdü"
                }
                require(connection.url.protocol == "https") {
                    "Güvenli olmayan içerik yönlendirmesi reddedildi"
                }
                require(connection.contentLengthLong <= MAX_FILE_BYTES) {
                    "İçerik dosyası boyut sınırını aşıyor"
                }
                return connection.inputStream.use { input ->
                    val output = ByteArrayOutputStream()
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        require(output.size().toLong() + count <= MAX_FILE_BYTES) {
                            "İçerik dosyası boyut sınırını aşıyor"
                        }
                        output.write(buffer, 0, count)
                    }
                    output.toByteArray()
                }
            } finally {
                connection.disconnect()
            }
        }
    }

    companion object {
        private const val LESSONS_FILE = "lessons.json"
        private const val WORKFLOW_FILE = "teacher-workflow.json"
        private const val MANIFEST_FILE = "content-manifest.json"
        private val CONTENT_FILES = setOf(LESSONS_FILE, WORKFLOW_FILE, MANIFEST_FILE)
        private const val MAX_FILE_BYTES = 8 * 1024 * 1024
        private const val CONNECT_TIMEOUT_MS = 2_500
        private const val READ_TIMEOUT_MS = 4_000
        private const val CACHE_MAGIC = 0x4c504342 // LPCB
        private const val CACHE_VERSION = 1

        fun sha256(bytes: ByteArray): String =
            MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") {
                "%02x".format(it.toInt() and 0xff)
            }

        private fun isSha256(value: String): Boolean =
            value.matches(Regex("[0-9a-f]{64}"))

        /** Exposed for instrumented tamper/parity tests; validates before accepting data. */
        fun decode(lessonBytes: ByteArray, workflowBytes: ByteArray, manifestBytes: ByteArray): LessonBundle {
            val manifest = JSONObject(manifestBytes.toString(Charsets.UTF_8))
            require(manifest.getInt("schemaVersion") == 1) { "Unsupported content manifest" }
            val contentHash = sha256(lessonBytes)
            val workflowHash = sha256(workflowBytes)
            require(contentHash == manifest.getString("contentSha256")) { "Lesson content digest mismatch" }
            require(workflowHash == manifest.getString("workflowSha256")) { "Teacher workflow digest mismatch" }
            val lessonsArray = JSONArray(lessonBytes.toString(Charsets.UTF_8))
            val lessons = (0 until lessonsArray.length()).map { parseLesson(lessonsArray.getJSONObject(it)) }
            val workflow = parseWorkflow(JSONObject(workflowBytes.toString(Charsets.UTF_8)))
            val counts = manifest.getJSONObject("counts")
            val declaredLessons = counts.getInt("lessons")
            val declaredSteps = counts.getInt("steps")
            val declaredThemes = counts.getInt("themes")
            require(declaredLessons > 0 && declaredSteps > 0 && declaredThemes > 0) {
                "Invalid lesson manifest counts"
            }
            require(lessons.size == declaredLessons &&
                lessons.sumOf { it.steps.size } == declaredSteps) { "Lesson coverage mismatch" }
            require(lessons.map { it.lessonId }.distinct().size == lessons.size &&
                lessons.map { it.lessonSlug }.distinct().size == lessons.size) { "Duplicate lesson identity" }
            val themeCounts = manifest.getJSONObject("themes")
            val declaredThemeCounts = themeCounts.keys().asSequence().associateWith { themeId ->
                themeCounts.getInt(themeId).also { require(it > 0) { "Invalid theme count: $themeId" } }
            }
            require(declaredThemeCounts.size == declaredThemes &&
                lessons.groupingBy { it.themeId }.eachCount() == declaredThemeCounts) {
                "Theme coverage mismatch"
            }
            val byLesson = manifest.getJSONArray("lessons")
            require(byLesson.length() == lessons.size) { "Manifest lesson count mismatch" }
            val lessonDigests = buildMap {
                lessons.forEachIndexed { index, lesson ->
                    val entry = byLesson.getJSONObject(index)
                    require(entry.getString("lessonId") == lesson.lessonId &&
                        entry.getString("themeId") == lesson.themeId &&
                        entry.getInt("steps") == lesson.steps.size) { "Manifest lesson mismatch" }
                    val digest = entry.getString("sha256")
                    require(isSha256(digest)) { "Invalid per-lesson digest: ${lesson.lessonId}" }
                    require(put(lesson.lessonId, digest) == null) {
                        "Duplicate per-lesson digest identity: ${lesson.lessonId}"
                    }
                }
            }
            require(workflow.themes.size == declaredThemes &&
                workflow.themes.sumOf { it.tasks.size } == counts.getInt("teacherWorkshops") &&
                workflow.annualItems.size == counts.getInt("annualItems")) { "Workflow coverage mismatch" }
            require(workflow.themes.map { it.id }.toSet() == lessons.map { it.themeId }.toSet()) {
                "Workflow/theme identity mismatch"
            }
            return LessonBundle(contentHash, workflowHash, lessons, workflow, lessonDigests)
        }

        private fun parseLesson(value: JSONObject): LessonData {
            val steps = value.getJSONArray("steps").objects(::parseStep)
            val id = value.getString("lesson_id")
            require(id.isNotBlank()) { "Blank lesson ID" }
            require(steps.isNotEmpty() && steps.map { it.id }.distinct().size == steps.size) {
                "Empty or duplicate steps: $id"
            }
            val coverage = value.getJSONObject("coverage")
            require(coverage.getInt("steps") == steps.size) { "Step count mismatch: $id" }
            val range = value.getJSONObject("required_source_range")
            val theme = value.getString("theme_id")
            require(theme.matches(Regex("TEMA_\\d{2,}"))) { "Invalid theme: $id" }
            return LessonData(
                schemaVersion = value.getString("schema_version"),
                themeId = theme,
                lessonId = id, lessonSlug = value.getString("lesson_slug"),
                title = value.getString("title"), subtitle = value.getString("subtitle"),
                printedPageRange = value.getString("printed_page_range"),
                requiredSourceFrom = range.getString("from"),
                requiredSourceTo = range.getString("to"),
                coverageSourceRecords = coverage.getInt("source_records"),
                coverageAnswerEntries = coverage.getInt("answer_entries"),
                steps = steps
            )
        }

        private fun parseStep(value: JSONObject): LessonStep {
            val source = value.getJSONObject("source")
            val answer = value.optObject("answer")?.let(::parseAnswer)
            val content = value.optObject("content")?.let(::parseContent)
            val sourceId = source.getString("source_record_id")
            require(sourceId.matches(Regex("T\\d{2}-S\\d+"))) { "Invalid source identity" }
            require(source.getString("source_status") == "VERIFIED") { "Unverified source: $sourceId" }
            require(answer != null || content != null) { "Step without answer or content" }
            val keys = value.getJSONArray("reveal_order").strings().map(RevealKey::fromWire)
            val available = buildList {
                if (!answer?.guidance.isNullOrBlank()) add(RevealKey.GUIDANCE)
                if (answer != null) add(RevealKey.ANSWER)
                if (!answer?.evidenceQuotes.isNullOrEmpty()) add(RevealKey.EVIDENCE)
                if (!answer?.explanation.isNullOrBlank()) add(RevealKey.EXPLANATION)
                if (!content?.note.isNullOrBlank()) add(RevealKey.NOTE)
            }
            require(keys.size == keys.distinct().size && keys.toSet() == available.toSet()) {
                "Invalid reveal layers: ${value.getString("id")}"
            }
            val layout = LayoutKind.fromWire(value.getString("layout"))
            if (layout == LayoutKind.VOCABULARY) {
                require(answer?.answerSections is JsonValue.Object &&
                    answer.answerSections.values.isNotEmpty()) { "Vocabulary needs keyed definitions" }
            }
            return LessonStep(
                id = value.getString("id"), layout = layout,
                density = value.getString("density").also {
                    require(it in setOf("large", "comfortable", "compact"))
                },
                revealOrder = keys, displayPrompt = value.getString("display_prompt").also {
                    require(it.isNotBlank())
                },
                displayPromptMode = value.getString("display_prompt_mode"),
                source = SourceRecord(
                    id = sourceId, printedPageRange = source.getString("printed_page_range"),
                    bookHeading = source.getString("book_heading"),
                    taskType = source.getString("task_type"),
                    sourceLocator = source.getString("source_locator"),
                    sourceStatus = source.getString("source_status"),
                    prompt = source.optionalString("prompt")
                ),
                answer = answer, content = content
            )
        }

        private fun parseAnswer(value: JSONObject): AnswerEntry {
            val type = value.getString("entry_type")
            require(type in setOf("question_answer", "performance_support", "source_limited")) {
                "Unsupported answer category $type"
            }
            return AnswerEntry(
                questionId = value.getString("question_id"),
                entryType = type, printedPage = value.getInt("printed_page"),
                questionNo = value.optionalString("question_no"),
                promptSummary = value.getString("prompt_summary"),
                answer = value.getString("answer").also { require(it.isNotBlank()) },
                guidance = value.optionalString("guidance"),
                explanation = value.optionalString("explanation"),
                evidenceQuotes = value.optArray("evidence_quotes")?.strings() ?: emptyList(),
                answerSections = value.optionalJson("answer_sections"),
                sourceLocator = value.getString("source_locator")
            )
        }

        private fun parseContent(value: JSONObject): StepContent = StepContent(
            lead = value.optionalString("lead"),
            items = value.optArray("items")?.strings() ?: emptyList(),
            sections = value.optArray("sections")?.objects {
                SupplementalSection(it.getString("title"), it.getString("body"))
            } ?: emptyList(),
            note = value.optionalString("note")
        )

        private fun parseWorkflow(value: JSONObject): TeacherWorkflow {
            val themes = value.getJSONArray("themes").objects { theme ->
                WorkflowTheme(
                    id = theme.getString("id"), title = theme.getString("title"),
                    term = theme.getInt("term"),
                    tasks = theme.getJSONArray("tasks").objects {
                        WorkflowTask(it.getString("id"), it.getString("skill"), it.getString("title"))
                    },
                    reflectionTitle = theme.getJSONObject("reflection").getString("title")
                )
            }
            val annual = value.getJSONObject("annual").getJSONArray("items").objects {
                AnnualItem(it.getString("id"), it.getString("title"),
                    it.getString("recommended_theme_id"))
            }
            require(themes.map { it.id }.distinct().size == themes.size) { "Duplicate workflow theme" }
            require(annual.map { it.id }.distinct().size == annual.size) { "Duplicate annual task" }
            return TeacherWorkflow(value.getString("schema_version"), themes, annual,
                jsonValue(value) as JsonValue.Object)
        }

        private fun JSONObject.optionalString(name: String): String? =
            if (!has(name) || isNull(name)) null else getString(name)

        private fun JSONObject.optObject(name: String): JSONObject? =
            if (!has(name) || isNull(name)) null else getJSONObject(name)

        private fun JSONObject.optArray(name: String): JSONArray? =
            if (!has(name) || isNull(name)) null else getJSONArray(name)

        private fun JSONObject.optionalJson(name: String): JsonValue? =
            if (!has(name)) null else jsonValue(get(name))

        private fun JSONArray.strings(): List<String> =
            (0 until length()).map { getString(it) }

        private fun <T> JSONArray.objects(parse: (JSONObject) -> T): List<T> =
            (0 until length()).map { parse(getJSONObject(it)) }

        private fun jsonValue(value: Any?): JsonValue = when (value) {
            null, JSONObject.NULL -> JsonValue.Null
            is String -> JsonValue.Text(value)
            is Boolean -> JsonValue.Bool(value)
            is Number -> JsonValue.Number(value.toString())
            is JSONArray -> JsonValue.Array((0 until value.length()).map { jsonValue(value.get(it)) })
            is JSONObject -> JsonValue.Object(value.keys().asSequence().associateWith {
                jsonValue(value.get(it))
            })
            else -> error("Unsupported canonical JSON value: ${value::class}")
        }
    }
}
