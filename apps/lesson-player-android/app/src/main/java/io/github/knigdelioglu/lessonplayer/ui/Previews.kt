package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
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
import io.github.knigdelioglu.lessonplayer.player.LessonEngine
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.lesson.LessonTeacherAssistDrawer
import io.github.knigdelioglu.lessonplayer.ui.lesson.LessonTeacherAssistSheet
import io.github.knigdelioglu.lessonplayer.ui.lesson.LessonV2TeacherAssistPane
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonV2ActionBar
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonV2Header
import io.github.knigdelioglu.lessonplayer.ui.shell.LessonV2Sidebar
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme

// Data-backed screens require a validated APK asset and are previewed on the emulator.
// These lightweight previews cover chrome and loading without inventing lesson content.
@Preview(name = "01 · Loading", widthDp = 720, heightDp = 1000, showBackground = true)
@Composable
private fun LoadingPreview() {
    LessonTheme { androidx.compose.material3.Text("Dersler doğrulanıyor…") }
}

@Preview(name = "02 · Dark", widthDp = 1000, heightDp = 680, showBackground = true)
@Composable
private fun DarkPreview() {
    LessonTheme(darkTheme = true) {
        androidx.compose.material3.Text("Lesson Player · Android 16")
    }
}

@Preview(name = "03 · Medium tablet", widthDp = 840, heightDp = 900, showBackground = true)
@Composable
private fun MediumTabletPreview() {
    LessonTheme { WindowLayoutPreview(840, 900) }
}

private fun createPreviewSampleLesson(): LessonData {
    val step1 = LessonStep(
        id = "step-1",
        layout = LayoutKind.COMPARISON,
        density = "large",
        revealOrder = listOf(
            RevealKey.GUIDANCE,
            RevealKey.ANSWER,
            RevealKey.EXPLANATION,
            RevealKey.EVIDENCE,
            RevealKey.NOTE
        ),
        displayPrompt = "Tanzimat ve Servetifünun dönemi edebi metinlerini dil, tema ve biçim özellikleri açısından karşılaştırarak inceleyiniz.",
        displayPromptMode = "full",
        source = SourceRecord(
            id = "T11-S0101",
            printedPageRange = "12-13",
            bookHeading = "Metin Tahlili ve Karşılaştırma",
            taskType = "Metin Tahlili",
            sourceLocator = "p12-13",
            sourceStatus = "VERIFIED",
            prompt = "Metinleri karşılaştırınız."
        ),
        answer = AnswerEntry(
            questionId = "q-01",
            entryType = "canonical",
            printedPage = 12,
            questionNo = "1",
            promptSummary = "Tanzimat ve Servetifünun Karşılaştırması",
            answer = "Tanzimat 1. döneminde sanat toplum içindir ilkesi benimsenmiş ve dilde sadeleşme hedeflenmiştir. Servetifünun döneminde ise siyasi baskılar ve içe kapanma sebebiyle sanat için sanat anlayışı hakim olmuş, dil oldukça ağır ve ağdalı hale gelmiştir.",
            guidance = "Öğrencilere iki dönemin tarihsel ve toplumsal koşullarını hatırlatınız. Fransız edebiyatının etkilerini ve dönemin basım-yayın olanaklarını tartışmaya açınız.",
            explanation = "Tanzimat dönemi yazarları toplumu aydınlatmayı görev bilirken Servetifünun şairleri bireysel ızdırap ve melankoli temalarını öne çıkarmıştır. Bu farklılık biçim ve söz dağarcığına doğrudan yansımıştır.",
            evidenceQuotes = listOf(
                "«Vatan sevgisi imandandır diyerek milleti cehaletten kurtarma azmindeyiz.» (Namık Kemal)",
                "«Bir beyaz lerze, bir dumanlı uçuş; eşini gāib eyleyen bir kuş gibi kar...» (Tevfik Fikret)"
            ),
            answerSections = JsonValue.Object(
                mapOf(
                    "Sanat Anlayışı" to JsonValue.Text("Tanzimat: Toplum için · Servetifünun: Sanat için"),
                    "Dil ve Üslup" to JsonValue.Text("Tanzimat: Sadeleşme çabası · Servetifünun: Ağır, süslü, yeni tamlamalar"),
                    "Temel Temalar" to JsonValue.Text("Tanzimat: Vatan, hürriyet, adalet · Servetifünun: Aşk, tabiat, melankoli")
                )
            ),
            sourceLocator = "p12-13"
        ),
        content = StepContent(
            lead = "Aşağıdaki metin parçalarını okuyunuz ve dönemin edebiyat anlayışına göre karşılaştırma tablosunu oluşturunuz.",
            items = listOf(
                "1. Metin: Namık Kemal - Vatan Şiirinden bir kesit",
                "2. Metin: Cenap Şahabettin - Elhân-ı Şitâ şiirinden bir kesit"
            ),
            sections = listOf(
                SupplementalSection(
                    title = "1. Metin (Tanzimat Dönemi)",
                    body = "Vatanın bağrına düşman dayamış hançerini / Yoğ imiş kurtaracak bahtı kara mâderini..."
                ),
                SupplementalSection(
                    title = "2. Metin (Servetifünun Dönemi)",
                    body = "Bir beyaz lerze, bir dumanlı uçuş / Eşini gāib eyleyen bir kuş gibi kar / Geçen eyyâm-ı nev-bahârı arar..."
                )
            ),
            note = "ÖĞRETMEN NOTU: Öğrenciler Servetifünun dilini anlamakta zorlanırsa Arapça ve Farsça tamlamaların ('eyyâm-ı nev-bahâr') anlamına dikkat çekiniz."
        )
    )

    val step2 = LessonStep(
        id = "step-2",
        layout = LayoutKind.VOCABULARY,
        density = "regular",
        revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
        displayPrompt = "Metinde geçen bilinmeyen sözcüklerin anlamlarını bağlamdan tahmin ediniz.",
        displayPromptMode = "full",
        source = SourceRecord("T11-S0102", "14", "Söz Varlığı", "Söz Varlığı", "p14", "VERIFIED", null),
        answer = AnswerEntry("q-02", "canonical", 14, "2", "Kelime Anlamları", "Lerze: Titreme; Gāib: Kayıp", "Bağlam ipuçlarını kullanın.", null, emptyList(), null, "p14"),
        content = null
    )

    val step3 = LessonStep(
        id = "step-3",
        layout = LayoutKind.ASSESSMENT,
        density = "compact",
        revealOrder = listOf(RevealKey.GUIDANCE, RevealKey.ANSWER),
        displayPrompt = "Yazıcı metnindeki dil ve anlatım özelliklerinin anlama katkısını değerlendiriniz.",
        displayPromptMode = "full",
        source = SourceRecord("T11-S0103", "15", "Değerlendirme", "ASSESSMENT", "p15", "VERIFIED", null),
        answer = null,
        content = StepContent(
            lead = "Değerlendirirken aşağıdaki üç boyuta odaklanınız:",
            items = listOf(
                "Güldürü unsurlarının ortaya çıkmasına etkisi",
                "Kişiler arasındaki çatışmaların belirginleşmesine etkisi",
                "Dönemin toplumsal ve kültürel yapısını yansıtma gücü"
            ),
            sections = emptyList(),
            note = null
        )
    )

    return LessonData(
        schemaVersion = "2.0",
        themeId = "t1",
        lessonId = "lesson-tanzimat-servetifunun",
        lessonSlug = "tanzimat-servetifunun-karsilastirma",
        title = "Tanzimat ve Servetifünun Şiirinin Karşılaştırılması",
        subtitle = "11. Sınıf Türk Dili ve Edebiyatı · 1. Tema",
        printedPageRange = "12-16",
        requiredSourceFrom = "p12",
        requiredSourceTo = "p16",
        coverageSourceRecords = 3,
        coverageAnswerEntries = 2,
        steps = listOf(step1, step2, step3)
    )
}

private fun createPreviewSampleSession(lesson: LessonData): LessonSession {
    val initial = LessonEngine.initial(lesson, contentDigest = "preview-digest")
    return initial.copy(
        revealed = setOf(RevealKey.GUIDANCE, RevealKey.NOTE)
    )
}

@Preview(name = "05 · UI Shell V2 3-Column Tablet (Expanded)", widthDp = 1280, heightDp = 800, showBackground = true)
@Composable
private fun ShellV2ThreeColumnPreview() {
    val lesson = remember { createPreviewSampleLesson() }
    val session = remember { createPreviewSampleSession(lesson) }
    val currentStep = lesson.steps.first { it.id == session.stepId }

    LessonTheme {
        ExpandedLessonLayout(
            sidebar = { sidebarModifier ->
                LessonV2Sidebar(
                    currentScreen = AppScreen.LESSON,
                    onNavigate = {},
                    onSearch = {},
                    onReturnToCurrent = {},
                    session = session,
                    lesson = lesson,
                    onSelectStep = {},
                    modifier = sidebarModifier
                )
            },
            workspace = { workspaceModifier ->
                Column(modifier = workspaceModifier) {
                LessonV2Header(
                    currentScreen = AppScreen.LESSON,
                    lesson = lesson,
                    session = session
                )

                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    SessionLessonScreen(
                        lesson = lesson,
                        state = session,
                        dispatch = {},
                        isThreeColumn = true
                    )
                }

                LessonV2ActionBar(
                    step = currentStep,
                    session = session,
                    dispatch = {},
                    actionBusy = false
                )
                }
            },
            teacherAssist = { teacherModifier ->
                LessonV2TeacherAssistPane(
                    step = currentStep,
                    session = session,
                    modifier = teacherModifier
                )
            }
        )
    }
}

@Preview(name = "06 · UI Shell V2 Medium Tablet with Assist Drawer", widthDp = 900, heightDp = 600, showBackground = true)
@Composable
private fun ShellV2MediumDrawerPreview() {
    val lesson = remember { createPreviewSampleLesson() }
    val session = remember { createPreviewSampleSession(lesson) }
    val currentStep = lesson.steps.first { it.id == session.stepId }

    LessonTheme {
        Box(modifier = Modifier.fillMaxSize().background(LessonColors.AppBg)) {
            Column(modifier = Modifier.fillMaxSize()) {
                Surface(
                    modifier = Modifier.fillMaxWidth().height(64.dp),
                    color = LessonColors.Surface
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("11. Sınıf · Ders Ekranı", style = MaterialTheme.typography.titleMedium)
                        Text("Öğretmen Araçları (Açık)", color = LessonColors.Primary)
                    }
                }

                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    SessionLessonScreen(
                        lesson = lesson,
                        state = session,
                        dispatch = {},
                        isThreeColumn = false
                    )
                }
            }

            LessonTeacherAssistDrawer(
                step = currentStep,
                session = session,
                dismiss = {}
            )
        }
    }
}

@Preview(name = "07 · UI Shell V2 Portrait Compact with Assist Sheet", widthDp = 412, heightDp = 915, showBackground = true)
@Composable
private fun ShellV2PortraitSheetPreview() {
    val lesson = remember { createPreviewSampleLesson() }
    val session = remember { createPreviewSampleSession(lesson) }
    val currentStep = lesson.steps.first { it.id == session.stepId }

    LessonTheme {
        Box(modifier = Modifier.fillMaxSize().background(LessonColors.AppBg)) {
            SessionLessonScreen(
                lesson = lesson,
                state = session,
                dispatch = {},
                isThreeColumn = false
            )

            LessonTeacherAssistSheet(
                step = currentStep,
                session = session,
                dismiss = {}
            )
        }
    }
}

@Composable
private fun WindowLayoutPreview(widthDp: Int, heightDp: Int) {
    val layout = lessonWindowLayout(widthDp, heightDp)
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "${layout.widthClass} · ${if (layout.usesLessonOutline) "ders akışı + içerik" else "tek içerik"}",
                style = MaterialTheme.typography.titleMedium
            )
            Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (layout.usesRail) {
                    Surface(modifier = Modifier.width(72.dp), color = MaterialTheme.colorScheme.secondaryContainer) {}
                }
                if (layout.usesLessonOutline) {
                    Surface(modifier = Modifier.width(260.dp), color = MaterialTheme.colorScheme.surfaceVariant) {}
                }
                Surface(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.primaryContainer) {}
            }
        }
    }
}

@Preview(name = "08 · Teacher Assist Pane (280dp Narrow)", widthDp = 280, heightDp = 700, showBackground = true)
@Composable
private fun TeacherAssistPaneNarrowPreview() {
    val lesson = remember { createPreviewSampleLesson() }
    val session = remember { createPreviewSampleSession(lesson) }
    val currentStep = lesson.steps.first { it.id == session.stepId }

    LessonTheme {
        Box(modifier = Modifier.fillMaxSize().background(LessonColors.AppBg)) {
            LessonV2TeacherAssistPane(
                step = currentStep,
                session = session
            )
        }
    }
}
