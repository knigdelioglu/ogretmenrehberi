package io.github.knigdelioglu.lessonplayer.content

/** Immutable canonical content. Teacher edits are stored separately in later phases. */
enum class LayoutKind(val wire: String) {
    QUESTION("question"), VOCABULARY("vocabulary"), PROCESS("process"),
    REFERENCE("reference"), COMPARISON("comparison"), STRUCTURE("structure"),
    ASSESSMENT("assessment");

    companion object {
        fun fromWire(value: String): LayoutKind =
            entries.singleOrNull { it.wire == value }
                ?: error("Unsupported lesson layout: $value")
    }
}

enum class RevealKey(val wire: String) {
    GUIDANCE("guidance"), ANSWER("answer"), EVIDENCE("evidence"),
    EXPLANATION("explanation"), NOTE("note");

    companion object {
        fun fromWire(value: String): RevealKey =
            entries.singleOrNull { it.wire == value }
                ?: error("Unsupported reveal layer: $value")
    }
}

/** JSON null and absent are distinct in the parser. Objects retain nested structure. */
sealed interface JsonValue {
    data object Null : JsonValue
    data class Text(val value: String) : JsonValue
    data class Number(val value: String) : JsonValue
    data class Bool(val value: Boolean) : JsonValue
    data class Array(val items: List<JsonValue>) : JsonValue
    data class Object(val values: Map<String, JsonValue>) : JsonValue
}

data class SourceRecord(
    val id: String,
    val printedPageRange: String,
    val bookHeading: String,
    val taskType: String,
    val sourceLocator: String,
    val sourceStatus: String,
    val prompt: String?
)

data class AnswerEntry(
    val questionId: String,
    val entryType: String,
    val printedPage: Int,
    val questionNo: String?,
    val promptSummary: String,
    val answer: String,
    val guidance: String?,
    val explanation: String?,
    val evidenceQuotes: List<String>,
    val answerSections: JsonValue?,
    val sourceLocator: String
)

data class SupplementalSection(val title: String, val body: String)

data class StepContent(
    val lead: String?,
    val items: List<String>,
    val sections: List<SupplementalSection>,
    val note: String?
)

data class LessonStep(
    val id: String,
    val layout: LayoutKind,
    val density: String,
    val revealOrder: List<RevealKey>,
    val displayPrompt: String,
    val displayPromptMode: String,
    val source: SourceRecord,
    val answer: AnswerEntry?,
    val content: StepContent?,
    val outlineTitle: String? = null
)

data class LessonData(
    val schemaVersion: String,
    val themeId: String,
    val lessonId: String,
    val lessonSlug: String,
    val title: String,
    val subtitle: String,
    val printedPageRange: String,
    val requiredSourceFrom: String,
    val requiredSourceTo: String,
    val coverageSourceRecords: Int,
    val coverageAnswerEntries: Int,
    val steps: List<LessonStep>
)

data class WorkflowTask(val id: String, val skill: String, val title: String)
data class WorkflowTheme(
    val id: String, val title: String, val term: Int, val tasks: List<WorkflowTask>,
    val reflectionTitle: String
)
data class AnnualItem(val id: String, val title: String, val recommendedThemeId: String)
data class TeacherWorkflow(
    val schemaVersion: String,
    val themes: List<WorkflowTheme>,
    val annualItems: List<AnnualItem>,
    val source: JsonValue.Object
)

data class LessonBundle(
    val contentSha256: String,
    val workflowSha256: String,
    val lessons: List<LessonData>,
    val workflow: TeacherWorkflow,
    val lessonSha256: Map<String, String>
) {
    val byId: Map<String, LessonData> = lessons.associateBy { it.lessonId }
    val byTheme: Map<String, List<LessonData>> = lessons.groupBy { it.themeId }

    /** Per-lesson identity: an unrelated lesson update must not invalidate this lesson's edits. */
    fun lessonDigest(lessonId: String): String = lessonSha256.getValue(lessonId)
}
