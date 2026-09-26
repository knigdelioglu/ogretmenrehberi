package io.github.knigdelioglu.lessonplayer.ui

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import io.github.knigdelioglu.lessonplayer.content.GlossaryEntry
import io.github.knigdelioglu.lessonplayer.content.GlossaryMatch
import io.github.knigdelioglu.lessonplayer.content.LiteraryGlossary
import io.github.knigdelioglu.lessonplayer.ui.theme.LessonColors

private const val GLOSSARY_ANNOTATION_TAG = "literary_glossary"

@Composable
internal fun GlossaryText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = TextStyle.Default,
    color: Color = Color.Unspecified,
    fontWeight: FontWeight? = null,
    maxLines: Int = Int.MAX_VALUE
) {
    val matches = remember(text) { LiteraryGlossary.matches(text) }
    if (matches.isEmpty()) {
        Text(
            text = text,
            modifier = modifier,
            style = style,
            color = color,
            fontWeight = fontWeight,
            maxLines = maxLines
        )
        return
    }

    val glossaryColor = LessonColors.Primary
    val annotated = remember(text, matches, glossaryColor) {
        glossaryAnnotatedString(text, matches, glossaryColor)
    }
    var layoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }
    var selectedEntry by remember { mutableStateOf<GlossaryEntry?>(null) }

    Text(
        text = annotated,
        modifier = modifier.pointerInput(annotated) {
            detectTapGestures { position ->
                val result = layoutResult ?: return@detectTapGestures
                if (annotated.length == 0) return@detectTapGestures
                val offset = result.getOffsetForPosition(position)
                    .coerceIn(0, annotated.length - 1)
                val term = annotated
                    .getStringAnnotations(
                        tag = GLOSSARY_ANNOTATION_TAG,
                        start = offset,
                        end = offset + 1
                    )
                    .firstOrNull()
                    ?.item
                selectedEntry = term?.let(LiteraryGlossary::entry)
            }
        },
        style = style,
        color = color,
        fontWeight = fontWeight,
        maxLines = maxLines,
        onTextLayout = { layoutResult = it }
    )

    selectedEntry?.let { entry ->
        GlossaryDefinitionDialog(
            entry = entry,
            onDismiss = { selectedEntry = null }
        )
    }
}

internal fun glossaryAnnotatedString(
    text: String,
    matches: List<GlossaryMatch>,
    glossaryColor: Color
): AnnotatedString = buildAnnotatedString {
    append(text)
    matches.forEach { match ->
        addStringAnnotation(
            tag = GLOSSARY_ANNOTATION_TAG,
            annotation = match.entry.term,
            start = match.start,
            end = match.endExclusive
        )
        addStyle(
            style = SpanStyle(
                color = glossaryColor,
                fontWeight = FontWeight.SemiBold,
                textDecoration = TextDecoration.Underline
            ),
            start = match.start,
            end = match.endExclusive
        )
    }
}

@Composable
private fun GlossaryDefinitionDialog(
    entry: GlossaryEntry,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = entry.term,
                style = MaterialTheme.typography.titleLarge,
                color = LessonColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Edebî metin inceleme sözlüğü",
                    style = MaterialTheme.typography.labelMedium,
                    color = LessonColors.TextSecondary
                )
                Text(
                    text = entry.definition,
                    style = MaterialTheme.typography.bodyLarge,
                    color = LessonColors.TextPrimary,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Kapat")
            }
        }
    )
}
