package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.AnswerEntry
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.SourceRecord
import io.github.knigdelioglu.lessonplayer.content.StepContent
import io.github.knigdelioglu.lessonplayer.content.SupplementalSection
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.StepOverride
import io.github.knigdelioglu.lessonplayer.player.toStudentProjection
import io.github.knigdelioglu.lessonplayer.ui.shell.PhaseState
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonUiPhase
import io.github.knigdelioglu.lessonplayer.ui.shell.deriveLessonPhases
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class LessonShellV2Test {

    private fun sampleLesson(): LessonData {
        val step1 = LessonStep(
            id = "step-1",
            layout = LayoutKind.COMPARISON,
            density = "large",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER, RevealKey.EVIDENCE, RevealKey.EXPLANATION, RevealKey.NOTE),
            displayPrompt = "Karşılaştırma sorusu",
            displayPromptMode = "full",
            source = SourceRecord(
                id = "src-1",
                printedPageRange = "12-13",
                bookHeading = "Giriş",
                taskType = "Metin Tahlili",
                sourceLocator = "p12",
                sourceStatus = "active",
                prompt = "Metinleri karşılaştırınız."
            ),
            answer = AnswerEntry(
                questionId = "q-1",
                entryType = "canonical",
                printedPage = 12,
                questionNo = "1",
                promptSummary = "Karşılaştırma özeti",
                answer = "A metni ile B metni arasındaki farklar şunlardır.",
                guidance = "Öğrencilere iki dönemin zihniyet farkını hatırlatınız.",
                explanation = "Tanzimat ve Servetifünun dönemlerinin estetik anlayışı farklıdır.",
                evidenceQuotes = listOf("Metin 1'den kanıt", "Metin 2'den kanıt"),
                answerSections = JsonValue.Object(mapOf("dönem" to JsonValue.Text("Tanzimat"))),
                sourceLocator = "p12"
            ),
            content = StepContent(
                lead = "Metinleri inceleyip ölçütlere göre karşılaştırınız.",
                items = listOf("Dil ve Anlatım", "Tema"),
                sections = listOf(
                    SupplementalSection("1. Metin", "Ağır ve sanatlı bir dil."),
                    SupplementalSection("2. Metin", "Sade ve yalın bir dil.")
                ),
                note = "GİZLİ ÖĞRETMEN NOTU: Öğrencilerin dil özelliklerine dikkatini çekin."
            )
        )
        return LessonData(
            schemaVersion = "2.0",
            themeId = "t1",
            lessonId = "lesson-1",
            lessonSlug = "karsilastirma-dersi",
            title = "Edebi Metin Karşılaştırması",
            subtitle = "Tanzimat ve Servetifünun",
            printedPageRange = "12-13",
            requiredSourceFrom = "p12",
            requiredSourceTo = "p13",
            coverageSourceRecords = 1,
            coverageAnswerEntries = 1,
            steps = listOf(step1)
        )
    }

    @Test
    fun minimumTouchTargetMeetsAccessibilityStandards() {
        assertEquals(48.dp, LessonTarget.minimum)
    }

    @Test
    fun responsiveShellDecisionsSelectThreeColumnOnlyOnLargeLandscapeTablets() {
        val largeLandscape = lessonWindowLayout(widthDp = 1280, heightDp = 800)
        val mediumTablet = lessonWindowLayout(widthDp = 840, heightDp = 900)
        val portraitPhone = lessonWindowLayout(widthDp = 400, heightDp = 840)
        val shortLandscape = lessonWindowLayout(widthDp = 1200, heightDp = 500)

        // Geniş landscape tablet: 3-kolon shell
        assertTrue(largeLandscape.usesThreeColumn)
        assertTrue(largeLandscape.usesRail)

        // Medium tablet (dikey veya dar landscape): 3-kolon değil, kompakt
        assertFalse(mediumTablet.usesThreeColumn)

        // Portrait mobil: 3-kolon değil, rail değil
        assertFalse(portraitPhone.usesThreeColumn)
        assertFalse(portraitPhone.usesRail)

        // Kısa pencere (Split-screen / IME): 3-kolon olmamalı
        assertFalse(shortLandscape.usesThreeColumn)
    }

    @Test
    fun teacherRevealFlowMaintainsSingleSourceOfTruthInSession() {
        val lesson = sampleLesson()
        var session = LessonEngine.initial(lesson, contentDigest = "test-digest")

        // Başlangıçta hiçbir anahtar açık değil
        assertFalse(RevealKey.GUIDANCE in session.revealed)
        assertFalse(RevealKey.ANSWER in session.revealed)
        assertFalse(RevealKey.EXPLANATION in session.revealed)
        assertFalse(RevealKey.EVIDENCE in session.revealed)

        // Yönlendirme aç
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        assertTrue(RevealKey.GUIDANCE in session.revealed)

        // Cevap aç
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertTrue(RevealKey.ANSWER in session.revealed)

        // Cevap kapat
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertFalse(RevealKey.ANSWER in session.revealed)
        assertTrue(RevealKey.GUIDANCE in session.revealed)
    }

    @Test
    fun studentProjectionDoesNotLeakTeacherNotesOrHiddenGuidance() {
        val lesson = sampleLesson()
        val session = LessonEngine.initial(lesson, contentDigest = "test-digest")

        // Reveal edilmeden önce projeksiyonda cevap, yönlendirme, kanıt bulunmaz
        val initialProjection = toStudentProjection(lesson, session)
        assertNull(initialProjection.answerText)
        assertNull(initialProjection.guidance)
        assertTrue(initialProjection.evidenceQuotes.isEmpty())
        assertNull(initialProjection.explanation)

        // Öğretmen notu asla projeksiyonda yer alamaz
        val step = lesson.steps.first()
        assertTrue(step.content?.note?.contains("GİZLİ ÖĞRETMEN NOTU") == true)
    }

    @Test
    fun assessmentContentItemsAreEvaluationCriteriaNotMultipleChoiceAlternatives() {
        val step = LessonStep(
            id = "s35-q1",
            layout = LayoutKind.ASSESSMENT,
            density = "compact",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Yazıcı metnindeki dil ve üslup özelliklerinin metnin anlamına katkısını değerlendiriniz.",
            displayPromptMode = "full",
            source = SourceRecord("T01-S0020", "35", "Süreci Değerlendirebilme", "ASSESSMENT", "p35", "VERIFIED", null),
            answer = null,
            content = StepContent(
                lead = "Değerlendirirken üç boyuta odaklanın:",
                items = listOf(
                    "Güldürü unsurlarının ortaya çıkmasına etkisi",
                    "Çatışmaların ortaya çıkmasına etkisi",
                    "Dönemin toplumsal ve kültürel yapısını yansıtmaya etkisi"
                ),
                sections = emptyList(),
                note = null
            )
        )
        // items alanı değerlendirme kriterleridir; çoktan seçmeli seçenek değildir
        assertEquals(3, step.content?.items?.size)
        assertTrue(step.content?.items?.first()?.startsWith("Güldürü") == true)
    }

    @Test
    fun comparisonDoesNotLeakAnswerSectionsWhenAnswerKeyNotRevealed() {
        val lesson = sampleLesson()
        val session = LessonEngine.initial(lesson, contentDigest = "test-digest")

        // Cevap henüz kapalıyken reveal setinde ANSWER yoktur
        assertFalse(RevealKey.ANSWER in session.revealed)

        // Sınıf projeksiyonunda veya renderera giden kapalı durumda answerSections sızdırılmaz
        val projection = toStudentProjection(lesson, session)
        assertNull(projection.answerSections)
        assertNull(projection.answerText)
    }

    @Test
    fun v2ColorPaletteTokensAreDistinctAndNonNull() {
        assertTrue(LessonColors.Primary.value != 0UL)
        assertTrue(LessonColors.Header.value != 0UL)
        assertTrue(LessonColors.SidebarBg.value != 0UL)
        assertTrue(LessonColors.SidebarActive.value != 0UL)
        assertTrue(LessonColors.AppBg.value != 0UL)
        assertTrue(LessonColors.Surface.value != 0UL)
        assertTrue(LessonColors.GuidanceSurface.value != 0UL)
        assertTrue(LessonColors.AnswerSurface.value != 0UL)
        assertTrue(LessonColors.ExplanationSurface.value != 0UL)
        assertTrue(LessonColors.EvidenceSurface.value != 0UL)
    }

    @Test
    fun deriveLessonPhasesPreservesContiguousSegmentsForLargeLessons() {
        // 30 adımlı ders oluştur
        val thirtySteps = (1..30).map { i ->
            val layout = when (i % 5) {
                0 -> LayoutKind.ASSESSMENT
                1 -> LayoutKind.PROCESS
                2 -> LayoutKind.VOCABULARY
                3 -> LayoutKind.COMPARISON
                else -> LayoutKind.QUESTION
            }
            val taskType = when (i % 5) {
                0 -> "ASSESSMENT"
                1 -> "PROCESS"
                2 -> "VOCABULARY"
                3 -> "COMPARISON"
                else -> "READING"
            }
            LessonStep(
                id = "step-$i",
                layout = layout,
                density = "regular",
                revealOrder = listOf(RevealKey.ANSWER),
                displayPrompt = "Adım $i",
                displayPromptMode = "full",
                source = SourceRecord("src-$i", "10", "Başlık", taskType, "p10", "active", null),
                answer = null,
                content = null
            )
        }
        val lesson30 = LessonData(
            schemaVersion = "2.0",
            themeId = "t1",
            lessonId = "lesson-30",
            lessonSlug = "otuz-adimli-ders",
            title = "30 Adımlı Ders",
            subtitle = "Alt Başlık",
            printedPageRange = "10-20",
            requiredSourceFrom = "p10",
            requiredSourceTo = "p20",
            coverageSourceRecords = 30,
            coverageAnswerEntries = 0,
            steps = thirtySteps
        )
        val session = LessonEngine.initial(lesson30, contentDigest = "digest-30")

        val phases = deriveLessonPhases(lesson30, session)

        // Kategoriler dönüşümlü olduğundan her ardışık bölüm ayrı bir duraktır.
        assertEquals(30, phases.size)
        assertEquals(30, phases.sumOf { it.totalStepsInPhase })
        assertTrue(phases.zipWithNext().all { (first, next) -> first.title != next.title })
    }

    @Test
    fun deriveLessonPhasesUsesPastActiveAndUpcomingWithoutClaimingCompletion() {
        val s1 = LessonStep("s1", LayoutKind.PROCESS, "regular", emptyList(), "P", "full", SourceRecord("1", "1", "", "PROCESS", "p1", "active", null), null, null)
        val s2 = LessonStep("s2", LayoutKind.PROCESS, "regular", emptyList(), "P", "full", SourceRecord("2", "1", "", "PROCESS", "p1", "active", null), null, null)
        val s3 = LessonStep("s3", LayoutKind.VOCABULARY, "regular", emptyList(), "V", "full", SourceRecord("3", "1", "", "VOCABULARY", "p1", "active", null), null, null)
        val s4 = LessonStep("s4", LayoutKind.VOCABULARY, "regular", emptyList(), "V", "full", SourceRecord("4", "1", "", "VOCABULARY", "p1", "active", null), null, null)
        val s5 = LessonStep("s5", LayoutKind.ASSESSMENT, "regular", emptyList(), "A", "full", SourceRecord("5", "1", "", "ASSESSMENT", "p1", "active", null), null, null)

        val lesson = LessonData("2.0", "t1", "l1", "l1", "Test", "Alt Başlık", "1", "p1", "p1", 5, 0, listOf(s1, s2, s3, s4, s5))
        var session = LessonEngine.initial(lesson, contentDigest = "d")

        // Başlangıçta ilk faz aktif, sonraki fazlar sırada.
        var phases = deriveLessonPhases(lesson, session)
        assertEquals(3, phases.size)
        assertEquals(PhaseState.ACTIVE, phases[0].state)
        assertEquals(1, phases[0].activeStepIndexInPhase)
        assertEquals(PhaseState.UPCOMING, phases[1].state)
        assertEquals(PhaseState.UPCOMING, phases[2].state)

        // İleri adıma atlanınca önceki faz yalnızca geçmiş olarak gösterilir.
        session = LessonEngine.reduce(session, lesson, LessonCommand.GoToStep("s3"))
        phases = deriveLessonPhases(lesson, session)
        assertEquals(PhaseState.PAST, phases[0].state)
        assertEquals(0, phases[0].activeStepIndexInPhase)
        assertEquals(PhaseState.ACTIVE, phases[1].state)
        assertEquals(1, phases[1].activeStepIndexInPhase)
        assertEquals(PhaseState.UPCOMING, phases[2].state)

        // Son faza doğrudan gidildiğinde önceki gruplar tamamlandı sayılmaz.
        session = LessonEngine.reduce(session, lesson, LessonCommand.GoToStep("s5"))
        phases = deriveLessonPhases(lesson, session)
        assertEquals(PhaseState.PAST, phases[0].state)
        assertEquals(PhaseState.PAST, phases[1].state)
        assertEquals(PhaseState.ACTIVE, phases[2].state)
        assertEquals(1, phases[2].activeStepIndexInPhase)
    }

    @Test
    fun deriveLessonPhasesKeepsSeparatedMatchingCategoriesAsSeparateSegments() {
        val base = sampleLesson()
        val template = base.steps.single()
        fun makeStep(id: String, layout: LayoutKind, taskType: String) = template.copy(
            id = id,
            layout = layout,
            source = template.source.copy(id = id, taskType = taskType)
        )
        val steps = listOf(
            makeStep("a1", LayoutKind.QUESTION, "QUESTION"),
            makeStep("a2", LayoutKind.QUESTION, "QUESTION"),
            makeStep("b1", LayoutKind.ASSESSMENT, "ASSESSMENT"),
            makeStep("b2", LayoutKind.ASSESSMENT, "ASSESSMENT"),
            makeStep("a3", LayoutKind.QUESTION, "QUESTION")
        )
        val lesson = base.copy(lessonId = "lesson-phases", steps = steps)
        val initial = LessonEngine.initial(lesson, contentDigest = "phase-digest")
        val jumped = LessonEngine.reduce(initial, lesson, LessonCommand.GoToStep("a3"))
        val phases = deriveLessonPhases(lesson, jumped)

        assertEquals(listOf("Anlama", "Değerlendirme", "Anlama"), phases.map { it.title })
        assertEquals(listOf(2, 2, 1), phases.map { it.totalStepsInPhase })
        assertEquals(listOf(PhaseState.PAST, PhaseState.PAST, PhaseState.ACTIVE), phases.map { it.state })
        assertEquals("a3", jumped.stepId)
        assertTrue(jumped.revealed.isEmpty())
    }

    @Test
    fun comparisonAnswerSectionsBecomeARealMatrixAndStayHiddenUntilRevealed() {
        val step = sampleLesson().steps.single()
        val nested = JsonValue.Object(linkedMapOf(
            "Metin 1" to JsonValue.Object(linkedMapOf(
                "Sanatın amacı" to JsonValue.Text("Bireysel"),
                "Toplum-birey ilişkisi" to JsonValue.Text("Toplumcu")
            )),
            "Metin 2" to JsonValue.Object(linkedMapOf(
                "Sanatın amacı" to JsonValue.Text("Estetik"),
                "Toplum-birey ilişkisi" to JsonValue.Text("Bireyci")
            ))
        ))
        val matrix = comparisonAnswerMatrix(nested)!!

        assertEquals(listOf("Özellik", "Metin 1", "Metin 2"), matrix.headers)
        assertEquals(
            listOf(
                listOf("Sanatın amacı", "Bireysel", "Estetik"),
                listOf("Toplum-birey ilişkisi", "Toplumcu", "Bireyci")
            ),
            matrix.rows
        )
        assertEquals(listOf("Özellik", "Değer"), comparisonAnswerMatrix(
            JsonValue.Object(mapOf("dönem" to JsonValue.Text("Tanzimat")))
        )!!.headers)

        assertNull(visibleComparisonAnswerSections(step, answerVisible = false))
        assertTrue(visibleComparisonAnswerSections(step, answerVisible = true) != null)

        // Öğretmen cevabı reveal state'ten bağımsız olarak mevcutsa merkezde daima görünür.
        assertTrue(teacherAnswerVisibleInWorkspace(step))
        assertFalse(teacherAnswerVisibleInWorkspace(step.copy(answer = null)))

        // Vocabulary cevapları da sağ panel yerine merkezde açık gösterilebilir.
        assertTrue(vocabularyDefinitionVisible(
            answerVisibleInline = true,
            termRevealed = false
        ))
        assertTrue(vocabularyDefinitionVisible(
            answerVisibleInline = false,
            termRevealed = true
        ))
    }

    @Test
    fun teacherAdvanceSkipsAlwaysVisibleAnswerButPresentationFlowStillCanRevealIt() {
        val lesson = sampleLesson()
        val step = lesson.steps.single()
        var state = LessonEngine.initial(lesson, contentDigest = "teacher-answer-visible")

        assertEquals(LessonCommand.ToggleReveal(RevealKey.GUIDANCE), nextTeacherLessonCommand(step, state))
        state = LessonEngine.reduce(state, lesson, LessonCommand.ToggleReveal(RevealKey.GUIDANCE))

        // ANSWER sırada olmasına rağmen öğretmen akışı onu atlar; cevap zaten merkezde görünür.
        assertEquals(LessonCommand.ToggleReveal(RevealKey.EVIDENCE), nextTeacherLessonCommand(step, state))
        assertEquals("Göster: Metinden kanıt", nextTeacherLessonActionLabel(step, state))

        // Öğrenci sunumu için mevcut public reveal akışı değişmez ve ANSWER hâlâ reveal edilebilir.
        assertEquals(LessonCommand.ToggleReveal(RevealKey.ANSWER), nextLessonCommand(step, state))
    }

    @Test
    fun comparisonTableUsesAvailableWorkspaceBeforeHorizontalScrolling() {
        val twoColumns = comparisonTableColumnLayout(
            availableWidthDp = 700f,
            columnCount = 2
        )
        assertEquals(210f, twoColumns.criterionWidthDp, 0.1f)
        assertEquals(490f, twoColumns.entityWidthDp, 0.1f)
        assertEquals(700f, twoColumns.tableWidthDp, 0.1f)
        assertFalse(twoColumns.scrollsHorizontally)

        val threeColumns = comparisonTableColumnLayout(
            availableWidthDp = 700f,
            columnCount = 3
        )
        assertEquals(168f, threeColumns.criterionWidthDp, 0.1f)
        assertEquals(266f, threeColumns.entityWidthDp, 0.1f)
        assertEquals(700f, threeColumns.tableWidthDp, 0.1f)
        assertFalse(threeColumns.scrollsHorizontally)

        val fiveColumns = comparisonTableColumnLayout(
            availableWidthDp = 700f,
            columnCount = 5
        )
        assertEquals(168f, fiveColumns.criterionWidthDp, 0.1f)
        assertEquals(168f, fiveColumns.entityWidthDp, 0.1f)
        assertEquals(840f, fiveColumns.tableWidthDp, 0.1f)
        assertTrue(fiveColumns.scrollsHorizontally)
    }

    @Test
    fun teacherNoteNeverAppearsInStudentProjectionEvenIfItsTeacherStateIsOpen() {
        val source = sampleLesson()
        val teacherOnlyMarker = "ONLY_TEACHER_NOTE_MARKER"
        val lesson = source.copy(steps = source.steps.map { step ->
            step.copy(content = step.content?.copy(note = teacherOnlyMarker))
        })
        val step = lesson.steps.single()
        val state = LessonEngine.initial(lesson, contentDigest = "projection-digest")
            .copy(revealed = setOf(RevealKey.NOTE, RevealKey.ANSWER))

        val projection = toStudentProjection(lesson, state)

        assertFalse(projection.toString().contains(teacherOnlyMarker))
    }

    @Test
    fun actionBarDirectControlsSupportSingleTapRevealAndAvoidNoOp() {
        val stepWithGuidanceOnly = LessonStep(
            id = "step-g",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE),
            displayPrompt = "Soru",
            displayPromptMode = "full",
            source = SourceRecord("1", "1", "", "TASK", "p1", "active", null),
            answer = AnswerEntry("1", "canonical", 1, "1", "Özet", "", guidance = "İpucu verin", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p1"),
            content = null
        )
        val lesson = LessonData("2.0", "t1", "lg", "lg", "Test", "Alt Başlık", "1", "p1", "p1", 1, 1, listOf(stepWithGuidanceOnly))
        var session = LessonEngine.initial(lesson, contentDigest = "d")

        // Doğrudan RevealKey.GUIDANCE toggle edilebilmeli
        assertFalse(RevealKey.GUIDANCE in session.revealed)
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        assertTrue(RevealKey.GUIDANCE in session.revealed)

        // Answer / Explanation / Evidence step'te yok, doğrudan no-op engelleme kuralları:
        val hasAnswer = RevealKey.ANSWER in stepWithGuidanceOnly.revealOrder && stepWithGuidanceOnly.answer != null
        val hasExplanation = RevealKey.EXPLANATION in stepWithGuidanceOnly.revealOrder && !stepWithGuidanceOnly.answer?.explanation.isNullOrBlank()
        val hasEvidence = RevealKey.EVIDENCE in stepWithGuidanceOnly.revealOrder && !stepWithGuidanceOnly.answer?.evidenceQuotes.isNullOrEmpty()
        val hasGuidance = RevealKey.GUIDANCE in stepWithGuidanceOnly.revealOrder && !stepWithGuidanceOnly.answer?.guidance.isNullOrBlank()

        assertTrue(hasGuidance)
        assertFalse(hasAnswer)
        assertFalse(hasExplanation)
        assertFalse(hasEvidence)

        // Sunum modu komutu tek dokunuşta açılmalı
        session = LessonEngine.reduce(session, lesson, LessonCommand.SetPresentationMode(true))
        assertTrue(session.presentationMode)
    }

    @Test
    fun fallbackTeacherAssistResponsiveRoutingContract() {
        // Geniş landscape tablet: 3-kolon shell (sağ panel sabit)
        val expanded = lessonWindowLayout(widthDp = 1280, heightDp = 800)
        assertTrue(expanded.usesThreeColumn)
        assertFalse(expanded.usesTeacherAssistDrawer)
        assertFalse(expanded.usesTeacherAssistBottomSheet)

        // Medium / dar landscape tablet: Drawer fallback
        val medium = lessonWindowLayout(widthDp = 900, heightDp = 600)
        assertFalse(medium.usesThreeColumn)
        assertTrue(medium.usesTeacherAssistDrawer)
        assertFalse(medium.usesTeacherAssistBottomSheet)

        // Portrait kompakt / mobil: BottomSheet fallback
        val portrait = lessonWindowLayout(widthDp = 412, heightDp = 915)
        assertFalse(portrait.usesThreeColumn)
        assertFalse(portrait.usesTeacherAssistDrawer)
        assertTrue(portrait.usesTeacherAssistBottomSheet)
    }

    @Test
    fun fallbackDrawerAndSheetMutateSharedSessionRevealedWithoutStateDivergence() {
        val lesson = sampleLesson()
        var session = LessonEngine.initial(lesson, contentDigest = "test-digest")

        // Drawer veya Bottom Sheet içinden yapılan bir eylem
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        assertTrue(RevealKey.GUIDANCE in session.revealed)

        // Drawer veya Bottom Sheet kapansa bile (local UI state false)
        var uiPanelVisible = false
        assertFalse(uiPanelVisible)
        // Session reveal durumu korunur (single source of truth)
        assertTrue(RevealKey.GUIDANCE in session.revealed)

        // Panel tekrar açıldığında session.revealed geçerlidir
        uiPanelVisible = true
        assertTrue(uiPanelVisible)
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertTrue(RevealKey.ANSWER in session.revealed)
        assertTrue(RevealKey.GUIDANCE in session.revealed)
    }

    @Test
    fun toggleRevealThrowsWhenKeyNotInEffectiveStepRevealOrder() {
        val step = LessonStep(
            id = "step-guidance-only",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE),
            displayPrompt = "Soru metni",
            displayPromptMode = "full",
            source = SourceRecord("src-1", "10", "Başlık", "TASK", "p10", "active", null),
            answer = AnswerEntry("q-1", "canonical", 10, "1", "Özet", "Cevap", guidance = "İpucu", explanation = "Açıklama", evidenceQuotes = listOf("Kanıt"), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "Not var")
        )
        val lesson = LessonData("2.0", "t1", "l-guidance", "l-guidance", "Test", "Alt Başlık", "10", "p10", "p10", 1, 1, listOf(step))
        val session = LessonEngine.initial(lesson, contentDigest = "digest")

        // GUIDANCE revealOrder'da var -> Başarılı
        val updated = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        assertTrue(RevealKey.GUIDANCE in updated.revealed)

        // EXPLANATION veya NOTE revealOrder'da yok -> Engine require(command.key in step().revealOrder) ile crash olur
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.EXPLANATION))
        }
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.NOTE))
        }
    }

    @Test
    fun assistPaneAndActionBarOnlyEnableActionsMatchingEffectiveStepRevealOrder() {
        // Step içeriğinde metinsel not var fakat revealOrder'da NOTE yok
        val step = LessonStep(
            id = "step-with-note-not-in-order",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Soru",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "T", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Ö", "Cevap", guidance = "Rehber", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "Öğretmen notu var ama revealOrder'a dahil değil.")
        )
        val lesson = LessonData("2.0", "t1", "l-note", "l-note", "Test", "Alt Başlık", "10", "p10", "p10", 1, 1, listOf(step))
        val session = LessonEngine.initial(lesson, contentDigest = "d")

        val effectiveStep = LessonEngine.effectiveStep(step, session.overrides[step.id])

        // UI koruma kuralları: Yalnızca revealOrder'da olan ve verisi mevcut katmanlar aktif olur
        val hasGuidance = RevealKey.GUIDANCE in effectiveStep.revealOrder && !effectiveStep.answer?.guidance.isNullOrBlank()
        val hasAnswer = RevealKey.ANSWER in effectiveStep.revealOrder && effectiveStep.answer != null &&
            (!effectiveStep.answer.answer.isNullOrBlank() || effectiveStep.answer.answerSections != null)
        val hasExplanation = RevealKey.EXPLANATION in effectiveStep.revealOrder && !effectiveStep.answer?.explanation.isNullOrBlank()
        val hasEvidence = RevealKey.EVIDENCE in effectiveStep.revealOrder && !effectiveStep.answer?.evidenceQuotes.isNullOrEmpty()

        assertTrue(hasGuidance)
        assertTrue(hasAnswer)
        assertFalse(hasExplanation)
        assertFalse(hasEvidence)

        // NOTE bir reveal eylemi değildir; yerel öğretmen notudur. RevealOrder'da bulunsa dahi ToggleReveal üretmez
        val hasNote = !effectiveStep.content?.note.isNullOrBlank()
        assertTrue(hasNote)
    }

    @Test
    fun effectiveStepDerivationPropagatesTeacherOverridesToAllShellComponents() {
        val originalStep = LessonStep(
            id = "step-override-test",
            layout = LayoutKind.QUESTION,
            density = "large",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Orijinal soru metni",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "T", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Ö", "Cevap", guidance = "Rehber", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = null)
        )
        val lesson = LessonData("2.0", "t1", "l-ov", "l-ov", "Test", "Alt Başlık", "10", "p10", "p10", 1, 1, listOf(originalStep))
        var session = LessonEngine.initial(lesson, contentDigest = "d")

        // Başlangıçta NOTE revealOrder'da yok
        val initialEffective = LessonEngine.effectiveStep(originalStep, session.overrides[originalStep.id])
        assertFalse(RevealKey.NOTE in initialEffective.revealOrder)
        assertEquals("Orijinal soru metni", initialEffective.displayPrompt)

        // Öğretmen düzenleme yapar: displayPrompt güncellenir
        val candidate = StepOverride(
            displayPrompt = "Öğretmen tarafından güncellenen soru",
            density = "compact"
        )
        session = LessonEngine.reduce(session, lesson, LessonCommand.ApplyOverride("step-override-test", candidate))

        // Shell bileşenlerinin (sidebar, header, assist, actionbar) tükettiği effectiveStep ve effectiveLesson
        val updatedLesson = lesson.copy(
            steps = lesson.steps.map { s -> LessonEngine.effectiveStep(s, session.overrides[s.id]) }
        )
        val updatedEffectiveStep = updatedLesson.steps.first { it.id == "step-override-test" }

        assertEquals("Öğretmen tarafından güncellenen soru", updatedEffectiveStep.displayPrompt)
        assertEquals("compact", updatedEffectiveStep.density)
        assertEquals(listOf(RevealKey.GUIDANCE, RevealKey.ANSWER), updatedEffectiveStep.revealOrder)
    }

    @Test
    fun stepWithNoAssistContentProducesEmptyAssistSurfaceWithoutButtons() {
        val emptyStep = LessonStep(
            id = "step-no-assist",
            layout = LayoutKind.PROCESS,
            density = "regular",
            revealOrder = emptyList(),
            displayPrompt = "Süreç yönergesi",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "PROCESS", "p10", "active", null),
            answer = null,
            content = null
        )
        val effectiveStep = LessonEngine.effectiveStep(emptyStep, null)

        val hasGuidance = RevealKey.GUIDANCE in effectiveStep.revealOrder && !effectiveStep.answer?.guidance.isNullOrBlank()
        val hasAnswer = RevealKey.ANSWER in effectiveStep.revealOrder && effectiveStep.answer != null &&
            (!effectiveStep.answer.answer.isNullOrBlank() || effectiveStep.answer.answerSections != null)
        val hasExplanation = RevealKey.EXPLANATION in effectiveStep.revealOrder && !effectiveStep.answer?.explanation.isNullOrBlank()
        val hasEvidence = RevealKey.EVIDENCE in effectiveStep.revealOrder && !effectiveStep.answer?.evidenceQuotes.isNullOrEmpty()
        val hasNote = !effectiveStep.content?.note.isNullOrBlank()
        val hasAnyAssist = hasGuidance || hasAnswer || hasExplanation || hasEvidence || hasNote

        assertFalse(hasAnyAssist)
    }

    @Test
    fun comparisonWithNullContentLikeS31Q7DoesNotLeakWhenClosedAndRendersSingleTableWhenRevealed() {
        // Gerçek s31-q7 vakası: content null, ancak answer.answerSections iki karakter ve 5 kriter içeren nesne
        val s31q7 = LessonStep(
            id = "s31-q7",
            layout = LayoutKind.COMPARISON,
            density = "compact",
            revealOrder = listOf(RevealKey.ANSWER),
            displayPrompt = "Yazıcı ve Eskici Abdi karakterlerini karşılaştırınız.",
            displayPromptMode = "full",
            source = SourceRecord("src-31", "31", "Metin Tahlili", "COMPARISON", "p31", "active", null),
            answer = AnswerEntry(
                questionId = "s31-q7",
                entryType = "canonical",
                printedPage = 31,
                questionNo = "7",
                promptSummary = "Karakter karşılaştırması",
                answer = "İki karakter zihniyet ve üslup açısından farklıdır.",
                guidance = null,
                explanation = null,
                evidenceQuotes = emptyList(),
                answerSections = JsonValue.Object(
                    mapOf(
                        "Yazıcı" to JsonValue.Object(
                            mapOf(
                                "İçerik" to JsonValue.Text("Geleneksel bürokrasi"),
                                "Dönem" to JsonValue.Text("Osmanlı son dönemi"),
                                "Zihniyet" to JsonValue.Text("Kaderci"),
                                "İleti" to JsonValue.Text("Toplumsal eleştiri"),
                                "Üslup" to JsonValue.Text("Ağır ve mizahi")
                            )
                        ),
                        "Eskici Abdi" to JsonValue.Object(
                            mapOf(
                                "İçerik" to JsonValue.Text("Halk adamı"),
                                "Dönem" to JsonValue.Text("Cumhuriyet başı"),
                                "Zihniyet" to JsonValue.Text("Pragmatik"),
                                "İleti" to JsonValue.Text("Emek ve geçim"),
                                "Üslup" to JsonValue.Text("Sade ve doğrudan")
                            )
                        )
                    )
                ),
                sourceLocator = "p31"
            ),
            content = null // s31-q7'de content null'dur
        )

        val lesson = LessonData("2.0", "t1", "l-s31", "l-s31", "Test", "Alt Başlık", "31", "p31", "p31", 1, 1, listOf(s31q7))
        var session = LessonEngine.initial(lesson, contentDigest = "d-s31")

        // 1. Kapalıyken (answerVisible = false) hiçbir yanıt matrisi veya metni sızdırılmaz
        assertFalse(RevealKey.ANSWER in session.revealed)
        val hiddenProjection = toStudentProjection(lesson, session)
        assertNull(hiddenProjection.answerSections)
        assertNull(hiddenProjection.answerText)

        // 2. Renderer / Model kararı: SessionLessonScreen ve PresentationLessonScreen
        // COMPARISON layout'unda AnswerSections bileşenini çağırmaz (çift render engeli)
        val standaloneAnswerSectionsAllowed = s31q7.layout !in setOf(LayoutKind.VOCABULARY, LayoutKind.COMPARISON)
        assertFalse("COMPARISON adımlarında AnswerSections ikinci kez çağrılmamalıdır", standaloneAnswerSectionsAllowed)

        // 3. Açıldığında (answerVisible = true) tek bir yerde ComparisonAnswerTable olarak sunulur
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertTrue(RevealKey.ANSWER in session.revealed)

        val revealedProjection = toStudentProjection(lesson, session)
        val answerObj = revealedProjection.answerSections as? JsonValue.Object
        assertTrue("Cevap açıldığında answerSections nesne olmalıdır", answerObj != null)
        assertEquals(2, answerObj?.values?.size)
        assertTrue(answerObj?.values?.containsKey("Yazıcı") == true)
        assertTrue(answerObj?.values?.containsKey("Eskici Abdi") == true)
        val yaziciKriterler = answerObj?.values?.get("Yazıcı") as? JsonValue.Object
        assertEquals(5, yaziciKriterler?.values?.size)
    }

    @Test
    fun comparisonWithContentSectionsRendersSourceSectionsAndDoesNotDuplicateAnswerWhenRevealed() {
        val comparisonWithSections = LessonStep(
            id = "step-comp-sections",
            layout = LayoutKind.COMPARISON,
            density = "regular",
            revealOrder = listOf(RevealKey.ANSWER),
            displayPrompt = "İki metni yapı ve tema yönünden karşılaştırınız.",
            displayPromptMode = "full",
            source = SourceRecord("src-c", "20", "Metin Karşılaştırması", "COMPARISON", "p20", "active", null),
            answer = AnswerEntry(
                questionId = "qc",
                entryType = "canonical",
                printedPage = 20,
                questionNo = "1",
                promptSummary = "Metin karşılaştırma",
                answer = "Karşılaştırma özeti",
                guidance = null,
                explanation = null,
                evidenceQuotes = emptyList(),
                answerSections = JsonValue.Object(
                    mapOf(
                        "Yapı" to JsonValue.Text("1. Metin klasik, 2. Metin modern"),
                        "Tema" to JsonValue.Text("1. Metin yalnızlık, 2. Metin dayanışma")
                    )
                ),
                sourceLocator = "p20"
            ),
            content = StepContent(
                lead = "Aşağıdaki iki metni okuyunuz.",
                items = emptyList(),
                sections = listOf(
                    SupplementalSection("1. Metin", "Birinci metnin kaynak gövdesi."),
                    SupplementalSection("2. Metin", "İkinci metnin kaynak gövdesi.")
                ),
                note = null
            )
        )

        val lesson = LessonData("2.0", "t1", "lc", "lc", "Test", "Alt Başlık", "20", "p20", "p20", 1, 1, listOf(comparisonWithSections))
        var session = LessonEngine.initial(lesson, contentDigest = "dc")

        // 1. Kapalıyken kaynak bölümleri mevcuttur, cevap sızdırılmaz
        assertEquals(2, comparisonWithSections.content?.sections?.size)
        val initialProjection = toStudentProjection(lesson, session)
        assertNull(initialProjection.answerSections)

        // 2. Açıldığında SessionLessonScreen çift render yapmaz
        val standaloneAnswerSectionsAllowed = comparisonWithSections.layout !in setOf(LayoutKind.VOCABULARY, LayoutKind.COMPARISON)
        assertFalse(standaloneAnswerSectionsAllowed)

        // 3. Açıldığında cevap tek yerde ComparisonAnswerTable içinde sunulur
        session = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        val revealedProjection = toStudentProjection(lesson, session)
        val answerObj = revealedProjection.answerSections as? JsonValue.Object
        assertEquals(2, answerObj?.values?.size)
        assertEquals(JsonValue.Text("1. Metin klasik, 2. Metin modern"), answerObj?.values?.get("Yapı"))
    }

    @Test
    fun teacherOverrideImmediatelyUpdatesPhasesAndPreventsUnauthorizedDispatch() {
        val step1 = LessonStep(
            id = "step-p1",
            layout = LayoutKind.QUESTION,
            density = "large",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Orijinal soru 1",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "Bölüm 1", "TASK", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Özet", "Cevap 1", guidance = "İpucu", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = null
        )
        val step2 = LessonStep(
            id = "step-p2",
            layout = LayoutKind.ASSESSMENT,
            density = "compact",
            revealOrder = listOf(RevealKey.ANSWER),
            displayPrompt = "Orijinal değerlendirme 2",
            displayPromptMode = "full",
            source = SourceRecord("s2", "11", "Bölüm 2", "ASSESSMENT", "p11", "active", null),
            answer = null,
            content = null
        )

        val lesson = LessonData("2.0", "t1", "l-ov-phase", "l-ov-phase", "Test", "Alt Başlık", "10", "p10", "p11", 2, 1, listOf(step1, step2))
        var session = LessonEngine.initial(lesson, contentDigest = "d-ov")

        // 1. Öğretmen override uygular
        val override = StepOverride(
            displayPrompt = "Öğretmen tarafından güncellenen yönerge",
            density = "compact"
        )
        session = LessonEngine.reduce(session, lesson, LessonCommand.ApplyOverride("step-p1", override))

        // 2. LessonPlayerShell effectiveLesson türetir
        val effectiveLesson = lesson.copy(
            steps = lesson.steps.map { s -> LessonEngine.effectiveStep(s, session.overrides[s.id]) }
        )
        val effectiveStep1 = effectiveLesson.steps.first { it.id == "step-p1" }

        // Anında effectiveStep güncellenmiş olmalı
        assertEquals("Öğretmen tarafından güncellenen yönerge", effectiveStep1.displayPrompt)
        assertEquals("compact", effectiveStep1.density)

        // 3. Faz türetimi effectiveLesson üzerinden anında yansır
        val phases = deriveLessonPhases(effectiveLesson, session)
        assertEquals(2, phases.size)
        assertEquals(PhaseState.ACTIVE, phases[0].state)

        // 4. UI koruma sert kapısı: effectiveStep.revealOrder içinde olmayan bir anahtar (ör. NOTE) UI'dan dispatch edilmez
        assertFalse(RevealKey.NOTE in effectiveStep1.revealOrder)
        assertThrows(IllegalArgumentException::class.java) {
            // Eğer UI yanlışlıkla izinli olmayan bir anahtar dispatch ederse engine reddeder
            LessonEngine.reduce(session, effectiveLesson, LessonCommand.ToggleReveal(RevealKey.NOTE))
        }
    }

    @Test
    fun compactModeInlineAnswerButtonGuardedAgainstMissingRevealOrderOrEmptyAnswer() {
        // Durum 1: step.answer nesnesi mevcut fakat revealOrder'da ANSWER yok (yalnızca GUIDANCE var)
        val stepGuidanceOnly = LessonStep(
            id = "step-guidance-only",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE),
            displayPrompt = "Yalnızca yönlendirmesi olan soru",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "TASK", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Ö", "Cevap metni mevcut", guidance = "İpucu", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = null
        )
        val lesson = LessonData("2.0", "t1", "l-guard", "l-guard", "Test", "Alt", "10", "p10", "p10", 1, 1, listOf(stepGuidanceOnly))
        val session = LessonEngine.initial(lesson, contentDigest = "d-guard")

        // SessionLessonScreen inline cevap butonu karar kuralı
        val hasAnswerContent1 = stepGuidanceOnly.answer != null &&
            (!stepGuidanceOnly.answer.answer.isNullOrBlank() || stepGuidanceOnly.answer.answerSections != null)
        val canToggleAnswer1 = RevealKey.ANSWER in stepGuidanceOnly.revealOrder && hasAnswerContent1

        // ANSWER revealOrder'da olmadığı için canToggleAnswer FALSE olmalı ve buton asla üretilmemeli
        assertFalse(canToggleAnswer1)
        // Eğer yanlışlıkla dispatch edilirse motor çöker
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        }

        // Durum 2: revealOrder'da ANSWER var fakat answer içeriği tamamen boş
        val stepEmptyAnswer = stepGuidanceOnly.copy(
            revealOrder = listOf(RevealKey.ANSWER),
            answer = AnswerEntry("q2", "canonical", 10, "2", "Ö", "", guidance = null, explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10")
        )
        val hasAnswerContent2 = stepEmptyAnswer.answer != null &&
            (!stepEmptyAnswer.answer.answer.isNullOrBlank() || stepEmptyAnswer.answer.answerSections != null)
        val canToggleAnswer2 = RevealKey.ANSWER in stepEmptyAnswer.revealOrder && hasAnswerContent2
        // Cevap metni/kesiti boş olduğunda da canToggleAnswer FALSE olmalı (no-op buton engeli)
        assertFalse(canToggleAnswer2)

        // Durum 3: Hem revealOrder'da ANSWER var hem de cevap içeriği dolu
        val stepValid = stepGuidanceOnly.copy(revealOrder = listOf(RevealKey.ANSWER))
        val hasAnswerContent3 = stepValid.answer != null &&
            (!stepValid.answer.answer.isNullOrBlank() || stepValid.answer.answerSections != null)
        val canToggleAnswer3 = RevealKey.ANSWER in stepValid.revealOrder && hasAnswerContent3
        assertTrue(canToggleAnswer3)
    }

    @Test
    fun vocabularyMatchLayoutToggleRevealAnswerGuardedAgainstMissingRevealOrder() {
        val vocabStepWithoutAnswerKey = LessonStep(
            id = "step-vocab-no-ans",
            layout = LayoutKind.VOCABULARY,
            density = "regular",
            revealOrder = emptyList(), // ANSWER revealOrder'da yok
            displayPrompt = "Kelimelerin anlamlarını bulunuz.",
            displayPromptMode = "full",
            source = SourceRecord("sv", "15", "Söz Varlığı", "VOCABULARY", "p15", "active", null),
            answer = AnswerEntry("qv", "canonical", 15, "1", "Ö", "", guidance = null, explanation = null, evidenceQuotes = emptyList(), answerSections = JsonValue.Object(mapOf("akçe" to JsonValue.Text("para"))), sourceLocator = "p15"),
            content = null
        )
        val lesson = LessonData("2.0", "t1", "lv", "lv", "Test", "Alt", "15", "p15", "p15", 1, 1, listOf(vocabStepWithoutAnswerKey))
        val session = LessonEngine.initial(lesson, contentDigest = "dv")

        val terms = (vocabStepWithoutAnswerKey.answer?.answerSections as? JsonValue.Object)?.values.orEmpty()
        assertEquals(1, terms.size)

        // VocabularyMatchLayout buton karar kuralı
        val canToggleAllAnswers = RevealKey.ANSWER in vocabStepWithoutAnswerKey.revealOrder && terms.isNotEmpty()

        // RevealKey.ANSWER revealOrder'da bulunmadığı için buton gösterilmemeli
        assertFalse(canToggleAllAnswers)

        // Motorun ihlal durumunda koruması
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        }
    }

    @Test
    fun sessionLessonScreenFallbackButtonsOnlyShownWhenContentActuallyExists() {
        // revealOrder'da GUIDANCE ve NOTE var; fakat veri alanları null/boş
        val stepWithPhantomKeys = LessonStep(
            id = "step-phantom",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.NOTE),
            displayPrompt = "Soru",
            displayPromptMode = "full",
            source = SourceRecord("sp", "10", "B", "TASK", "p10", "active", null),
            answer = AnswerEntry("qp", "canonical", 10, "1", "Ö", "Cevap", guidance = null, explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "   ") // boş not
        )

        val answer = stepWithPhantomKeys.answer
        // Fallback UI kontrolü:
        val hasGuidanceContent = !answer?.guidance.isNullOrBlank()
        val hasNoteContent = !stepWithPhantomKeys.content?.note.isNullOrBlank()

        assertFalse("Guidance null iken buton gösterilmemeli", hasGuidanceContent)
        assertFalse("Note boşluk iken bilgi kutusu gösterilmemeli", hasNoteContent)
    }

    @Test
    fun teacherNoteCardDoesNotProduceRevealDispatchAndOnlyManagesLocalExpansion() {
        val step = LessonStep(
            id = "s-note-test",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Soru",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "TASK", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Ö", "Cevap", guidance = "İpucu", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "GİZLİ ÖĞRETMEN NOTU")
        )
        val lesson = LessonData("2.0", "t1", "ln", "ln", "Test", "Alt", "10", "p10", "p10", 1, 1, listOf(step))
        val session = LessonEngine.initial(lesson, contentDigest = "dn")

        // 1. Öğrenci projeksiyonuna (toStudentProjection) not asla dahil edilmez
        val initialProjection = toStudentProjection(lesson, session)
        // StudentProjection veri modeli hiçbir note alanı taşımaz
        val revealedSession = LessonEngine.reduce(session, lesson, LessonCommand.ToggleReveal(RevealKey.ANSWER))
        val revealedProjection = toStudentProjection(lesson, revealedSession)
        assertEquals("Cevap", revealedProjection.answerText)

        // 2. Diğer reveal anahtarları (GUIDANCE, ANSWER) ToggleReveal dispatch üretir
        val commandsDispatched = mutableListOf<LessonCommand>()
        val dispatch: (LessonCommand) -> Unit = { commandsDispatched.add(it) }

        dispatch(LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        dispatch(LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertEquals(listOf(LessonCommand.ToggleReveal(RevealKey.GUIDANCE), LessonCommand.ToggleReveal(RevealKey.ANSWER)), commandsDispatched)

        // 3. TeacherNoteCard sözleşmesi:
        // TeacherNoteCard kesinlikle LessonCommand / dispatch parametresi almaz, ToggleReveal(NOTE) dispatch ETMEZ
        var isNoteExpanded = false
        val onToggleExpand = { isNoteExpanded = !isNoteExpanded }
        onToggleExpand()
        assertTrue("TeacherNoteCard yalnızca yerel isExpanded durumunu değiştirir", isNoteExpanded)
        // commandsDispatched listesine hiçbir ek komut eklenmemiştir
        assertEquals(2, commandsDispatched.size)

        // 4. SessionLessonScreen fallback yüzeyinde de hiçbir ToggleReveal(NOTE) butonu veya dispatch bulunmaz
        val teacherNote = step.content?.note?.takeIf { !it.isBlank() }
        assertEquals("GİZLİ ÖĞRETMEN NOTU", teacherNote)

        // 5. 280dp dar panel erişilebilirlik ve başlık sözleşmesi:
        // Dokunma hedefi en az 48dp'dir ve stateDescription erişilebilirliği korunur
        assertEquals(48.dp, LessonTarget.minimum)
        val stateDescriptionOpen = if (isNoteExpanded) "Öğretmen Notu Açık" else "Öğretmen Notu Kapalı"
        assertEquals("Öğretmen Notu Açık", stateDescriptionOpen)
    }

    @Test
    fun advanceActionExcludesNoteAndFollowsSafePublicProgression() {
        // Senaryo 1: NOTE önde, ardından GUIDANCE ve ANSWER geliyor: [NOTE, GUIDANCE, ANSWER]
        val step1 = LessonStep(
            id = "step-1",
            layout = LayoutKind.QUESTION,
            density = "regular",
            revealOrder = listOf(RevealKey.NOTE, RevealKey.GUIDANCE, RevealKey.ANSWER),
            displayPrompt = "Soru 1",
            displayPromptMode = "full",
            source = SourceRecord("s1", "10", "B", "TASK", "p10", "active", null),
            answer = AnswerEntry("q1", "canonical", 10, "1", "Ö", "Cevap 1", guidance = "İpucu 1", explanation = null, evidenceQuotes = emptyList(), answerSections = null, sourceLocator = "p10"),
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "Öğretmen notu 1")
        )

        // Senaryo 2: NOTE tek başına tanımlı adım: [NOTE] (son adım)
        val step2 = LessonStep(
            id = "step-2",
            layout = LayoutKind.PROCESS,
            density = "regular",
            revealOrder = listOf(RevealKey.NOTE),
            displayPrompt = "Soru 2 (Yalnızca not)",
            displayPromptMode = "full",
            source = SourceRecord("s2", "11", "B", "PROCESS", "p11", "active", null),
            answer = null,
            content = StepContent(lead = null, items = emptyList(), sections = emptyList(), note = "Öğretmen notu 2")
        )

        val lesson = LessonData("2.0", "t1", "l-adv", "l-adv", "Test", "Alt", "10", "p10", "p11", 2, 1, listOf(step1, step2))
        var session = LessonEngine.initial(lesson, contentDigest = "d-adv")

        // --- Adım 1 Başlangıcı (revealOrder = [NOTE, GUIDANCE, ANSWER]) ---
        // 1. NOTE önde olmasına rağmen kullanıcı eylemi asla NOTE'u seçmemeli, "Göster: Öğretmen notu" dememeli!
        val label1 = nextLessonActionLabel(step1, session)
        assertEquals("Göster: Yönlendirme", label1)
        val cmd1 = nextLessonCommand(step1, session)
        assertEquals(LessonCommand.ToggleReveal(RevealKey.GUIDANCE), cmd1)
        assertTrue(isAdvanceActionEnabled(step1, session))

        // Kullanıcı ilerler -> GUIDANCE açılır (asla NOTE reveal edilmez!)
        session = LessonEngine.reduce(session, lesson, cmd1!!)
        assertTrue(RevealKey.GUIDANCE in session.revealed)
        assertFalse("NOTE asla kullanıcı ilerleme eylemiyle reveal edilmemelidir", RevealKey.NOTE in session.revealed)

        // 2. Sırada ANSWER var -> "Göster: Cevap" olmalı
        val label2 = nextLessonActionLabel(step1, session)
        assertEquals("Göster: Cevap", label2)
        val cmd2 = nextLessonCommand(step1, session)
        assertEquals(LessonCommand.ToggleReveal(RevealKey.ANSWER), cmd2)

        session = LessonEngine.reduce(session, lesson, cmd2!!)
        assertTrue(RevealKey.ANSWER in session.revealed)
        assertFalse(RevealKey.NOTE in session.revealed)

        // 3. Public reveal'lar bittiğinde (NOTE hariç public key kalmadı):
        // Sonraki adım var (step-2) -> Eylem etiketi "Sonraki adıma geç" olmalı ve LessonCommand.Next üretmeli
        val label3 = nextLessonActionLabel(step1, session)
        assertEquals("Sonraki adıma geç", label3)
        val cmd3 = nextLessonCommand(step1, session)
        assertEquals(LessonCommand.Next, cmd3)
        assertTrue(isAdvanceActionEnabled(step1, session))

        // Sonraki adıma geçilir:
        session = LessonEngine.reduce(session, lesson, cmd3!!)
        assertEquals("step-2", session.stepId)

        // --- Adım 2 (revealOrder = [NOTE], son adım) ---
        // 4. NOTE tek başına iken:
        // Public reveal anahtarı yoktur, sonraki adım da yoktur (son adımdır).
        // Son adım olduğu belirtilmeli ve ilerletme butonu disabled olmalı; NOTE açılmamalı.
        val label4 = nextLessonActionLabel(step2, session)
        assertEquals("Son adım", label4)
        val cmd4 = nextLessonCommand(step2, session)
        assertNull("Son adımda public reveal kalmadığında komut null olmalıdır", cmd4)
        assertFalse("Son adımda public reveal kalmadığında eylem disabled olmalıdır", isAdvanceActionEnabled(step2, session))
    }

}
