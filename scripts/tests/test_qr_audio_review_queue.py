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
            dict(self.document["segments"][0], human_verified=True),
            dict(self.document["segments"][0], review_flags="invalid"),
        ]:
            with self.subTest(segment=segment):
                doc = dict(self.document, segments=[segment, self.document["segments"][1]])
                with self.assertRaises(queue.InputProblem):
                    queue.scan_draft(self.record, doc)

    def test_overflowed_segments_survive_with_high_priority(self):
        # These five videos formerly showed INVALID_DRAFT and zero segments.
        # The original timestamps and text must remain available for listening.
        copy = dict(self.document)
        copy["segments"] = [
            self.document["segments"][0],
            dict(self.document["segments"][1], end_seconds=93.2),
        ]
        segments = queue.scan_draft(self.record, copy)
        self.assertEqual(len(segments), 2)
        tail = next(s for s in segments if s["index"] == 2)
        self.assertEqual(tail["end"], 93.2)
        self.assertEqual(tail["priority"], "HIGH")
        self.assertIn("beyond_media_end_check_audio", tail["flags"])
        self.assertEqual(tail["source_duration"], 84)
        copy["segments"][1] = dict(copy["segments"][1], start_seconds=89)
        tail = next(s for s in queue.scan_draft(self.record, copy) if s["index"] == 2)
        self.assertIn("segment_starts_after_media_end_possible_hallucination", tail["flags"])

    def test_overflow_report_retains_segments_but_strict_fails(self):
        doc = dict(self.document, segments=[
            self.document["segments"][0],
            dict(self.document["segments"][1], end_seconds=93.2),
        ])
        self.draft.write_text(json.dumps(doc), encoding="utf-8")
        self.assertEqual(queue.run(self.args("--all", "--strict")), 2)
        report = (self.folder / "_qr-audio-manual-review-queue.md").read_text(encoding="utf-8")
        self.assertIn("ASR_DRAFT_TIMING_REVIEW", report)
        self.assertIn("SÜRE TAŞMASI", report)
        self.assertIn("Bölüm 2", report)
        self.assertIn("beyond_media_end_check_audio", report)
        self.assertNotIn("INVALID_DRAFT", report)
        self.assertNotIn("Deneme cümlesi", report)
        self.assertEqual(queue.run(self.args("--all", "--overwrite")), 0)

    def test_five_real_video_overruns_do_not_create_fake_playback_time(self):
        # Values measured on the user's original files with ffprobe. These
        # are padded 29.98-second ASR segments, not evidence of audible words.
        rows = [
            ("19XU3SUD.mp4", 143.88, 120.00, 149.98),
            ("19XU4CVR.mp4", 98.60, 90.00, 119.98),
            ("19XU49JV.mp4", 207.07, 179.10, 209.08),
            ("19XU49LQ.mp4", 429.00, 423.68, 453.66),
            ("19XU3SW3.mp4", 146.16, 120.00, 149.98),
        ]
        for filename, duration, start, end in rows:
            with self.subTest(file=filename):
                record = dict(self.record, file_name=filename,
                              duration_seconds=duration)
                document = dict(self.document,
                                video_file_name=filename,
                                segments=[{
                                    "index": 1,
                                    "start_seconds": start,
                                    "end_seconds": end,
                                    "draft_text": "Unreviewed ASR audio",
                                    "review_flags": [],
                                    "human_verified": False,
                                }])
                segments = queue.scan_draft(record, document)
                self.assertEqual(len(segments), 1)
                item = segments[0]
                self.assertEqual(item["start"], start)
                self.assertEqual(item["end"], end)
                self.assertEqual(item["play_start"], start)
                self.assertEqual(item["play_end"], duration)
                self.assertIn("beyond_media_end_check_audio", item["flags"])
                self.assertEqual(item["priority"], "HIGH")
                report = queue.generate_report([{
                    "file": filename, "page": 83,
                    "status": "ASR_DRAFT_TIMING_REVIEW",
                    "segments": segments,
                }])
                self.assertIn("Ham ASR:", report)
                self.assertIn("Dinleme:", report)
                self.assertIn(f"+{end - duration:.2f} sn", report)
                self.assertNotIn("Unreviewed ASR audio", report)
        self.assertEqual(queue.clock(143.88), "02:23.88")
        self.assertEqual(queue.clock(98.60), "01:38.60")

    def test_entirely_outside_media_has_no_playable_audio(self):
        record = dict(self.record, duration_seconds=84)
        document = dict(self.document, segments=[
            dict(self.document["segments"][0],
                 start_seconds=84, end_seconds=113.98)
        ])
        item = queue.scan_draft(record, document)[0]
        self.assertEqual(item["play_start"], 84)
        self.assertEqual(item["play_end"], 84)
        self.assertIn("segment_starts_after_media_end_possible_hallucination",
                      item["flags"])
        report = queue.generate_report([{
            "file": record["file_name"], "page": 83,
            "status": "ASR_DRAFT_TIMING_REVIEW", "segments": [item],
        }])
        self.assertIn("Oynatılabilir ses yok", report)
        self.assertIn("Ham ASR:", report)

    def test_nonfinite_and_negative_timestamp_remain_invalid(self):
        for start, end in [(-1., 2.), (float("nan"), 3.),
                           (2., float("inf")), (10., 3.)]:
            with self.subTest(start=start, end=end):
                doc = dict(self.document, segments=[
                    dict(self.document["segments"][0],
                         start_seconds=start, end_seconds=end),
                ])
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
