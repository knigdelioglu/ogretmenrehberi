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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanUiState
import io.github.knigdelioglu.lessonplayer.teacher.TeacherPlanViewModel
import io.github.knigdelioglu.lessonplayer.teacher.TeacherTrack
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonSpacing
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonTheme
import kotlin.math.roundToInt

@Composable
fun LessonPlayerApp() {
    LessonTheme {
        val appContext = LocalContext.current.applicationContext
        var bundle by remember { mutableStateOf<LessonBundle?>(null) }
        var loadError by remember { mutableStateOf<String?>(null) }
        var currentScreen by rememberSaveable { mutableStateOf(AppScreen.LIBRARY) }
        val sessionViewModel: LessonSessionViewModel = viewModel()
        val teacherPlanViewModel: TeacherPlanViewModel = viewModel()
        val sessionUi by sessionViewModel.state.collectAsState()
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

        LaunchedEffect(appContext) {
            try {
                bundle = ContentRepository(appContext).load()
            } catch (error: Exception) {
                loadError = error.message ?: error::class.simpleName ?: "Bilinmeyen hata"
            }
        }
        LaunchedEffect(bundle?.contentSha256) {
            bundle?.let(sessionViewModel::initialize)
        }
        LaunchedEffect(bundle?.workflow?.schemaVersion) {
            bundle?.workflow?.let(teacherPlanViewModel::initialize)
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
                Text(
                    "Ders paketi doğrulanamadı: $loadError",
                    color = MaterialTheme.colorScheme.error
                )
            }
            bundle == null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text("Dersler doğrulanıyor…")
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
                session = readySession.session,
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
    session: LessonSession,
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
        val twoPaneLesson = windowLayout.usesLessonOutline &&
            currentScreen == AppScreen.LESSON
        val dispatchAction: (LessonCommand) -> Unit = { command ->
            if (!actionState.busy) dispatch(command)
        }

        if (currentScreen == AppScreen.LESSON && session.presentationMode) {
            PresentationLessonScreen(
                lesson = bundle.byId.getValue(session.lessonId),
                state = session,
                dispatch = dispatchAction,
                actionState = actionState,
                retryLastAction = retryLastAction,
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
                    Box(
                        modifier = Modifier.weight(1f).fillMaxSize(),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        if (twoPaneLesson) {
                            Row(modifier = Modifier.fillMaxSize()) {
                                LessonOutlinePane(
                                    lesson = bundle.byId.getValue(session.lessonId),
                                    session = session,
                                    dispatch = dispatchAction
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
                                modifier = Modifier.fillMaxWidth().fillMaxHeight()
                                    .widthIn(max = 960.dp)
                            ) {
                                PhaseOneScreen(
                                    currentScreen,
                                    bundle,
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
                                    beginImport
                                )
                            }
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
