package io.github.knigdelioglu.lessonplayer.storage

import androidx.room.withTransaction
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.StepContent
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import org.json.JSONArray
import org.json.JSONObject

/**
 * Restores one complete lesson record transactionally. Stale/corrupt edits and
 * custom order are archived in the same transaction before canonical fallback.
 */
class LessonStore(private val database: LessonDatabase) {
    private val dao get() = database.dao()

    suspend fun restore(lesson: LessonData, contentDigest: String): LessonSession =
        database.withTransaction {
            val original = LessonEngine.initial(lesson, contentDigest)
            val row = dao.readProgress(lesson.lessonId) ?: return@withTransaction original
            if (row.contentDigest != contentDigest) {
                return@withTransaction migrateContentUpdate(row, lesson, contentDigest, original)
            }
            try {
                val order = readOrder(row.stepOrderJson)
                require(LessonEngine.validOrder(order, lesson)) { "Stale custom step order" }
                val overrides = readOverrides(row.overridesJson)
                var restored = original.copy(
                    order = order,
                    stepId = LessonEngine.restoredStepId(order, null, row.stepId, 0)
                )
                for ((id, override) in overrides) {
                    restored = LessonEngine.reduce(restored, lesson,
                        LessonCommand.ApplyOverride(id, override))
                }
                restored
            } catch (error: Exception) {
                dao.archiveProgress(ArchivedProgressRow(
                    lessonId = row.lessonId,
                    contentDigest = row.contentDigest,
                    stepId = row.stepId,
                    stepOrderJson = row.stepOrderJson,
                    overridesJson = row.overridesJson,
                    archivedAtMillis = System.currentTimeMillis(),
                    reason = "INVALID_SAVED_STATE"
                ))
                dao.deleteProgress(row.lessonId)
                original
            }
        }

    /**
     * A lesson digest can change while stable step IDs still identify the teacher's
     * place and edits. Archive the old snapshot, reconcile its order with the new
     * canonical steps, and retain only edits that remain valid for the new content.
     */
    private suspend fun migrateContentUpdate(
        row: ProgressRow,
        lesson: LessonData,
        contentDigest: String,
        original: LessonSession
    ): LessonSession {
        dao.archiveProgress(ArchivedProgressRow(
            lessonId = row.lessonId,
            contentDigest = row.contentDigest,
            stepId = row.stepId,
            stepOrderJson = row.stepOrderJson,
            overridesJson = row.overridesJson,
            archivedAtMillis = System.currentTimeMillis(),
            reason = "CONTENT_DIGEST_MISMATCH"
        ))
        dao.deleteProgress(row.lessonId)

        val migrated = runCatching {
            val oldOrder = readOrder(row.stepOrderJson)
            require(oldOrder.isNotEmpty() && oldOrder.none(String::isBlank)) {
                "Invalid saved step order"
            }
            val canonicalOrder = lesson.steps.map { it.id }
            val canonicalIds = canonicalOrder.toSet()
            val reconciledOrder = oldOrder.filter { it in canonicalIds }.distinct().toMutableList()
            canonicalOrder.forEachIndexed { index, id ->
                if (id !in reconciledOrder) {
                    val followingCanonicalStep = canonicalOrder.drop(index + 1)
                        .firstOrNull { it in reconciledOrder }
                    val insertAt = followingCanonicalStep?.let(reconciledOrder::indexOf)
                        ?: reconciledOrder.size
                    reconciledOrder.add(insertAt, id)
                }
            }
            require(LessonEngine.validOrder(reconciledOrder, lesson))
            val currentStep = if (row.stepId in reconciledOrder) {
                row.stepId
            } else {
                val oldIndex = oldOrder.indexOf(row.stepId).coerceAtLeast(0)
                oldOrder.drop(oldIndex + 1).firstOrNull { it in reconciledOrder }
                    ?: oldOrder.take(oldIndex).asReversed()
                        .firstOrNull { it in reconciledOrder }
                    ?: LessonEngine.restoredStepId(
                        reconciledOrder, null, null, oldIndex
                    )
            }
            var state = original.copy(order = reconciledOrder, stepId = currentStep)
            runCatching { readOverrides(row.overridesJson) }
                .getOrDefault(emptyMap())
                .filterKeys { it in canonicalIds }
                .forEach { (id, override) ->
                    state = runCatching {
                        LessonEngine.reduce(state, lesson, LessonCommand.ApplyOverride(id, override))
                    }.getOrDefault(state)
                }
            state
        }.getOrDefault(original)

        dao.upsertProgress(migrated.toProgressRow())
        return migrated
    }

    suspend fun save(state: LessonSession) {
        dao.upsertProgress(state.toProgressRow())
    }

    private fun LessonSession.toProgressRow() = ProgressRow(
        lessonId = lessonId,
        contentDigest = contentDigest,
        stepId = stepId,
        stepOrderJson = JSONArray(order).toString(),
        overridesJson = writeOverrides(overrides),
        updatedAtMillis = System.currentTimeMillis()
    )

    suspend fun archived(lessonId: String): List<ArchivedProgressRow> = dao.archived(lessonId)

    suspend fun exportBackupSnapshot(): LessonBackupSnapshot =
        database.withTransaction {
            LessonBackupSnapshot(
                progress = dao.allProgress().map {
                    BackupProgress(
                        lessonId = it.lessonId,
                        contentDigest = it.contentDigest,
                        stepId = it.stepId,
                        stepOrderJson = it.stepOrderJson,
                        overridesJson = it.overridesJson
                    )
                },
                marks = dao.allMarks().map {
                    BackupMark(it.academicYear, it.track, it.itemId, it.checked)
                }
            )
        }

    /**
     * Validates every record before deleting anything. The Room transaction makes
     * replacement all-or-nothing if a write fails after validation.
     */
    suspend fun importBackupSnapshot(snapshot: LessonBackupSnapshot, bundle: LessonBundle) {
        database.withTransaction {
            require(snapshot.progress.map { it.lessonId }.distinct().size ==
                snapshot.progress.size) { "Yedekte yinelenen ders kaydı" }
            require(snapshot.marks.map { "${it.academicYear}:${it.track}:${it.itemId}" }
                .distinct().size == snapshot.marks.size) {
                "Yedekte yinelenen öğretmen işareti"
            }
            val rows = snapshot.progress.map { backup ->
                val lesson = bundle.byId[backup.lessonId]
                    ?: error("Yedekte bilinmeyen ders: ${backup.lessonId}")
                require(backup.contentDigest == bundle.lessonDigest(lesson.lessonId)) {
                    "Ders içeriği imzası uyuşmuyor: ${lesson.lessonId}"
                }
                val order = readOrder(backup.stepOrderJson)
                require(LessonEngine.validOrder(order, lesson)) {
                    "Geçersiz ders sırası: ${lesson.lessonId}"
                }
                val overrides = readOverrides(backup.overridesJson)
                var restored = LessonEngine.initial(lesson, backup.contentDigest).copy(
                    order = order,
                    stepId = LessonEngine.restoredStepId(order, null, backup.stepId, 0)
                )
                for ((id, override) in overrides) {
                    restored = LessonEngine.reduce(
                        restored, lesson, LessonCommand.ApplyOverride(id, override)
                    )
                }
                ProgressRow(
                    lessonId = restored.lessonId,
                    contentDigest = restored.contentDigest,
                    stepId = restored.stepId,
                    stepOrderJson = JSONArray(restored.order).toString(),
                    overridesJson = writeOverrides(restored.overrides),
                    updatedAtMillis = System.currentTimeMillis()
                )
            }
            val marks = snapshot.marks.map {
                require(it.academicYear.matches(Regex("\\d{4}-\\d{4}")))
                require(it.track in setOf("workshop", "annual", "portfolio"))
                require(it.itemId.isNotBlank())
                TeacherMarkRow(it.academicYear, it.track, it.itemId, it.checked)
            }
            dao.deleteAllProgress()
            dao.deleteAllMarks()
            if (rows.isNotEmpty()) dao.upsertProgress(rows)
            if (marks.isNotEmpty()) dao.upsertMarks(marks)
        }
    }

    suspend fun setTeacherMark(
        academicYear: String, track: String, itemId: String, checked: Boolean
    ) {
        require(academicYear.matches(Regex("\\d{4}-\\d{4}")))
        require(track in setOf("workshop", "annual", "portfolio"))
        require(itemId.isNotBlank())
        dao.upsertMark(TeacherMarkRow(academicYear, track, itemId, checked))
    }

    suspend fun teacherMarks(academicYear: String, track: String): Set<String> {
        require(track in setOf("workshop", "annual", "portfolio"))
        return dao.marks(academicYear, track)
            .filter { it.checked }.map { it.itemId }.toSet()
    }

    companion object {
        private fun readOrder(raw: String): List<String> {
            val array = JSONArray(raw)
            return (0 until array.length()).map { array.getString(it) }
        }

        private fun readOverrides(raw: String): Map<String, StepOverride> {
            val value = JSONObject(raw)
            return value.keys().asSequence().associateWith { id ->
                val data = value.getJSONObject(id)
                val contentPresent = data.optBoolean("hasContentOverride", false)
                val contentValue = if (contentPresent && !data.isNull("content"))
                    data.getJSONObject("content") else null
                StepOverride(
                    displayPrompt = data.optionalString("displayPrompt"),
                    layout = data.optionalString("layout")?.let(LayoutKind::fromWire),
                    density = data.optionalString("density"),
                    revealOrder = data.optJSONArray("revealOrder")?.let { array ->
                        (0 until array.length()).map {
                            RevealKey.fromWire(array.getString(it))
                        }
                    },
                    content = contentValue?.let(::readContent),
                    hasContentOverride = contentPresent
                )
            }
        }

        private fun writeOverrides(overrides: Map<String, StepOverride>): String {
            val result = JSONObject()
            for ((stepId, patch) in overrides) {
                val data = JSONObject()
                patch.displayPrompt?.let { data.put("displayPrompt", it) }
                patch.layout?.let { data.put("layout", it.wire) }
                patch.density?.let { data.put("density", it) }
                patch.revealOrder?.let { data.put("revealOrder",
                    JSONArray(it.map(RevealKey::wire))) }
                if (patch.hasContentOverride) {
                    data.put("hasContentOverride", true)
                    data.put("content", patch.content?.let(::writeContent) ?: JSONObject.NULL)
                }
                result.put(stepId, data)
            }
            return result.toString()
        }

        private fun readContent(value: JSONObject) = StepContent(
            lead = value.optionalString("lead"),
            items = value.optJSONArray("items")?.let { a ->
                (0 until a.length()).map(a::getString)
            }.orEmpty(),
            sections = value.optJSONArray("sections")?.let { a ->
                (0 until a.length()).map { index ->
                    val entry = a.getJSONObject(index)
                    SupplementalSection(entry.getString("title"), entry.getString("body"))
                }
            }.orEmpty(),
            note = value.optionalString("note")
        )

        private fun writeContent(value: StepContent) = JSONObject().apply {
            value.lead?.let { put("lead", it) }
            put("items", JSONArray(value.items))
            put("sections", JSONArray(value.sections.map {
                JSONObject().put("title", it.title).put("body", it.body)
            }))
            value.note?.let { put("note", it) }
        }

        private fun JSONObject.optionalString(key: String): String? =
            if (!has(key) || isNull(key)) null else getString(key)
    }
}
