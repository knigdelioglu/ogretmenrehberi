package io.github.knigdelioglu.lessonplayer

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.ContentSource
import io.github.knigdelioglu.lessonplayer.storage.ClassGroup
import io.github.knigdelioglu.lessonplayer.storage.ClassLessonProgressRow
import io.github.knigdelioglu.lessonplayer.storage.LessonDatabase
import io.github.knigdelioglu.lessonplayer.storage.LessonStore
import io.github.knigdelioglu.lessonplayer.ui.AppScreen
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonV2Sidebar
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import java.io.IOException

class ClassGroupResumePlayTest {
    @get:Rule val composeRule = createComposeRule()

    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private fun offlineRepository() = ContentRepository(
        context, remoteSource = ContentSource { throw IOException("offline test") }
    )

    @Test
    fun multiClassIsolatedAuthoritativeResumeLogic() = runBlocking {
        val bundle = offlineRepository().load().bundle
        val lesson1 = bundle.lessons[0]
        val lesson2 = bundle.lessons[1]

        val db = Room.inMemoryDatabaseBuilder(context, LessonDatabase::class.java).build()
        try {
            val store = LessonStore(db)

            val group11A = ClassGroup("11A", "2026-2027", 11, "A", "11-A", false, 1)
            val group11B = ClassGroup("11B", "2026-2027", 11, "B", "11-B", false, 2)
            val group11C = ClassGroup("11C", "2026-2027", 11, "C", "11-C", false, 3)

            store.saveClassGroup(group11A)
            store.saveClassGroup(group11B)
            store.saveClassGroup(group11C)

            val step11A = lesson1.steps[1].id
            val step11B = lesson2.steps[2].id

            // Record progress for 11A on lesson 1, step 1
            db.dao().upsertClassProgress(
                ClassLessonProgressRow(
                    classGroupId = "11A",
                    lessonId = lesson1.lessonId,
                    contentDigest = bundle.lessonDigest(lesson1.lessonId),
                    stepId = step11A,
                    updatedAtMillis = 1000L
                )
            )

            // Record progress for 11B on lesson 2, step 2
            db.dao().upsertClassProgress(
                ClassLessonProgressRow(
                    classGroupId = "11B",
                    lessonId = lesson2.lessonId,
                    contentDigest = bundle.lessonDigest(lesson2.lessonId),
                    stepId = step11B,
                    updatedAtMillis = 2000L
                )
            )

            // Group 11C has NO records in class_lesson_progress (empty state)

            // 1. Authoritative check for 11A
            val progress11A = store.allClassProgressForGroup("11A")
            val latest11A = progress11A.maxByOrNull { it.updatedAtMillis }
            assertNotNull(latest11A)
            assertEquals(lesson1.lessonId, latest11A!!.lessonId)
            assertEquals(step11A, latest11A.stepId)

            val restored11A = store.restore("11A", lesson1, bundle.lessonDigest(lesson1.lessonId))
            assertEquals(step11A, restored11A.stepId)

            // 2. Authoritative check for 11B
            val progress11B = store.allClassProgressForGroup("11B")
            val latest11B = progress11B.maxByOrNull { it.updatedAtMillis }
            assertNotNull(latest11B)
            assertEquals(lesson2.lessonId, latest11B!!.lessonId)
            assertEquals(step11B, latest11B.stepId)

            val restored11B = store.restore("11B", lesson2, bundle.lessonDigest(lesson2.lessonId))
            assertEquals(step11B, restored11B.stepId)

            // 3. Authoritative check for 11C (empty state)
            val progress11C = store.allClassProgressForGroup("11C")
            val latest11C = progress11C.maxByOrNull { it.updatedAtMillis }
            assertNull("11C must have no saved progress", latest11C)

            // 11C must NEVER fall back to 11A or 11B progress
            assertEquals(0, progress11C.size)
        } finally {
            db.close()
        }
    }

    @Test
    fun sidebarPlayButtonReflectsActiveClassAndEmptyState() {
        val group11A = ClassGroup("11A", "2026-2027", 11, "A", "11-A", false, 1)
        val group11B = ClassGroup("11B", "2026-2027", 11, "B", "11-B", false, 2)
        val group11C = ClassGroup("11C", "2026-2027", 11, "C", "11-C", false, 3)

        var activeGroup by mutableStateOf(group11A)
        var hasProgress by mutableStateOf(true)
        var resumedGroupId by mutableStateOf<String?>(null)

        composeRule.setContent {
            LessonV2Sidebar(
                currentScreen = AppScreen.LIBRARY,
                onNavigate = {},
                session = null,
                lesson = null,
                onSelectStep = {},
                activeClassGroup = activeGroup,
                classGroups = listOf(group11A, group11B, group11C),
                hasSavedProgress = hasProgress,
                onResumeClassGroup = { resumedGroupId = it }
            )
        }

        // 1. "Kaldığım Yer" butonu sol bloktan tamamen kaldırılmıştır
        composeRule.onNodeWithTag("quick-access-current-lesson").assertDoesNotExist()

        // 2. 11A seçiliyken play butonu görünür, etkindir ve 11A'ya özel erişilebilir açıklamaya sahiptir
        composeRule.onNodeWithTag("sidebar-class-group-resume-button")
            .assertIsDisplayed()
            .assertContentDescriptionEquals("11-A kaldığı yerden devam et")
            .performClick()

        assertEquals("11A", resumedGroupId)

        // 3. Aktif şube 11C'ye (boş durum) geçtiğinde play butonu pasif olmalı ve boş durumu bildirmelidir
        activeGroup = group11C
        hasProgress = false
        composeRule.waitForIdle()

        composeRule.onNodeWithTag("sidebar-class-group-resume-button")
            .assertIsDisplayed()
            .assertIsNotEnabled()
            .assertContentDescriptionEquals("11-C için kayıtlı ilerleme yok")

        // 4. Aktif şube 11B'ye geçtiğinde play butonu anında güncellenmeli ve 11B'yi açmalıdır
        activeGroup = group11B
        hasProgress = true
        composeRule.waitForIdle()

        composeRule.onNodeWithTag("sidebar-class-group-resume-button")
            .assertIsDisplayed()
            .assertContentDescriptionEquals("11-B kaldığı yerden devam et")
            .performClick()

        assertEquals("11B", resumedGroupId)
    }
}
