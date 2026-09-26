package io.github.knigdelioglu.lessonplayer.storage

import androidx.room.withTransaction
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.StepContent
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import org.json.JSONArray
import org.json.JSONObject

/**
 * Restores one complete lesson record transactionally for a specific ClassGroup.
 * Teacher customizations (step order and overrides) remain shared on the canonical lesson,
 * while progress (stepId) is isolated per class group.
 */
class LessonStore(private val database: LessonDatabase) {
    private val dao get() = database.dao()

    suspend fun restore(lesson: LessonData, contentDigest: String): LessonSession =
        restore(DEFAULT_CLASS_GROUP_ID, lesson, contentDigest)

    suspend fun save(state: LessonSession) =
        save(DEFAULT_CLASS_GROUP_ID, state)

    suspend fun restore(classGroupId: String, lesson: LessonData, contentDigest: String): LessonSession =
        database.withTransaction {
            val original = LessonEngine.initial(lesson, contentDigest)
            val customization = dao.readCustomization(lesson.lessonId)
            val progress = dao.readClassProgress(classGroupId, lesson.lessonId)
            val priorOrder = customization?.let { runCatching { readOrder(it.stepOrderJson) }.getOrNull() }
                ?: lesson.steps.map { it.id }

            // 1. Resolve shared customization (step order and overrides)
            var effectiveOrder = lesson.steps.map { it.id }
            var effectiveOverrides = emptyMap<String, StepOverride>()

            if (customization != null) {
                if (customization.contentDigest != contentDigest) {
                    val currentStepId = progress?.stepId ?: lesson.steps.first().id
                    val reconciled = migrateCustomizationUpdate(customization, lesson, contentDigest, currentStepId)
                    effectiveOrder = reconciled.first
                    effectiveOverrides = reconciled.second
                } else {
                    try {
                        val order = readOrder(customization.stepOrderJson)
                        require(LessonEngine.validOrder(order, lesson)) { "Stale custom step order" }
                        effectiveOrder = order
                        effectiveOverrides = readOverrides(customization.overridesJson)
                    } catch (error: Exception) {
                        dao.archiveProgress(ArchivedProgressRow(
                            lessonId = customization.lessonId,
                            contentDigest = customization.contentDigest,
                            stepId = progress?.stepId ?: lesson.steps.first().id,
                            stepOrderJson = customization.stepOrderJson,
                            overridesJson = customization.overridesJson,
                            archivedAtMillis = System.currentTimeMillis(),
                            reason = "INVALID_SAVED_CUSTOMIZATION"
                        ))
                        dao.deleteCustomization(customization.lessonId)
                    }
                }
            }

            // 2. Resolve section-specific progress (stepId)
            var effectiveStepId = effectiveOrder.firstOrNull() ?: lesson.steps.first().id
            if (progress != null) {
                if (progress.contentDigest != contentDigest) {
                    val reconciledStepId = if (progress.stepId in effectiveOrder) {
                        progress.stepId
                    } else {
                        val oldIndex = priorOrder.indexOf(progress.stepId).coerceAtLeast(0)
                        priorOrder.drop(oldIndex + 1).firstOrNull { it in effectiveOrder }
                            ?: priorOrder.take(oldIndex).asReversed().firstOrNull { it in effectiveOrder }
                            ?: LessonEngine.restoredStepId(effectiveOrder, null, null, oldIndex)
                    }
                    effectiveStepId = reconciledStepId
                    dao.upsertClassProgress(ClassLessonProgressRow(
                        classGroupId = classGroupId,
                        lessonId = lesson.lessonId,
                        contentDigest = contentDigest,
                        stepId = effectiveStepId,
                        updatedAtMillis = System.currentTimeMillis()
                    ))
                } else {
                    effectiveStepId = LessonEngine.restoredStepId(effectiveOrder, null, progress.stepId, 0)
                }
            }

            // 3. Assemble session and apply overrides
            var restored = original.copy(
                order = effectiveOrder,
                stepId = effectiveStepId
            )
            for ((id, override) in effectiveOverrides) {
                restored = runCatching {
                    LessonEngine.reduce(restored, lesson, LessonCommand.ApplyOverride(id, override))
                }.getOrDefault(restored)
            }
            restored
        }

    /**
     * When lesson content changes, archive previous customization, reconcile custom order
     * with newly canonical steps, retain valid overrides, and persist the updated record.
     */
    private suspend fun migrateCustomizationUpdate(
        customization: LessonCustomizationRow,
        lesson: LessonData,
        contentDigest: String,
        currentStepId: String
    ): Pair<List<String>, Map<String, StepOverride>> {
        dao.archiveProgress(ArchivedProgressRow(
            lessonId = customization.lessonId,
            contentDigest = customization.contentDigest,
            stepId = currentStepId,
            stepOrderJson = customization.stepOrderJson,
            overridesJson = customization.overridesJson,
            archivedAtMillis = System.currentTimeMillis(),
            reason = "CONTENT_DIGEST_MISMATCH"
        ))
        dao.deleteCustomization(customization.lessonId)

        val canonicalOrder = lesson.steps.map { it.id }
        val canonicalIds = canonicalOrder.toSet()

        val (reconciledOrder, validOverrides) = runCatching {
            val oldOrder = readOrder(customization.stepOrderJson)
            require(oldOrder.isNotEmpty() && oldOrder.none(String::isBlank))
            val reconciled = oldOrder.filter { it in canonicalIds }.distinct().toMutableList()
            canonicalOrder.forEachIndexed { index, id ->
                if (id !in reconciled) {
                    val followingCanonicalStep = canonicalOrder.drop(index + 1)
                        .firstOrNull { it in reconciled }
                    val insertAt = followingCanonicalStep?.let(reconciled::indexOf)
                        ?: reconciled.size
                    reconciled.add(insertAt, id)
                }
            }
            require(LessonEngine.validOrder(reconciled, lesson))
            val overrides = readOverrides(customization.overridesJson).filterKeys { it in canonicalIds }
            reconciled to overrides
        }.getOrDefault(canonicalOrder to emptyMap())

        dao.upsertCustomization(LessonCustomizationRow(
            lessonId = lesson.lessonId,
            contentDigest = contentDigest,
            stepOrderJson = JSONArray(reconciledOrder).toString(),
            overridesJson = writeOverrides(validOverrides),
            updatedAtMillis = System.currentTimeMillis()
        ))

        return reconciledOrder to validOverrides
    }

    suspend fun save(classGroupId: String, state: LessonSession) {
        database.withTransaction {
            dao.upsertClassProgress(ClassLessonProgressRow(
                classGroupId = classGroupId,
                lessonId = state.lessonId,
                contentDigest = state.contentDigest,
                stepId = state.stepId,
                updatedAtMillis = System.currentTimeMillis()
            ))
            dao.upsertCustomization(LessonCustomizationRow(
                lessonId = state.lessonId,
                contentDigest = state.contentDigest,
                stepOrderJson = JSONArray(state.order).toString(),
                overridesJson = writeOverrides(state.overrides),
                updatedAtMillis = System.currentTimeMillis()
            ))
        }
    }

    suspend fun archived(lessonId: String): List<ArchivedProgressRow> = dao.archived(lessonId)

    // Legacy unmigrated progress handling
    suspend fun legacyProgress(): List<LegacyProgressRow> = dao.allLegacyProgress()
    suspend fun hasLegacyProgress(): Boolean = dao.allLegacyProgress().isNotEmpty()

    suspend fun assignLegacyProgress(targetClassGroupId: String?) {
        database.withTransaction {
            if (targetClassGroupId != null) {
                val legacy = dao.allLegacyProgress()
                val rows = legacy.map {
                    ClassLessonProgressRow(
                        classGroupId = targetClassGroupId,
                        lessonId = it.lessonId,
                        contentDigest = it.contentDigest,
                        stepId = it.stepId,
                        updatedAtMillis = it.updatedAtMillis
                    )
                }
                if (rows.isNotEmpty()) dao.upsertClassProgress(rows)
            }
            dao.deleteAllLegacyProgress()
        }
    }

    // Class groups management
    suspend fun activeClassGroups(): List<ClassGroup> = database.withTransaction {
        val rows = dao.activeClassGroups()
        if (rows.isEmpty()) {
            dao.upsertClassGroups(DEFAULT_CLASS_GROUPS.map { it.toRow() })
            DEFAULT_CLASS_GROUPS
        } else {
            rows.map { it.toDomain() }
        }
    }

    suspend fun allClassGroups(): List<ClassGroup> = database.withTransaction {
        val rows = dao.allClassGroups()
        if (rows.isEmpty()) {
            dao.upsertClassGroups(DEFAULT_CLASS_GROUPS.map { it.toRow() })
            DEFAULT_CLASS_GROUPS
        } else {
            rows.map { it.toDomain() }
        }
    }

    suspend fun saveClassGroup(group: ClassGroup) {
        dao.upsertClassGroup(group.toRow())
    }

    suspend fun archiveClassGroup(groupId: String) {
        val row = dao.classGroup(groupId) ?: return
        dao.upsertClassGroup(row.copy(archived = true))
    }

    suspend fun allClassProgress(): List<ClassLessonProgressRow> = dao.allClassProgress()

    suspend fun allClassProgressForGroup(classGroupId: String): List<ClassLessonProgressRow> =
        dao.allClassProgressForGroup(classGroupId)

    suspend fun exportBackupSnapshot(): LessonBackupSnapshot =
        database.withTransaction {
            val groups = allClassGroups()
            LessonBackupSnapshot(
                schemaVersion = 2,
                classGroups = groups.map {
                    BackupClassGroup(
                        id = it.id,
                        academicYear = it.academicYear,
                        grade = it.grade,
                        section = it.section,
                        displayName = it.displayName,
                        archived = it.archived,
                        sortOrder = it.sortOrder
                    )
                },
                classProgress = dao.allClassProgress().map {
                    BackupClassProgress(
                        classGroupId = it.classGroupId,
                        lessonId = it.lessonId,
                        contentDigest = it.contentDigest,
                        stepId = it.stepId,
                        updatedAtMillis = it.updatedAtMillis
                    )
                },
                lessonCustomizations = dao.allCustomizations().map {
                    BackupLessonCustomization(
                        lessonId = it.lessonId,
                        contentDigest = it.contentDigest,
                        stepOrderJson = it.stepOrderJson,
                        overridesJson = it.overridesJson,
                        updatedAtMillis = it.updatedAtMillis
                    )
                },
                marks = dao.allMarks().map {
                    BackupMark(it.academicYear, it.track, it.itemId, it.checked)
                }
            )
        }

    suspend fun importBackupSnapshot(snapshot: LessonBackupSnapshot, bundle: LessonBundle) {
        database.withTransaction {
            if (snapshot.schemaVersion == 1 ||
                (snapshot.classProgress.isEmpty() && snapshot.legacyProgress.isNotEmpty())
            ) {
                // v1 -> v2 Migration on import
                require(snapshot.legacyProgress.map { it.lessonId }.distinct().size ==
                    snapshot.legacyProgress.size) { "Yedekte yinelenen ders kaydı" }
                val defaultGroup = DEFAULT_CLASS_GROUPS.first()
                val groups = DEFAULT_CLASS_GROUPS.map { it.toRow() }

                val customizations = mutableListOf<LessonCustomizationRow>()
                val progressRows = mutableListOf<ClassLessonProgressRow>()

                for (legacy in snapshot.legacyProgress) {
                    val lesson = bundle.byId[legacy.lessonId]
                        ?: error("Yedekte bilinmeyen ders: ${legacy.lessonId}")
                    require(legacy.contentDigest == bundle.lessonDigest(lesson.lessonId)) {
                        "Ders içeriği imzası uyuşmuyor: ${lesson.lessonId}"
                    }
                    val order = readOrder(legacy.stepOrderJson)
                    require(LessonEngine.validOrder(order, lesson)) {
                        "Geçersiz ders sırası: ${lesson.lessonId}"
                    }
                    val overrides = readOverrides(legacy.overridesJson)
                    customizations.add(LessonCustomizationRow(
                        lessonId = lesson.lessonId,
                        contentDigest = legacy.contentDigest,
                        stepOrderJson = JSONArray(order).toString(),
                        overridesJson = writeOverrides(overrides),
                        updatedAtMillis = System.currentTimeMillis()
                    ))
                    progressRows.add(ClassLessonProgressRow(
                        classGroupId = defaultGroup.id,
                        lessonId = lesson.lessonId,
                        contentDigest = legacy.contentDigest,
                        stepId = LessonEngine.restoredStepId(order, null, legacy.stepId, 0),
                        updatedAtMillis = System.currentTimeMillis()
                    ))
                }

                val marks = snapshot.marks.map {
                    require(it.academicYear.matches(Regex("\\d{4}-\\d{4}")))
                    require(it.track in setOf("workshop", "annual", "portfolio"))
                    require(it.itemId.isNotBlank())
                    TeacherMarkRow(it.academicYear, it.track, it.itemId, it.checked)
                }

                dao.deleteAllClassProgress()
                dao.deleteAllCustomizations()
                dao.deleteAllClassGroups()
                dao.deleteAllMarks()
                dao.deleteAllLegacyProgress()

                dao.upsertClassGroups(groups)
                if (customizations.isNotEmpty()) dao.upsertCustomizations(customizations)
                if (progressRows.isNotEmpty()) dao.upsertClassProgress(progressRows)
                if (marks.isNotEmpty()) dao.upsertMarks(marks)
            } else {
                // v2 Import
                require(snapshot.classGroups.map { it.id }.distinct().size ==
                    snapshot.classGroups.size) { "Yedekte yinelenen ders grubu" }
                require(snapshot.classProgress.map { "${it.classGroupId}:${it.lessonId}" }.distinct().size ==
                    snapshot.classProgress.size) { "Yedekte yinelenen sınıf ilerleme kaydı" }
                require(snapshot.lessonCustomizations.map { it.lessonId }.distinct().size ==
                    snapshot.lessonCustomizations.size) { "Yedekte yinelenen ders özelleştirme kaydı" }
                require(snapshot.marks.map { "${it.academicYear}:${it.track}:${it.itemId}" }.distinct().size ==
                    snapshot.marks.size) { "Yedekte yinelenen öğretmen işareti" }

                val groups = snapshot.classGroups.map {
                    ClassGroupRow(it.id, it.academicYear, it.grade, it.section, it.displayName, it.archived, it.sortOrder)
                }
                val customizations = snapshot.lessonCustomizations.map { custom ->
                    val lesson = bundle.byId[custom.lessonId]
                        ?: error("Yedekte bilinmeyen ders: ${custom.lessonId}")
                    require(custom.contentDigest == bundle.lessonDigest(lesson.lessonId)) {
                        "Ders içeriği imzası uyuşmuyor: ${lesson.lessonId}"
                    }
                    val order = readOrder(custom.stepOrderJson)
                    require(LessonEngine.validOrder(order, lesson)) {
                        "Geçersiz ders sırası: ${lesson.lessonId}"
                    }
                    val overrides = readOverrides(custom.overridesJson)
                    LessonCustomizationRow(
                        lessonId = lesson.lessonId,
                        contentDigest = custom.contentDigest,
                        stepOrderJson = JSONArray(order).toString(),
                        overridesJson = writeOverrides(overrides),
                        updatedAtMillis = custom.updatedAtMillis
                    )
                }
                val progressRows = snapshot.classProgress.map { prog ->
                    val lesson = bundle.byId[prog.lessonId]
                        ?: error("Yedekte bilinmeyen ders: ${prog.lessonId}")
                    require(prog.contentDigest == bundle.lessonDigest(lesson.lessonId)) {
                        "Ders içeriği imzası uyuşmuyor: ${lesson.lessonId}"
                    }
                    ClassLessonProgressRow(
                        classGroupId = prog.classGroupId,
                        lessonId = prog.lessonId,
                        contentDigest = prog.contentDigest,
                        stepId = prog.stepId,
                        updatedAtMillis = prog.updatedAtMillis
                    )
                }
                val marks = snapshot.marks.map {
                    require(it.academicYear.matches(Regex("\\d{4}-\\d{4}")))
                    require(it.track in setOf("workshop", "annual", "portfolio"))
                    require(it.itemId.isNotBlank())
                    TeacherMarkRow(it.academicYear, it.track, it.itemId, it.checked)
                }

                dao.deleteAllClassProgress()
                dao.deleteAllCustomizations()
                dao.deleteAllClassGroups()
                dao.deleteAllMarks()
                dao.deleteAllLegacyProgress()

                if (groups.isNotEmpty()) dao.upsertClassGroups(groups)
                if (customizations.isNotEmpty()) dao.upsertCustomizations(customizations)
                if (progressRows.isNotEmpty()) dao.upsertClassProgress(progressRows)
                if (marks.isNotEmpty()) dao.upsertMarks(marks)
            }
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
        fun readOrder(raw: String): List<String> {
            val array = JSONArray(raw)
            return (0 until array.length()).map { array.getString(it) }
        }

        fun readOverrides(raw: String): Map<String, StepOverride> {
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

        fun writeOverrides(overrides: Map<String, StepOverride>): String {
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
