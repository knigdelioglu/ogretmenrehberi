package io.github.knigdelioglu.lessonplayer.teacher

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TeacherPlanMarksTest {
    @Test
    fun tracksRemainIndependentWhenOneMarkChanges() {
        val initial = TeacherPlanMarks(
            workshop = setOf("t1-speaking"),
            annual = setOf("book-1")
        )

        val next = initial.updated(
            TeacherTrack.PORTFOLIO,
            setOf("task:t1-speaking")
        )

        assertTrue(next.contains(TeacherTrack.WORKSHOP, "t1-speaking"))
        assertTrue(next.contains(TeacherTrack.ANNUAL, "book-1"))
        assertTrue(next.contains(TeacherTrack.PORTFOLIO, "task:t1-speaking"))
        assertFalse(next.contains(TeacherTrack.PORTFOLIO, "book-1"))
    }
}
