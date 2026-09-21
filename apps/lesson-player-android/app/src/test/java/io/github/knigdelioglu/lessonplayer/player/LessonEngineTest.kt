package io.github.knigdelioglu.lessonplayer.player

import io.github.knigdelioglu.lessonplayer.content.AnswerEntry
import io.github.knigdelioglu.lessonplayer.content.JsonValue
import io.github.knigdelioglu.lessonplayer.content.LayoutKind
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.content.SourceRecord
import io.github.knigdelioglu.lessonplayer.content.StepContent
import org.junit.Assert.*
import org.junit.Test

class LessonEngineTest {
    private val source = SourceRecord("T01-S0004", "15", "Karagöz", "question",
        "pdf:15", "VERIFIED", null)
    private val answer = AnswerEntry("T1-P15-Q01", "question_answer", 15, "1",
        "Soru", "Cevap metni", "Yönlendirme", "Açıklama", listOf("Kanıt"),
        null, "pdf:15")
    private val first = LessonStep("s15-source-reminder", LayoutKind.PROCESS,
        "compact", listOf(RevealKey.NOTE), "Öğretmen süreci", "VERIFIED_SUMMARY",
        source, null, StepContent("Kurulum", listOf("Önce okuyun"), emptyList(),
            "Gizli öğretmen notu"))
    private val second = LessonStep("s15-q1", LayoutKind.QUESTION,
        "comfortable", listOf(RevealKey.GUIDANCE, RevealKey.ANSWER, RevealKey.EVIDENCE,
            RevealKey.EXPLANATION, RevealKey.NOTE),
        "Soru metni", "VERBATIM_SHORT", source, answer,
        StepContent(null, emptyList(), emptyList(), "Gizli öğretmen notu"))
    private val vocab = LessonStep("s25-q1", LayoutKind.VOCABULARY,
        "comfortable", listOf(RevealKey.ANSWER), "Anlamını tahmin edin",
        "VERBATIM_SHORT", source, answer.copy(
            answerSections = JsonValue.Object(mapOf("söz" to JsonValue.Text("Anlam")))),
        null)
    private val lesson = LessonData("1", "TEMA_01", "T11-T01-KARAGOZ", "karagoz",
        "Karagöz", "Tiyatro", "15-35", "T01-S0004", "T01-S0010",
        7, 2, listOf(first, second, vocab))
    private val digest = "unit-content-digest"

    @Test fun navigationAndStableStepIdMatchWebContract() {
        var state = LessonEngine.initial(lesson, digest)
        assertEquals(first.id, state.stepId)
        state = LessonEngine.reduce(state, lesson, LessonCommand.Next)
        assertEquals(second.id, state.stepId)
        state = LessonEngine.reduce(state, lesson,
            LessonCommand.ToggleReveal(RevealKey.GUIDANCE))
        assertEquals(setOf(RevealKey.GUIDANCE), state.revealed)
        state = LessonEngine.reduce(state, lesson, LessonCommand.Next)
        assertEquals(vocab.id, state.stepId)
        assertTrue(state.revealed.isEmpty())
        assertEquals(vocab.id, LessonEngine.reduce(state, lesson, LessonCommand.Next).stepId)
        assertEquals(second.id, LessonEngine.reduce(state, lesson, LessonCommand.Previous).stepId)
        assertEquals("s15-q1", LessonEngine.restoredStepId(state.order,
            "missing", "s15-q1", 0))
        assertEquals(vocab.id, LessonEngine.restoredStepId(state.order,
            null, null, 100))
    }

    @Test fun revealNextFollowsConfiguredSequenceThenAdvances() {
        var state = LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson,
            LessonCommand.GoToStep(second.id))
        for (key in second.revealOrder) {
            state = LessonEngine.reduce(state, lesson, LessonCommand.RevealNext)
            assertTrue(key in state.revealed)
        }
        state = LessonEngine.reduce(state, lesson, LessonCommand.RevealNext)
        assertEquals(vocab.id, state.stepId)
        assertTrue(state.revealed.isEmpty())
    }

    @Test fun vocabularyIndividualAndAllMeanings() {
        var state = LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson,
            LessonCommand.GoToStep(vocab.id))
        state = LessonEngine.reduce(state, lesson, LessonCommand.ToggleTerm(vocab.id, "söz"))
        assertEquals(setOf("söz"), state.vocabularyTerms[vocab.id])
        assertEquals(JsonValue.Text("Anlam"),
            toStudentProjection(lesson, state).visibleVocabulary["söz"])
        state = LessonEngine.reduce(state, lesson,
            LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertEquals(state, LessonEngine.reduce(state, lesson,
            LessonCommand.ToggleTerm(vocab.id, "söz")))
    }

    @Test fun customOrderResetAndProjectionNeverLeakTeacherNote() {
        var state = LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson,
            LessonCommand.GoToStep(second.id))
        state = LessonEngine.reduce(state, lesson, LessonCommand.MoveStep(second.id, -1))
        assertEquals(listOf(second.id, first.id, vocab.id), state.order)
        assertEquals(second.id, state.stepId)
        state = LessonEngine.reduce(state, lesson,
            LessonCommand.ToggleReveal(RevealKey.NOTE))
        assertFalse(toStudentProjection(lesson, state).toString()
            .contains("Gizli öğretmen notu"))
        assertNull(toStudentProjection(lesson, state).answerText)
        state = LessonEngine.reduce(state, lesson,
            LessonCommand.ToggleReveal(RevealKey.ANSWER))
        assertEquals("Cevap metni", toStudentProjection(lesson, state).answerText)
        assertNull(toStudentProjection(lesson, state).prompt)
        assertFalse(toStudentProjection(lesson, state).toString()
            .contains("Gizli öğretmen notu"))
        state = LessonEngine.reduce(state, lesson, LessonCommand.ResetLessonPresentation)
        assertEquals(listOf(first.id, second.id, vocab.id), state.order)
        assertTrue(state.overrides.isEmpty())
    }

    @Test fun invalidPermutationAndRevealRejected() {
        assertFalse(LessonEngine.validOrder(listOf(first.id, first.id, second.id), lesson))
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson,
                LessonCommand.ToggleReveal(RevealKey.ANSWER))
        }
        assertThrows(IllegalArgumentException::class.java) {
            LessonEngine.reduce(LessonEngine.initial(lesson, digest), lesson,
                LessonCommand.ApplyOverride(first.id,
                    StepOverride(revealOrder = listOf(RevealKey.ANSWER))))
        }
    }
}
