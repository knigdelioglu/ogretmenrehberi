package io.github.knigdelioglu.lessonplayer.storage

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.json.JSONObject
import org.junit.Test

class LessonBackupCodecTest {
    private val contentSignature = "a".repeat(64)
    private val workflowSignature = "b".repeat(64)
    private val passphrase = "ogretmen-2026".toCharArray()
    private val snapshot = LessonBackupSnapshot(
        progress = listOf(
            BackupProgress(
                lessonId = "TEMA_01_DERS_01",
                contentDigest = "c".repeat(64),
                stepId = "T01-S1",
                stepOrderJson = "[\"T01-S1\"]",
                overridesJson = "{\"T01-S1\":{}}"
            )
        ),
        marks = listOf(
            BackupMark("2026-2027", "portfolio", "task:1", true)
        )
    )

    @Test
    fun roundTripPreservesUserState() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )

        assertEquals(
            snapshot,
            LessonBackupCodec.decode(
                raw, passphrase.copyOf(), contentSignature, workflowSignature
            )
        )
    }

    @Test
    fun wrongPassphraseFailsClosed() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )

        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                raw, "başka-parola".toCharArray(), contentSignature, workflowSignature
            )
        }
    }

    @Test
    fun contentSignatureMismatchDoesNotDecode() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )

        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                raw, passphrase.copyOf(), "d".repeat(64), workflowSignature
            )
        }
    }

    @Test
    fun tamperedCiphertextFailsBeforePlaintextUse() {
        val raw = LessonBackupCodec.encode(
            snapshot, passphrase.copyOf(), contentSignature, workflowSignature
        )
        val envelope = JSONObject(raw)
        val ciphertext = envelope.getString("ciphertext")
        envelope.put("ciphertext", (if (ciphertext.first() == 'A') "B" else "A") +
            ciphertext.drop(1))
        val tampered = envelope.toString()

        assertThrows(IllegalArgumentException::class.java) {
            LessonBackupCodec.decode(
                tampered, passphrase.copyOf(), contentSignature, workflowSignature
            )
        }
    }
}
