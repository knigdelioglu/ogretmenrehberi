"""Model-free tests for the private QR transcript listening queue."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("qr_audio_review_queue", SCRIPTS / "qr_audio_review_queue.py")
assert spec and spec.loader
queue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(queue)


class PrivateListeningQueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.folder = self.root / "private"
        self.folder.mkdir()
        self.record = {
            "file_name": "OGM2025TDE118312.mp4",
            "printed_page": 83,
            "duration_seconds": 84,
            "sha256": hashlib.sha256(b"local-verified-audio").hexdigest(),
            "book_qr": {
                "eba_content_id": "2952f505e3a7923fe38ce31c2bd92871",
                "media_binary_identity": "sha256_matches_earlier_eba_verified_source"
            },
        }
        self.manifest = self.root / "manifest.json"
        self.manifest.write_text(json.dumps({"records": [self.record]}), encoding="utf-8")
        self.document = {
            "video_file_name": self.record["file_name"],
            "printed_page": 83,
            "book_qr_eba_content_id": self.record["book_qr"]["eba_content_id"],
            "mp4_source_provenance": self.record["book_qr"]["media_binary_identity"],
            "source_sha256": self.record["sha256"],
            "verification_status": "ASR_DRAFT_UNREVIEWED",
            "transcript_verified": False,
            "human_review_required": True,
            "model": "mlx-community/whisper-large-v3-turbo",
            "language_reported": "tr",
            "segments": [
                {"index": 1, "start_seconds": 0., "end_seconds": 1.3,
                 "draft_text": " Merhaba 1971.", "review_flags": [],
                 "human_verified": False},
                {"index": 2, "start_seconds": 1.4, "end_seconds": 2.7,
                 "draft_text": " Deneme cümlesi.", "review_flags": ["low_log_probability"],
                 "human_verified": False},
            ],
        }
        self.draft = self.folder / "OGM2025TDE118312.asr-draft.json"
        self.draft.write_text(json.dumps(self.document), encoding="utf-8")

    def args(self, *rest):
        return ["--manifest", str(self.manifest), "--draft-dir", str(self.folder),
                "--output-dir", str(self.folder), *rest]

    def test_requires_all_provenance_fields(self):
        for key in ("source_sha256", "mp4_source_provenance", "book_qr_eba_content_id",
                    "verification_status", "transcript_verified"):
            with self.subTest(key=key):
                doc = dict(self.document, **{key: "invalid"})
                with self.assertRaises(queue.InputProblem):
                    queue.scan_draft(self.record, doc)

    def test_review_all_segments_in_priority_order(self):
        items = queue.scan_draft(self.record, self.document)
        self.assertEqual(len(items), 2)
        self.assertEqual([r["priority"] for r in items], ["HIGH", "HIGH"])
        self.assertIn("number_or_date_needs_verification", items[0]["flags"])
        self.assertIn("literary_audio_every_line_needs_verification", items[1]["flags"])
        self.assertIn("low_log_probability", items[1]["flags"])

    def test_invalid_timing_or_reviewed_status_rejected(self):
        for segment in [
            dict(self.document["segments"][0], start_seconds=-1),
            dict(self.document["segments"][0], end_seconds=250),
            dict(self.document["segments"][0], human_verified=True),
            dict(self.document["segments"][0], review_flags="invalid"),
        ]:
            with self.subTest(segment=segment):
                doc = dict(self.document, segments=[segment, self.document["segments"][1]])
                with self.assertRaises(queue.InputProblem):
                    queue.scan_draft(self.record, doc)

    def test_report_redacts_spoken_text(self):
        rows = [{"file": self.record["file_name"], "page": 83,
                 "status": "ASR_DRAFT_UNREVIEWED",
                 "segments": queue.scan_draft(self.record, self.document)}]
        report = queue.generate_report(rows)
        self.assertIn("Olvido", report)
        self.assertIn("Bölüm 1", report)
        self.assertNotIn("Merhaba 1971", report)
        self.assertNotIn("Deneme cümlesi", report)
        self.assertIn("orijinal MP4", report)

    def test_status_and_missing_strict(self):
        self.assertEqual(queue.run(self.args("--file", self.record["file_name"], "--status")), 0)
        self.assertFalse((self.folder / "_qr-audio-manual-review-queue.md").exists())
        self.draft.unlink()
        self.assertEqual(queue.run(self.args("--all", "--status", "--strict")), 2)
        self.assertEqual(queue.run(self.args("--all")), 0)
        report = (self.folder / "_qr-audio-manual-review-queue.md").read_text(encoding="utf-8")
        self.assertIn("MISSING_DRAFT", report)

    def test_private_output_cannot_be_overwritten_implicitly(self):
        self.assertEqual(queue.run(self.args("--all")), 0)
        self.assertEqual(queue.run(self.args("--all")), 1)
        self.assertEqual(queue.run(self.args("--all", "--overwrite")), 0)

    def test_invalid_draft_reported_without_making_false_claims(self):
        doc = dict(self.document, source_sha256="00" * 32)
        self.draft.write_text(json.dumps(doc), encoding="utf-8")
        self.assertEqual(queue.run(self.args("--all", "--strict")), 2)
        report = (self.folder / "_qr-audio-manual-review-queue.md").read_text(encoding="utf-8")
        self.assertIn("INVALID_DRAFT", report)
        self.assertNotIn("Merhaba", report)

    def test_rejects_unknown_source_and_tracked_output(self):
        self.assertEqual(queue.run(self.args("--file", "../other.mp4", "--status")), 1)
        self.assertEqual(queue.run(["--manifest", str(self.manifest),
                                    "--draft-dir", str(self.folder), "--output-dir",
                                    str(queue.DEFAULT_MANIFEST.parent),
                                    "--all", "--status"]), 1)


if __name__ == "__main__":
    unittest.main()
