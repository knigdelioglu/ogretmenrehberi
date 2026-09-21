package io.github.knigdelioglu.lessonplayer.content

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/** Reads only APK assets; no HTTP, account, storage permission or writable canonical catalog. */
class ContentRepository(private val context: Context) {
    suspend fun load(): LessonBundle = withContext(Dispatchers.IO) {
        fun asset(name: String): ByteArray =
            context.assets.open("lesson-player/$name").use { it.readBytes() }
        decode(asset("lessons.json"), asset("teacher-workflow.json"),
            asset("content-manifest.json"))
    }

    companion object {
        fun sha256(bytes: ByteArray): String =
            MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") {
                "%02x".format(it.toInt() and 0xff)
            }

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
            require(counts.getInt("themes") == 4 && counts.getInt("lessons") == 48 &&
                counts.getInt("steps") == 914) { "Unsupported lesson dataset size" }
            require(lessons.size == counts.getInt("lessons") &&
                lessons.sumOf { it.steps.size } == counts.getInt("steps")) { "Lesson coverage mismatch" }
            require(lessons.map { it.lessonId }.distinct().size == lessons.size &&
                lessons.map { it.lessonSlug }.distinct().size == lessons.size) { "Duplicate lesson identity" }
            val themes = manifest.getJSONObject("themes")
            require(lessons.groupingBy { it.themeId }.eachCount() ==
                mapOf("TEMA_01" to themes.getInt("TEMA_01"),
                    "TEMA_02" to themes.getInt("TEMA_02"),
                    "TEMA_03" to themes.getInt("TEMA_03"),
                    "TEMA_04" to themes.getInt("TEMA_04"))) { "Theme coverage mismatch" }
            val byLesson = manifest.getJSONArray("lessons")
            require(byLesson.length() == lessons.size) { "Manifest lesson count mismatch" }
            val lessonDigests = buildMap {
                lessons.forEachIndexed { index, lesson ->
                    val entry = byLesson.getJSONObject(index)
                    require(entry.getString("lessonId") == lesson.lessonId &&
                        entry.getString("themeId") == lesson.themeId &&
                        entry.getInt("steps") == lesson.steps.size) { "Manifest lesson mismatch" }
                    val digest = entry.getString("sha256")
                    require(digest.matches(Regex("[0-9a-f]{64}"))) {
                        "Invalid per-lesson digest: ${lesson.lessonId}"
                    }
                    require(put(lesson.lessonId, digest) == null) {
                        "Duplicate per-lesson digest identity: ${lesson.lessonId}"
                    }
                }
            }
            require(workflow.themes.size == counts.getInt("themes") &&
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
            require(theme.matches(Regex("TEMA_0[1-4]"))) { "Invalid theme: $id" }
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
