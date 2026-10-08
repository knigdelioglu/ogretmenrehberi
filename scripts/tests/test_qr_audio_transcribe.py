"""Standard-library tests; no ASR model, network, or copyrighted audio required."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "qr_audio_transcribe.py"
spec = importlib.util.spec_from_file_location("qr_audio_transcribe", SCRIPT)
assert spec and spec.loader
qr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qr)

class QRPrivateASRTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.media = self.root / "media"
        self.media.mkdir()
        self.data = b"toy-mp4-for-hash-gate; fake-model-does-not-decode"
        (self.media / "19XU49JV.mp4").write_bytes(self.data)
        self.digest = hashlib.sha256(self.data).hexdigest()
        self.manifest = self.root / "intake.json"
        self.row = {
            "file_name": "19XU49JV.mp4", "printed_page": 140,
            "sha256": self.digest, "existing_source_id": None,
            "book_qr": {"eba_content_id": "85ae59be9852fb990c8de54f7cb313ce",
                        "media_binary_identity": "not_verified_from_eba_download"},
        }
        self.manifest.write_text(json.dumps({"records": [self.row]}), encoding="utf-8")
        self.out = self.root / "private-output"

    def args(self, *flags: str) -> list[str]:
        return ["--manifest", str(self.manifest), "--media-dir", str(self.media),
                "--output-dir", str(self.out), *flags]

    def test_dry_run_checks_hash_without_model(self) -> None:
        with patch.dict("sys.modules", {"mlx_whisper": None}):
            self.assertEqual(qr.run(self.args("--file", "19XU49JV.mp4", "--dry-run")), 0)
        self.assertFalse(self.out.exists())
        self.assertEqual(qr.run(self.args("--list")), 0)

    def test_sha_mismatch_fails_closed(self) -> None:
        (self.media / "19XU49JV.mp4").write_bytes(b"modified")
        self.assertEqual(qr.run(self.args("--all", "--dry-run")), 1)
        self.assertFalse(self.out.exists())

    def test_unlisted_and_unsafe_files_fail(self) -> None:
        self.assertEqual(qr.run(self.args("--file", "../evil.mp4", "--dry-run")), 1)
        bad = dict(self.row, file_name="../secret.mp4")
        self.manifest.write_text(json.dumps({"records": [bad]}), encoding="utf-8")
        self.assertEqual(qr.run(self.args("--all", "--dry-run")), 1)

    def test_never_write_transcripts_inside_tracked_repository(self) -> None:
        with self.assertRaises(qr.InputProblem):
            qr.validate_output_directory(qr.ROOT / "data/grade-11/source/audio")
        self.assertEqual(qr.validate_output_directory(qr.ROOT / "sources/local/qr-transcripts"),
                         (qr.ROOT / "sources/local/qr-transcripts").resolve())

    def test_fake_asr_writes_private_unverified_draft(self) -> None:
        segments = [{"start": 0.0, "end": 1.32, "text": " Deneme cümlesi.",
                     "avg_logprob": -0.7, "no_speech_prob": 0.12},
                    {"start": 2.0, "end": 2.95, "text": " Kesin olmayan. ",
                     "avg_logprob": -1.4, "no_speech_prob": 0.71}]
        fake = types.SimpleNamespace(transcribe=lambda *a, **kw: {
            "segments": segments, "language": "tr"})
        with patch.dict("sys.modules", {"mlx_whisper": fake}):
            self.assertEqual(qr.run(self.args("--file", "19XU49JV.mp4")), 0)
        output = json.loads((self.out / "19XU49JV.asr-draft.json").read_text())
        self.assertFalse(output["transcript_verified"])
        self.assertTrue(output["human_review_required"])
        self.assertEqual(output["verification_status"], "ASR_DRAFT_UNREVIEWED")
        self.assertEqual(output["source_sha256"], self.digest)
        self.assertEqual(output["mp4_source_provenance"], "not_verified_from_eba_download")
        self.assertEqual(output["segments"][0]["draft_text"], "Deneme cümlesi.")
        self.assertIn("low_log_probability", output["segments"][1]["review_flags"])
        srt = (self.out / "19XU49JV.asr-draft.srt").read_text()
        self.assertIn("00:00:01,320", srt)
        self.assertIn("Kesin olmayan.", srt)
        self.assertEqual(qr.run(self.args("--file", "19XU49JV.mp4", "--resume")), 0)
        self.assertEqual(qr.run(self.args("--file", "19XU49JV.mp4")), 1)
        output["model"] = "different-model"
        (self.out / "19XU49JV.asr-draft.json").write_text(json.dumps(output))
        self.assertEqual(qr.run(self.args("--file", "19XU49JV.mp4", "--resume")), 1)

    def test_invalid_asr_segments_rejected(self) -> None:
        with self.assertRaises(qr.InputProblem):
            qr.normalize_segments([{"start": -1, "end": 2, "text": "bad"}])
        with self.assertRaises(qr.InputProblem):
            qr.normalize_segments([{"start": 2, "end": 1, "text": "bad"}])
        with self.assertRaises(qr.InputProblem):
            qr.normalize_segments([{"start": float("nan"), "end": 3, "text": "bad"}])
        with self.assertRaises(qr.InputProblem):
            qr.normalize_segments("unstructured response")

if __name__ == "__main__":
    unittest.main()
