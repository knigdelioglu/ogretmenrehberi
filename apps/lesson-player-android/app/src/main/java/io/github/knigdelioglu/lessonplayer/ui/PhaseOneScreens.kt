package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.content.LessonData
import io.github.knigdelioglu.lessonplayer.player.BackupUiState
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonShape
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanMarks
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanUiState
import io.github.knigdelioglu.lessonplayer.teacher.TeacherTrack

@Composable
internal fun PhaseOneScreen(
    screen: AppScreen,
    bundle: LessonBundle,
    session: LessonSession,
    selectLesson: (String) -> Unit,
    navigateToCurrent: () -> Unit,
    dispatch: (LessonCommand) -> Unit,
    actionState: LessonActionUiState,
    retryLastAction: () -> Unit,
    teacherPlan: TeacherPlanUiState,
    toggleTeacherMark: (TeacherTrack, String) -> Unit,
    backupState: BackupUiState,
    beginExport: (String) -> Unit,
    beginImport: (String) -> Unit,
    openLessonOutline: (() -> Unit)? = null,
    openTeacherAssist: (() -> Unit)? = null,
    librarySearchFocusRequest: Int = 0
) {
    when (screen) {
        AppScreen.LIBRARY -> LibraryScreen(
            bundle,
            session,
            selectLesson,
            navigateToCurrent,
            librarySearchFocusRequest
        )
        AppScreen.LESSON -> SessionLessonScreen(
            lesson = bundle.byId.getValue(session.lessonId),
            state = session,
            dispatch = dispatch,
            actionState = actionState,
            retryLastAction = retryLastAction,
            openLessonOutline = openLessonOutline,
            openTeacherAssist = openTeacherAssist
        )
        AppScreen.GUIDE -> GuideScreen(bundle, teacherPlan, toggleTeacherMark)
        AppScreen.SETTINGS -> SettingsScreen(bundle, backupState, beginExport, beginImport)
    }
}

/**
 * Wide-tablet step navigator. The lesson surface keeps its own scroll position
 * while this compact list provides stable context and direct step navigation.
 */
@Composable
internal fun LessonOutlinePane(
    lesson: LessonData,
    session: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    enabled: Boolean = true
) {
    val listState = rememberLazyListState()
    ScrollOutlineToCurrentStep(session, listState)
    Surface(
        modifier = Modifier.fillMaxHeight().widthIn(min = 240.dp, max = 300.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    ) {
        Column(
            modifier = Modifier.padding(LessonSpacing.medium),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text("DERS AKIŞI", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary)
            Text(
                lesson.title,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "${session.order.size} adım · seçili ${session.order.indexOf(session.stepId) + 1}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            LessonOutlineRows(
                lesson = lesson,
                session = session,
                dispatch = dispatch,
                listState = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                enabled = enabled
            )
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
internal fun LessonOutlineSheet(
    lesson: LessonData,
    session: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    dismiss: () -> Unit,
    enabled: Boolean = true
) {
    val listState = rememberLazyListState()
    ScrollOutlineToCurrentStep(session, listState)
    ModalBottomSheet(
        onDismissRequest = dismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.86f)
                .padding(horizontal = LessonSpacing.medium),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text("DERS AKIŞI", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary)
            Text(lesson.title, style = MaterialTheme.typography.titleLarge,
                maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                "${session.order.size} adım · seçili ${session.order.indexOf(session.stepId) + 1} · basılı s. ${lesson.steps.first { it.id == session.stepId }.source.printedPageRange}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            LessonOutlineRows(
                lesson = lesson,
                session = session,
                dispatch = dispatch,
                listState = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                enabled = enabled,
                onStepSelected = dismiss
            )
        }
    }
}

@Composable
private fun ScrollOutlineToCurrentStep(session: LessonSession, listState: LazyListState) {
    LaunchedEffect(session.stepId, session.order) {
        val selectedIndex = session.order.indexOf(session.stepId)
        if (selectedIndex >= 0) listState.animateScrollToItem(selectedIndex)
    }
}

@Composable
private fun LessonOutlineRows(
    lesson: LessonData,
    session: LessonSession,
    dispatch: (LessonCommand) -> Unit,
    listState: LazyListState,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onStepSelected: () -> Unit = {}
) {
    LazyColumn(
        modifier = modifier,
        state = listState,
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
    ) {
        itemsIndexed(session.order, key = { _, stepId -> stepId }) { index, stepId ->
            val step = lesson.steps.first { it.id == stepId }
            val isSelected = stepId == session.stepId
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface.copy(alpha = 0.55f),
                border = if (isSelected) BorderStroke(
                    2.dp, MaterialTheme.colorScheme.primary
                ) else null
            ) {
                TextButton(
                    enabled = enabled,
                    onClick = {
                        dispatch(LessonCommand.GoToStep(stepId))
                        onStepSelected()
                    },
                    modifier = Modifier.fillMaxWidth()
                        .semantics {
                            selected = isSelected
                            stateDescription = if (isSelected) {
                                "Seçili adım ${index + 1}"
                            } else "Adım ${index + 1}"
                        }
                        .testTag("lesson-outline-step-${index + 1}")
                        .heightIn(min = LessonTarget.minimum),
                    contentPadding = PaddingValues(
                        horizontal = LessonSpacing.small,
                        vertical = LessonSpacing.tiny
                    )
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start,
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                    ) {
                        Text(
                            if (isSelected) "✓ SEÇİLİ · ${index + 1}. ${step.displayPrompt}"
                            else "${index + 1}. ${step.displayPrompt}",
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer
                            else MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            "Basılı kitap s. ${step.source.printedPageRange} · ${step.layout.wire}",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer
                            else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusTag(label: String = "ÇEVRİMDIŞI DERS PAKETİ") {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        shape = RoundedCornerShape(LessonShape.chip)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun SectionCard(
    eyebrow: String,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(LessonShape.card),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(LessonSpacing.large),
            verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Text(
                eyebrow,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.secondary
            )
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            action?.invoke()
        }
    }
}

@Composable
internal fun LibraryScreen(
    bundle: LessonBundle,
    session: LessonSession,
    selectLesson: (String) -> Unit,
    navigateToCurrent: () -> Unit,
    searchFocusRequest: Int = 0
) {
    var searchQuery by rememberSaveable { mutableStateOf("") }
    val searchFieldFocusRequester = remember { FocusRequester() }
    var selectedLessonId by rememberSaveable(session.lessonId) {
        mutableStateOf(session.lessonId)
    }
    val query = searchQuery.trim()
    val visibleLessonsByTheme = bundle.workflow.themes.associate { theme ->
        theme.id to bundle.byTheme[theme.id].orEmpty().filter { lesson ->
            query.isBlank() ||
                theme.title.contains(query, ignoreCase = true) ||
                listOf(
                    lesson.title,
                    lesson.subtitle,
                    lesson.lessonId,
                    lesson.printedPageRange
                ).any { value -> value.contains(query, ignoreCase = true) }
        }
    }
    val visibleLessonCount = visibleLessonsByTheme.values.sumOf { it.size }
    val selectedLesson = bundle.byId[selectedLessonId]
        ?: bundle.byId.getValue(session.lessonId)
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    LaunchedEffect(searchFocusRequest) {
        if (searchFocusRequest > 0) {
            searchFieldFocusRequester.requestFocus()
            keyboardController?.show()
        }
    }
    BoxWithConstraints(
        modifier = Modifier.fillMaxSize().testTag("library-screen-surface")
            .pointerInput(focusManager, keyboardController) {
            detectTapGestures {
                focusManager.clearFocus(force = true)
                keyboardController?.hide()
            }
        }
    ) {
        if (usesTwoPaneLibrary(maxWidth.value, maxHeight.value)) {
            Row(
                modifier = Modifier.fillMaxSize().padding(LessonSpacing.large),
                horizontalArrangement = Arrangement.spacedBy(LessonSpacing.large)
            ) {
                Column(
                    modifier = Modifier.weight(1.25f).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth()
                            .focusRequester(searchFieldFocusRequester)
                            .testTag("library-search-field"),
                        label = { Text("Ders ara") },
                        supportingText = { Text("Başlık, tema, sayfa veya ders kodu") },
                        singleLine = true
                    )
                    LazyColumn(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentPadding = PaddingValues(bottom = LessonSpacing.medium),
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
                    ) {
                        if (visibleLessonCount == 0) {
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                                    Text("Ders bulunamadı", style = MaterialTheme.typography.titleLarge)
                                    Text("Arama metnini değiştirerek tekrar deneyin.",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    TextButton(onClick = { searchQuery = "" }) {
                                        Text("Aramayı temizle")
                                    }
                                }
                            }
                        }
                        bundle.workflow.themes.forEach { theme ->
                            val lessons = visibleLessonsByTheme[theme.id].orEmpty()
                            if (lessons.isNotEmpty()) {
                                item(key = "theme:${theme.id}") {
                                    Text(
                                        theme.title,
                                        style = MaterialTheme.typography.titleLarge,
                                        modifier = Modifier.padding(
                                            top = LessonSpacing.medium,
                                            bottom = LessonSpacing.tiny
                                        )
                                    )
                                }
                                items(lessons, key = { it.lessonId }) { lesson ->
                                    LibraryLessonRow(
                                        lesson = lesson,
                                        selected = selectedLesson.lessonId == lesson.lessonId,
                                        onClick = { selectedLessonId = lesson.lessonId }
                                    )
                                }
                            }
                        }
                    }
                }
                LibraryLessonDetails(
                    lesson = selectedLesson,
                    themeTitle = bundle.workflow.themes.firstOrNull {
                        it.id == selectedLesson.themeId
                    }?.title.orEmpty(),
                    isCurrentLesson = selectedLesson.lessonId == session.lessonId,
                    session = session,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onOpen = { selectLesson(selectedLesson.lessonId) },
                    onContinue = navigateToCurrent
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(LessonSpacing.large),
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
            ) {
                item {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth()
                            .focusRequester(searchFieldFocusRequester)
                            .testTag("library-search-field"),
                        label = { Text("Ders ara") },
                        supportingText = { Text("Başlık, tema, sayfa veya ders kodu") },
                        singleLine = true
                    )
                }
                item {
                    SectionCard(
                        eyebrow = "KALDIĞIN YER",
                        title = bundle.byId.getValue(session.lessonId).title,
                        description = "Adım ${session.order.indexOf(session.stepId) + 1} /${session.order.size}",
                        action = {
                            Button(
                                onClick = navigateToCurrent,
                                modifier = Modifier.heightIn(min = LessonTarget.minimum)
                            ) { Text("Derse devam et") }
                        }
                    )
                }
                if (visibleLessonCount == 0) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                            Text("Ders bulunamadı", style = MaterialTheme.typography.titleLarge)
                            Text("Arama metnini değiştirerek tekrar deneyin.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            TextButton(onClick = { searchQuery = "" }) {
                                Text("Aramayı temizle")
                            }
                        }
                    }
                }
                bundle.workflow.themes.forEach { theme ->
                    val lessons = visibleLessonsByTheme[theme.id].orEmpty()
                    if (lessons.isNotEmpty()) {
                        item {
                            Text(theme.title, style = MaterialTheme.typography.headlineMedium,
                                modifier = Modifier.padding(top = LessonSpacing.medium))
                        }
                        items(lessons, key = { it.lessonId }) { lesson ->
                            SectionCard(
                                eyebrow = "11. SINIF · ${theme.id} · BASILI s. ${lesson.printedPageRange}",
                                title = lesson.title,
                                description = "${lesson.steps.size} adım · ${lesson.subtitle}",
                                action = {
                                    Button(
                                        onClick = { selectLesson(lesson.lessonId) },
                                        modifier = Modifier.heightIn(min = LessonTarget.minimum)
                                            .testTag("library-lesson-open")
                                    ) { Text("Adımları incele") }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

internal fun usesTwoPaneLibrary(widthDp: Float, heightDp: Float): Boolean =
    widthDp > heightDp && widthDp >= 900f

internal fun backupPassphraseVisualTransformation(showPassphrase: Boolean): VisualTransformation =
    if (showPassphrase) VisualTransformation.None else PasswordVisualTransformation()

@Composable
private fun LibraryLessonRow(lesson: LessonData, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(LessonShape.card),
        color = if (selected) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface,
        border = if (selected) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        TextButton(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth().heightIn(min = 76.dp)
                .semantics {
                    this.selected = selected
                    stateDescription = if (selected) "Seçili ders" else "Dersi seç"
                },
            contentPadding = PaddingValues(LessonSpacing.small)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start,
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.tiny)
            ) {
                Text(
                    "11. SINIF · BASILI s. ${lesson.printedPageRange}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    if (selected) "✓ ${lesson.title}" else lesson.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(lesson.subtitle, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun LibraryLessonDetails(
    lesson: LessonData,
    themeTitle: String,
    isCurrentLesson: Boolean,
    session: LessonSession,
    modifier: Modifier = Modifier,
    onOpen: () -> Unit,
    onContinue: () -> Unit
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(LessonShape.card),
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(modifier = Modifier.padding(LessonSpacing.large)) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)
            ) {
                item {
                    Text(themeTitle.uppercase(), style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.secondary)
                    Text(lesson.title, style = MaterialTheme.typography.headlineMedium)
                    Text(lesson.subtitle, style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item {
                    SectionCard(
                        eyebrow = "DERS BİLGİSİ",
                        title = "Basılı kitap s. ${lesson.printedPageRange}",
                        description = "${lesson.steps.size} adım · ${lesson.coverageAnswerEntries} cevap kaydı"
                    )
                }
                if (isCurrentLesson) {
                    item {
                        SectionCard(
                            eyebrow = "DERS İLERLEMESİ",
                            title = "Kaldığın adım",
                            description = "${session.order.indexOf(session.stepId) + 1} / ${session.order.size} · basılı s. ${lesson.steps.first { it.id == session.stepId }.source.printedPageRange}"
                        )
                    }
                }
            }
            Button(
                onClick = if (isCurrentLesson) onContinue else onOpen,
                modifier = Modifier.fillMaxWidth().padding(top = LessonSpacing.medium)
                    .heightIn(min = LessonTarget.minimum)
                    .testTag("library-lesson-open")
            ) {
                Text(if (isCurrentLesson) "Derse devam et" else "Derse başla")
            }
        }
    }
}

@Composable
internal fun GuideScreen(
    bundle: LessonBundle,
    planState: TeacherPlanUiState,
    toggleMark: (TeacherTrack, String) -> Unit
) {
    val marks = (planState as? TeacherPlanUiState.Ready)?.marks ?: TeacherPlanMarks()
    val themeTitleById = bundle.workflow.themes.associate { it.id to it.title }
    val workshopTotal = bundle.workflow.themes.sumOf { it.tasks.size }
    val annualTotal = bundle.workflow.annualItems.size
    val portfolioIds = buildList {
        bundle.workflow.themes.forEach { theme ->
            addAll(theme.tasks.map { "task:${it.id}" })
            add("reflection:${theme.id}")
        }
        addAll(bundle.workflow.annualItems.map { "annual:${it.id}" })
    }
    val portfolioDone = portfolioIds.count { marks.contains(TeacherTrack.PORTFOLIO, it) }
    val warning = (planState as? TeacherPlanUiState.Error)?.message
        ?: (planState as? TeacherPlanUiState.Ready)?.warning
    var selectedTrack by rememberSaveable { mutableStateOf(TeacherTrack.WORKSHOP) }

    LazyColumn(
        modifier = Modifier.testTag("teacher-guide-list"),
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item {
            StatusTag("ÖĞRETMEN PLANLAMA")
            Text(
                "Üç ayrı takip hattı",
                modifier = Modifier.padding(top = LessonSpacing.medium),
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                "Bu işaretler yalnızca bu cihazdaki öğretmen planına aittir; öğrenci teslimi veya not kaydı değildir.",
                style = MaterialTheme.typography.bodyLarge
            )
            Text(
                "Atölye ${marks.workshop.size}/$workshopTotal · Yıllık çalışma ${marks.annual.size}/$annualTotal · Portfolyo $portfolioDone/${portfolioIds.size}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            warning?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }
        item {
            TabRow(selectedTabIndex = selectedTrack.ordinal) {
                Tab(
                    selected = selectedTrack == TeacherTrack.WORKSHOP,
                    onClick = { selectedTrack = TeacherTrack.WORKSHOP },
                    text = { Text("Atölye") }
                )
                Tab(
                    selected = selectedTrack == TeacherTrack.ANNUAL,
                    onClick = { selectedTrack = TeacherTrack.ANNUAL },
                    text = { Text("Yıllık plan") }
                )
                Tab(
                    selected = selectedTrack == TeacherTrack.PORTFOLIO,
                    onClick = { selectedTrack = TeacherTrack.PORTFOLIO },
                    text = { Text("Portfolyo") }
                )
            }
        }
        if (selectedTrack == TeacherTrack.WORKSHOP) {
            item {
                SectionCard(
                eyebrow = "1 · EDEBİYAT ATÖLYESİ",
                title = "Uygulama ve değerlendirme",
                description = "${marks.workshop.size}/$workshopTotal plan işareti",
                action = {
                    Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                        bundle.workflow.themes.forEach { theme ->
                            Text(
                                theme.title,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(top = LessonSpacing.small)
                            )
                            theme.tasks.forEach { task ->
                                TeacherMarkRow(
                                    label = "${task.skill} · ${task.title}",
                                    checked = marks.contains(TeacherTrack.WORKSHOP, task.id),
                                    onCheckedChange = {
                                        toggleMark(TeacherTrack.WORKSHOP, task.id)
                                    }
                                )
                            }
                        }
                    }
                }
                )
            }
        }
        if (selectedTrack == TeacherTrack.ANNUAL) {
            item {
                SectionCard(
                eyebrow = "2 · DÖRT ESER + BİR FİLM",
                title = "Yıllık sunum planı",
                description = "${marks.annual.size}/$annualTotal plan işareti",
                action = {
                    Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                        bundle.workflow.annualItems.forEach { item ->
                            TeacherMarkRow(
                                label = "${item.title} · ${themeTitleById[item.recommendedThemeId] ?: item.recommendedThemeId}",
                                checked = marks.contains(TeacherTrack.ANNUAL, item.id),
                                onCheckedChange = {
                                    toggleMark(TeacherTrack.ANNUAL, item.id)
                                }
                            )
                        }
                    }
                }
                )
            }
        }
        if (selectedTrack == TeacherTrack.PORTFOLIO) {
            item {
                SectionCard(
                eyebrow = "3 · PORTFOLYO VE DEĞERLENDİRME",
                title = "Kanıt ve yansıtma takibi",
                description = "$portfolioDone/${portfolioIds.size} kanıt işareti",
                action = {
                    Column(verticalArrangement = Arrangement.spacedBy(LessonSpacing.small)) {
                        bundle.workflow.themes.forEach { theme ->
                            Text(
                                theme.title,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(top = LessonSpacing.small)
                            )
                            theme.tasks.forEach { task ->
                                TeacherMarkRow(
                                    label = "${task.skill} portfolyosu · ${task.title}",
                                    checked = marks.contains(
                                        TeacherTrack.PORTFOLIO, "task:${task.id}"
                                    ),
                                    onCheckedChange = {
                                        toggleMark(
                                            TeacherTrack.PORTFOLIO, "task:${task.id}"
                                        )
                                    }
                                )
                            }
                            TeacherMarkRow(
                                label = "Tema sonu yansıtma · ${theme.reflectionTitle}",
                                checked = marks.contains(
                                    TeacherTrack.PORTFOLIO, "reflection:${theme.id}"
                                ),
                                onCheckedChange = {
                                    toggleMark(
                                        TeacherTrack.PORTFOLIO, "reflection:${theme.id}"
                                    )
                                }
                            )
                            bundle.workflow.annualItems
                                .filter { it.recommendedThemeId == theme.id }
                                .forEach { item ->
                                    TeacherMarkRow(
                                        label = "${item.title} · Ek-1 ve sunu",
                                        checked = marks.contains(
                                            TeacherTrack.PORTFOLIO, "annual:${item.id}"
                                        ),
                                        onCheckedChange = {
                                            toggleMark(
                                                TeacherTrack.PORTFOLIO, "annual:${item.id}"
                                            )
                                        }
                                    )
                                }
                        }
                    }
                }
                )
            }
        }
    }
}

@Composable
private fun TeacherMarkRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth()
            .heightIn(min = LessonTarget.minimum)
            .toggleable(
                value = checked,
                role = Role.Checkbox,
                onValueChange = onCheckedChange
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = null
        )
        Text(
            label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
internal fun SettingsScreen(
    bundle: LessonBundle,
    backupState: BackupUiState,
    beginExport: (String) -> Unit,
    beginImport: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.testTag("settings-list"),
        contentPadding = PaddingValues(LessonSpacing.large),
        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
    ) {
        item { StatusTag("UYGULAMA VE VERİ") }
        item {
            Text("Tablet için tasarlandı", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Görünüm Android'in açık/koyu sistem temasını takip eder.",
                style = MaterialTheme.typography.bodyLarge
            )
        }
        item {
            SectionCard(
                eyebrow = "KAYNAK BÜTÜNLÜĞÜ",
                title = "Doğrulanmış ders paketi",
                description = "${bundle.lessons.size} ders · SHA-256: ${bundle.contentSha256.take(16)}…"
            )
        }
        item {
            BackupSection(backupState, beginExport, beginImport)
        }
        item {
            SectionCard(
                eyebrow = "YEREL VERİ",
                title = "İnternetsiz katalog",
                description = "Ders paketi APK içinde okunur. Kişisel ilerleme ve öğretmen düzenlemeleri yerelde tutulur; kanonik içerik değişmez."
            )
        }
    }
}


@Composable
private fun BackupSection(
    backupState: BackupUiState,
    beginExport: (String) -> Unit,
    beginImport: (String) -> Unit
) {
    var passphrase by androidx.compose.runtime.saveable.rememberSaveable { 
        androidx.compose.runtime.mutableStateOf("")
    }
    var showPassphrase by rememberSaveable { mutableStateOf(false) }
    SectionCard(
        eyebrow = "ŞİFRELİ YEDEK",
        title = "Öğretmen verisini taşı",
        description = "Yedek; düzenlemeleri, ilerlemeyi ve rehber işaretlerini taşır. Kanonik ders cevapları APK'dan yeniden doğrulanır."
    ) {
        androidx.compose.material3.OutlinedTextField(
            value = passphrase,
            onValueChange = { passphrase = it },
            modifier = Modifier.fillMaxWidth().testTag("backup-passphrase"),
            label = { Text("Yedek parolası") },
            supportingText = { Text("En az 8 karakter") },
            singleLine = true,
            visualTransformation = backupPassphraseVisualTransformation(showPassphrase),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                TextButton(
                    onClick = { showPassphrase = !showPassphrase },
                    modifier = Modifier.testTag("backup-passphrase-visibility-toggle")
                ) {
                    Text(if (showPassphrase) "Gizle" else "Göster")
                }
            }
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(LessonSpacing.small)
        ) {
            Button(
                onClick = { beginExport(passphrase) },
                enabled = passphrase.length >= 8 && !backupState.busy,
                modifier = Modifier.weight(1f)
            ) { Text("Dışa aktar") }
            Button(
                onClick = { beginImport(passphrase) },
                enabled = passphrase.length >= 8 && !backupState.busy,
                modifier = Modifier.weight(1f)
            ) { Text("İçe aktar") }
        }
        backupState.message?.let {
            Text(
                it,
                color = if (backupState.isError) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.primary
            )
        }
    }
}
