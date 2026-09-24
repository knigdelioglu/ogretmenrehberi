package io.github.knigdelioglu.lessonplayer.ui

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.github.knigdelioglu.lessonplayer.R
import io.github.knigdelioglu.lessonplayer.content.ContentRepository
import io.github.knigdelioglu.lessonplayer.content.LessonBundle
import io.github.knigdelioglu.lessonplayer.player.BackupUiState
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonActionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonSession
import io.github.knigdelioglu.lessonplayer.player.LessonSessionUiState
import io.github.knigdelioglu.lessonplayer.player.LessonSessionViewModel
import io.github.knigdelioglu.lessonplayer.player.PresentationTextSize
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanUiState
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanViewModel
import io.github.knigdelioglu.lessonplayer.teacher.TeacherTrack
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTarget
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme
import kotlin.math.roundToInt

@Composable
fun LessonPlayerApp() {
    LessonTheme {
        val appContext = LocalContext.current.applicationContext
        var bundle by remember { mutableStateOf<LessonBundle?>(null) }
        var contentStatus by remember { mutableStateOf<String?>(null) }
        var loadError by remember { mutableStateOf<String?>(null) }
        var loadingContent by remember { mutableStateOf(true) }
        var loadRequest by remember { mutableIntStateOf(0) }
        var currentScreen by rememberSaveable { mutableStateOf(AppScreen.LIBRARY) }
        val sessionViewModel: LessonSessionViewModel = viewModel()
        val teacherPlanViewModel: TeacherPlanViewModel = viewModel()
        val sessionUi by sessionViewModel.state.collectAsState()
        val presentationTextSize by sessionViewModel.presentationTextSize.collectAsState(
            initial = PresentationTextSize.NORMAL
        )
        val teacherPlanUi by teacherPlanViewModel.state.collectAsState()
        val readySession = sessionUi as? LessonSessionUiState.Ready
        val backupUi by sessionViewModel.backupState.collectAsState()
        val actionUi by sessionViewModel.actionState.collectAsState()
        var pendingExportPassphrase by rememberSaveable { mutableStateOf("") }
        var pendingImportPassphrase by rememberSaveable { mutableStateOf("") }
        val createBackup = rememberLauncherForActivityResult(
            ActivityResultContracts.CreateDocument("application/json")
        ) { uri: Uri? ->
            uri?.let { sessionViewModel.exportBackup(it, pendingExportPassphrase) }
        }
        val openBackup = rememberLauncherForActivityResult(
            ActivityResultContracts.OpenDocument()
        ) { uri: Uri? ->
            uri?.let { sessionViewModel.importBackup(it, pendingImportPassphrase) }
        }

        val contentRepository = remember(appContext) { ContentRepository(appContext) }
        LaunchedEffect(contentRepository, loadRequest) {
            loadingContent = true
            loadError = null
            try {
                val loaded = contentRepository.load()
                bundle = loaded.bundle
                contentStatus = loaded.statusMessage
            } catch (error: Exception) {
                loadError = error.message ?: error::class.simpleName ?: "Bilinmeyen hata"
            } finally {
                loadingContent = false
            }
        }
        LaunchedEffect(bundle?.contentSha256) {
            bundle?.let(sessionViewModel::initialize)
        }
        LaunchedEffect(bundle?.workflowSha256) {
            bundle?.let { teacherPlanViewModel.initialize(it.workflow, it.workflowSha256) }
        }
        BackHandler(
            enabled = readySession?.session?.presentationMode == true ||
                currentScreen != AppScreen.LIBRARY
        ) {
            if (readySession?.session?.presentationMode == true) {
                sessionViewModel.dispatch(LessonCommand.SetPresentationMode(false))
            } else {
                currentScreen = backDestination(currentScreen)
            }
        }

        when {
            loadError != null -> Box(
                Modifier.fillMaxSize().padding(LessonSpacing.large),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                ) {
                    Text(
                        "Ders paketi doğrulanamadı: $loadError",
                        color = MaterialTheme.colorScheme.error
                    )
                    androidx.compose.material3.Button(
                        onClick = {
                            if (!loadingContent) {
                                loadingContent = true
                                loadRequest += 1
                            }
                        },
                        enabled = !loadingContent
                    ) { Text("Yeniden dene") }
                }
            }
            bundle == null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                ) {
                    CircularProgressIndicator()
                    Text(if (loadingContent) "Dersler doğrulanıyor…" else "Ders paketi yüklenemedi.")
                }
            }
            sessionUi is LessonSessionUiState.Error ->
                Box(
                    Modifier.fillMaxSize().padding(LessonSpacing.large),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(LessonSpacing.medium)
                    ) {
                        Text(
                            (sessionUi as LessonSessionUiState.Error).message,
                            color = MaterialTheme.colorScheme.error
                        )
                        androidx.compose.material3.Button(onClick = {
                            bundle?.let(sessionViewModel::initialize)
                        }) {
                            Text("Kaydı yeniden yükle")
                        }
                    }
                }
            readySession != null -> LessonPlayerShell(
                currentScreen = currentScreen,
                bundle = bundle!!,
                contentStatus = contentStatus.orEmpty(),
                session = readySession.session,
                presentationTextSize = presentationTextSize,
                setPresentationTextSize = sessionViewModel::setPresentationTextSize,
                navigate = { currentScreen = it },
                selectLesson = {
                    sessionViewModel.openLesson(it)
                    currentScreen = AppScreen.LESSON
                },
                dispatch = sessionViewModel::dispatch,
                actionState = actionUi,
                retryLastAction = sessionViewModel::retryLastAction,
                teacherPlan = teacherPlanUi,
                toggleTeacherMark = teacherPlanViewModel::toggle,
                backupState = backupUi,
                beginExport = { passphrase ->
                    pendingExportPassphrase = passphrase
                    createBackup.launch("ogretmenrehberi-backup.json")
                },
                beginImport = { passphrase ->
                    pendingImportPassphrase = passphrase
                    openBackup.launch(arrayOf("application/json", "text/*"))
                }
            )
            else -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text("Ders durumu yükleniyor…")
            }
        }
    }
}

@Composable
internal fun LessonPlayerShell(
    currentScreen: AppScreen,
    bundle: LessonBundle,
    contentStatus: String,
    session: LessonSession,
    presentationTextSize: PresentationTextSize,
    setPresentationTextSize: (PresentationTextSize) -> Unit,
    navigate: (AppScreen) -> Unit,
    selectLesson: (String) -> Unit,
    dispatch: (LessonCommand) -> Unit,
    actionState: LessonActionUiState,
    retryLastAction: () -> Unit,
    teacherPlan: TeacherPlanUiState,
    toggleTeacherMark: (TeacherTrack, String) -> Unit,
    backupState: BackupUiState,
    beginExport: (String) -> Unit,
    beginImport: (String) -> Unit
) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val windowLayout = lessonWindowLayout(
            widthDp = maxWidth.value.roundToInt(),
            heightDp = maxHeight.value.roundToInt()
        )
        val wide = windowLayout.usesRail
        val dispatchAction: (LessonCommand) -> Unit = { command ->
            if (!actionState.busy) dispatch(command)
        }
        var showLessonOutline by rememberSaveable { mutableStateOf(false) }

        if (currentScreen == AppScreen.LESSON && session.presentationMode) {
            PresentationLessonScreen(
                lesson = bundle.byId.getValue(session.lessonId),
                state = session,
                dispatch = dispatchAction,
                actionState = actionState,
                retryLastAction = retryLastAction,
                textSize = presentationTextSize,
                onTextSizeChange = setPresentationTextSize,
                exit = { dispatchAction(LessonCommand.SetPresentationMode(false)) }
            )
        } else {
            Scaffold(
                contentWindowInsets = WindowInsets.safeDrawing,
                containerColor = MaterialTheme.colorScheme.background,
                topBar = {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .heightIn(min = 76.dp)
                            .padding(
                                horizontal = LessonSpacing.large,
                                vertical = LessonSpacing.small
                            ),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "ÖĞRETMEN REHBERİ",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            Text(
                                currentScreen.title,
                                style = MaterialTheme.typography.titleLarge
                            )
                        }
                        Text(
                            "11. SINIF",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                },
                bottomBar = {
                    if (!wide) {
                        Column {
                            if (currentScreen == AppScreen.LESSON) {
                                TextButton(
                                    onClick = { showLessonOutline = true },
                                    modifier = Modifier.fillMaxWidth()
                                        .heightIn(min = LessonTarget.minimum)
                                        .testTag("lesson-outline-open"),
                                    enabled = !actionState.busy
                                ) {
                                    Text(
                                        "Ders akışı · Adım ${session.order.indexOf(session.stepId) + 1}/${session.order.size}"
                                    )
                                }
                            }
                            NavigationBar {
                                AppScreen.entries.forEach { destination ->
                                    NavigationBarItem(
                                        selected = currentScreen == destination,
                                        onClick = { navigate(destination) },
                                        icon = { AppNavigationIcon(destination) },
                                        label = { Text(destination.shortLabel) },
                                        alwaysShowLabel = true
                                    )
                                }
                            }
                        }
                    }
                }
            ) { safePadding ->
                Row(
                    modifier = Modifier.fillMaxSize().padding(safePadding),
                    verticalAlignment = Alignment.Top
                ) {
                    if (wide) {
                        NavigationRail {
                            AppScreen.entries.forEach { destination ->
                                NavigationRailItem(
                                    selected = currentScreen == destination,
                                    onClick = { navigate(destination) },
                                    icon = { AppNavigationIcon(destination) },
                                    label = { Text(destination.shortLabel) },
                                    alwaysShowLabel = true
                                )
                            }
                        }
                    }
                    BoxWithConstraints(
                        modifier = Modifier.weight(1f).fillMaxSize(),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        val twoPaneLesson = currentScreen == AppScreen.LESSON &&
                            lessonOutlineFits(
                                usableContentWidthDp = maxWidth.value,
                                usableContentHeightDp = maxHeight.value,
                                isLandscape = windowLayout.isLandscape
                            )
                        LaunchedEffect(currentScreen, twoPaneLesson, session.presentationMode) {
                            if (currentScreen != AppScreen.LESSON ||
                                twoPaneLesson || session.presentationMode
                            ) {
                                showLessonOutline = false
                            }
                        }
                        if (twoPaneLesson) {
                            Row(modifier = Modifier.fillMaxSize()) {
                                LessonOutlinePane(
                                    lesson = bundle.byId.getValue(session.lessonId),
                                    session = session,
                                    dispatch = dispatchAction,
                                    enabled = !actionState.busy
                                )
                                Box(
                                    modifier = Modifier.weight(1f).fillMaxSize()
                                ) {
                                    SessionLessonScreen(
                                        lesson = bundle.byId.getValue(session.lessonId),
                                        state = session,
                                        dispatch = dispatchAction,
                                        actionState = actionState,
                                        retryLastAction = retryLastAction
                                    )
                                }
                            }
                        } else {
                            Box(
                                modifier = if (currentScreen == AppScreen.LIBRARY) {
                                    Modifier.fillMaxSize()
                                } else {
                                    Modifier.fillMaxWidth().fillMaxHeight()
                                        .widthIn(max = 960.dp)
                                }
                            ) {
                                PhaseOneScreen(
                                    currentScreen,
                                    bundle,
                                    contentStatus,
                                    session,
                                    selectLesson,
                                    { navigate(AppScreen.LESSON) },
                                    dispatchAction,
                                    actionState,
                                    retryLastAction,
                                    teacherPlan,
                                    toggleTeacherMark,
                                    backupState,
                                    beginExport,
                                    beginImport,
                                    openLessonOutline = if (currentScreen == AppScreen.LESSON &&
                                        !twoPaneLesson
                                    ) {
                                        { showLessonOutline = true }
                                    } else null
                                )
                            }
                        }
                        if (showLessonOutline && currentScreen == AppScreen.LESSON &&
                            !twoPaneLesson && !session.presentationMode
                        ) {
                            LessonOutlineSheet(
                                lesson = bundle.byId.getValue(session.lessonId),
                                session = session,
                                dispatch = dispatchAction,
                                dismiss = { showLessonOutline = false },
                                enabled = !actionState.busy
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppNavigationIcon(destination: AppScreen) {
    val icon = when (destination) {
        AppScreen.LIBRARY -> R.drawable.ic_library
        AppScreen.LESSON -> R.drawable.ic_lesson
        AppScreen.GUIDE -> R.drawable.ic_guide
        AppScreen.SETTINGS -> R.drawable.ic_settings
    }
    Icon(painter = painterResource(icon), contentDescription = null)
}
