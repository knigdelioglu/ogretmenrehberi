package io.github.knigdelioglu.lessonplayer.ui

import io.github.knigdelioglu.lessonplayer.content.LessonStep
import io.github.knigdelioglu.lessonplayer.content.RevealKey
import io.github.knigdelioglu.lessonplayer.player.LessonCommand
import io.github.knigdelioglu.lessonplayer.player.LessonSession

internal fun revealLayerLabel(key: RevealKey): String = when (key) {
    RevealKey.GUIDANCE -> "Yönlendirme"
    RevealKey.ANSWER -> "Cevap"
    RevealKey.EVIDENCE -> "Metinden kanıt"
    RevealKey.EXPLANATION -> "Açıklama"
    RevealKey.NOTE -> "Öğretmen notu"
}

/**
 * Bir reveal anahtarının öğrenciyle paylaşılabilir (public) ve gerçek içeriğe sahip olup olmadığını denetler.
 * RevealKey.NOTE asla public reveal anahtarı değildir; paylaşılabilir eylemden tamamen hariç tutulur.
 */
internal fun isPublicRevealAllowed(step: LessonStep, key: RevealKey): Boolean {
    if (key == RevealKey.NOTE) return false
    if (key !in step.revealOrder) return false
    return when (key) {
        RevealKey.GUIDANCE -> !step.answer?.guidance.isNullOrBlank()
        RevealKey.ANSWER -> step.answer != null &&
            (!step.answer.answer.isNullOrBlank() || step.answer.answerSections != null)
        RevealKey.EXPLANATION -> !step.answer?.explanation.isNullOrBlank()
        RevealKey.EVIDENCE -> !step.answer?.evidenceQuotes.isNullOrEmpty()
        RevealKey.NOTE -> false
    }
}

/**
 * Sıradaki açılmamış public reveal anahtarını seçer.
 * NOTE hariç tutulur; içerik veya anahtar yoksa null döner.
 */
internal fun nextPublicRevealKey(step: LessonStep, state: LessonSession): RevealKey? {
    return step.revealOrder.firstOrNull { key ->
        key != RevealKey.NOTE && key !in state.revealed && isPublicRevealAllowed(step, key)
    }
}

/**
 * Sıradaki güvenli ders ilerletme komutunu üretir:
 * 1. Sıradaki public reveal anahtarı varsa: LessonCommand.ToggleReveal(key)
 * 2. Public reveal'lar bittiyse ve sonraki adım varsa: LessonCommand.Next
 * 3. Son adımsa ve reveal kalmadıysa: null (ilerletme butonu devre dışı)
 * NOTE için asla ToggleReveal(NOTE) dispatch üretmez.
 */
internal fun nextLessonCommand(step: LessonStep, state: LessonSession): LessonCommand? {
    val nextKey = nextPublicRevealKey(step, state)
    if (nextKey != null) {
        return LessonCommand.ToggleReveal(nextKey)
    }
    val ordinal = state.order.indexOf(state.stepId)
    return if (ordinal < state.order.lastIndex) {
        LessonCommand.Next
    } else {
        null
    }
}

/**
 * İlerletme eyleminin aktif olup olmadığını belirler.
 */
internal fun isAdvanceActionEnabled(step: LessonStep, state: LessonSession): Boolean {
    return nextLessonCommand(step, state) != null
}

/**
 * Sıradaki eylem butonunun etiketini üretir.
 * NOTE hariç sıradaki public key'i gösterir; son adımda completion iddiası yerine "Son adım" der.
 */
internal fun nextLessonActionLabel(step: LessonStep, state: LessonSession): String {
    val nextReveal = nextPublicRevealKey(step, state)
    val ordinal = state.order.indexOf(state.stepId)
    return when {
        nextReveal != null -> "Göster: ${revealLayerLabel(nextReveal)}"
        ordinal < state.order.lastIndex -> "Sonraki adıma geç"
        else -> "Son adım"
    }
}
