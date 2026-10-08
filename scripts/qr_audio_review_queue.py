#!/usr/bin/env python3
"""Local human-listening queue from private QR ASR drafts. Never approves speech."""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from qr_audio_transcribe import (
    DEFAULT_MANIFEST, DEFAULT_OUTPUT, InputProblem, load_records,
    validate_output_directory,
)

SPECIAL = {
    "OGM2025TDE118312.mp4": "Olvido: verify every verse, pauses, voice origin, and music by listening.",
    "19XU49JV.mp4": "Atışma: verify speakers, sung verses, and five contextual vocabulary words.",
    "19XU49ME.mp4": "Mektup: video narration is not evidence for the printed Kaplan letter.",
}


def clock(seconds: float) -> str:
    # Preserve centiseconds for short overrun windows, without 59.99 -> 60.00.
    centiseconds = round(max(0., seconds) * 100)
    minutes, remainder = divmod(centiseconds, 6000)
    whole_seconds, fractions = divmod(remainder, 100)
    return f"{minutes:02d}:{whole_seconds:02d}.{fractions:02d}"


def scan_draft(record: dict, doc: dict) -> list[dict]:
    expected = {
        "video_file_name": record["file_name"],
        "printed_page": record["printed_page"],
        "book_qr_eba_content_id": record["book_qr"]["eba_content_id"],
        "mp4_source_provenance": record["book_qr"]["media_binary_identity"],
        "source_sha256": record["sha256"],
        "verification_status": "ASR_DRAFT_UNREVIEWED",
        "transcript_verified": False,
        "human_review_required": True,
    }
    for key, value in expected.items():
        if doc.get(key) != value:
            raise InputProblem(f"{record['file_name']}: provenance mismatch at {key}")
    if not isinstance(doc.get("model"), str) or not doc["model"]:
        raise InputProblem("Missing ASR model information")
    segments = doc.get("segments")
    if not isinstance(segments, list) or not segments:
        raise InputProblem("No ASR segments to check")
    previous_end, previous_text = 0., ""
    duration = float(record.get("duration_seconds") or 0)
    review = []
    for i, s in enumerate(segments, 1):
        if not isinstance(s, dict) or s.get("index") != i:
            raise InputProblem("Invalid or nonsequential segment index")
        if s.get("human_verified") is not False:
            raise InputProblem("Unexpected segment verification marker")
        phrase = s.get("draft_text")
        if not isinstance(phrase, str):
            raise InputProblem("Invalid segment text")
        try:
            start, end = float(s["start_seconds"]), float(s["end_seconds"])
        except (KeyError, TypeError, ValueError) as exc:
            raise InputProblem("Invalid segment timestamps") from exc
        if not all(math.isfinite(x) for x in (start, end)) or start < 0 or end < start:
            raise InputProblem("Impossible segment timing")
        # Whisper may hallucinate words or generate padded timestamps at the
        # end of a video. Keep every raw segment for human inspection, but never
        # treat speech outside the source as an ordinary ASR draft. Provenance
        # mismatches and structurally impossible timestamps still fail closed.
        original_flags = s.get("review_flags")
        if not isinstance(original_flags, list) or not all(isinstance(v, str) for v in original_flags):
            raise InputProblem("Malformed machine-generated segment flags")
        flags = list(original_flags)
        if duration and end > duration + 2:
            flags.append("beyond_media_end_check_audio")
            if start >= duration:
                flags.append("segment_starts_after_media_end_possible_hallucination")
        if not phrase.strip():
            flags.append("empty_text")
        if end - start > 18:
            flags.append("long_segment_check_audio")
        if start < previous_end - .3:
            flags.append("overlap_check_audio")
        if i > 1 and start - previous_end > 20:
            flags.append("gap_check_audio")
        normalized = re.sub(r"\s+", " ", phrase.strip()).casefold()
        if normalized and normalized == previous_text:
            flags.append("repeated_text_check_audio")
        if re.search(r"\d", phrase):
            flags.append("number_or_date_needs_verification")
        if doc.get("language_reported") not in ("tr", "turkish"):
            flags.append("language_needs_verification")
        if record["file_name"] in SPECIAL:
            flags.append("literary_audio_every_line_needs_verification")
        flags = list(dict.fromkeys(flags))
        # Only the *review playback window* is bounded. Never rewrite ASR
        # timing, erase its text, or imply that its overflow is genuine speech.
        play_start = min(start, duration) if duration else start
        play_end = min(end, duration) if duration else end
        review.append({"index": i, "start": start, "end": end,
                       "play_start": play_start, "play_end": play_end,
                       "source_duration": duration,
                       "priority": "HIGH" if flags else "STANDARD", "flags": flags})
        previous_end = max(previous_end, end)
        previous_text = normalized
    return sorted(review, key=lambda x: (x["priority"] != "HIGH", x["start"]))


def generate_report(rows: list[dict]) -> str:
    text = [
        "# Özel QR ses inceleme kuyruğu",
        "",
        "**Bu belge doğrulanmış bir ses dökümü değildir.** "
        "Bütün bölümler orijinal MP4 ile dinlenerek karşılaştırılmalıdır.",
        "Taslak cümleler yerel asr-draft SRT/JSON dosyalarında tutulur; "
        "bu kontrol raporuna konuşma metni kopyalanmaz. "
        "Tam dökümleri GitHub'a yüklemeyin.",
        "",
        "| Video | Sayfa | Bölüm | Öncelikli | Durum |",
        "| --- | ---: | ---: | ---: | --- |",
    ]
    for r in rows:
        text.append(f"| {r['file']} | {r['page']} | {len(r['segments'])} | "
                    f"{sum(s['priority'] == 'HIGH' for s in r['segments'])} | {r['status']} |")
    for r in rows:
        text.extend(["", f"## {r['file']} · s.{r['page']}"])
        if r["status"] == "MISSING_DRAFT":
            text.append("- [ ] Önce özel ASR taslağını üretin; ses dinleme kontrolü henüz başlamadı.")
            continue
        if r["status"] == "INVALID_DRAFT":
            text.append("- [ ] Taslağın kaynak veya segment denetimi başarısız: " + r["error"])
            continue
        if r["status"] == "ASR_DRAFT_TIMING_REVIEW":
            text.append("**SÜRE TAŞMASI:** ASR'nin bazı bölümleri video süresini aşıyor. "
                        "Bölümler silinmedi veya otomatik kırpılmadı. "
                        "Özellikle son bölümleri özgün kayıttan kontrol edin; "
                        "taşan konuşma gerçekte hiç söylenmemiş olabilir.")
        if r["file"] in SPECIAL:
            text.append("**Kontrol odağı:** " + SPECIAL[r["file"]])
        for s in r["segments"]:
            labels = ", ".join(s["flags"]) if s["flags"] else "rutin_dinleme"
            if s["source_duration"] and s["play_start"] >= s["source_duration"]:
                playback = "Oynatılabilir ses yok (video bitmiş)"
            else:
                playback = (f"Dinleme: {clock(s['play_start'])}–"
                            f"{clock(s['play_end'])}")
            if s["source_duration"] and s["end"] > s["source_duration"]:
                playback += (f" · Ham ASR: {clock(s['start'])}–{clock(s['end'])}"
                             f" (bitiş +{s['end'] - s['source_duration']:.2f} sn)")
            text.append(f"- [ ] {s['priority']} · Bölüm {s['index']} · "
                        f"{playback} · {labels}")
        text.append("İşaretli kutular bile otomatik insan doğrulaması veya "
                    "öğretmen cevaplarına aktarım izni oluşturmaz.")
    return "\n".join(text) + "\n"


def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--draft-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true")
    group.add_argument("--file", dest="files", action="append")
    parser.add_argument("--status", action="store_true", help="Only print status, do not write report")
    parser.add_argument("--strict", action="store_true", help="Fail if any draft is missing or invalid")
    parser.add_argument("--overwrite", action="store_true", help="Allow replacing private report")
    args = parser.parse_args(argv)
    try:
        records = load_records(args.manifest)
        by_name = {r["file_name"]: r for r in records}
        names = list(by_name) if args.all else list(dict.fromkeys(args.files))
        for name in names:
            if name not in by_name:
                raise InputProblem(f"Unknown MP4 file: {name}")
        draft_dir = validate_output_directory(args.draft_dir)
        output_dir = validate_output_directory(args.output_dir)
        rows = []
        for name in names:
            r = by_name[name]
            path = draft_dir / (Path(name).stem + ".asr-draft.json")
            row = {"file": name, "page": r["printed_page"], "status": "MISSING_DRAFT",
                   "segments": []}
            if path.exists():
                try:
                    doc = json.loads(path.read_text(encoding="utf-8"))
                    row["segments"] = scan_draft(r, doc)
                    has_overflow = any(
                        "beyond_media_end_check_audio" in segment["flags"]
                        for segment in row["segments"]
                    )
                    row["status"] = (
                        "ASR_DRAFT_TIMING_REVIEW" if has_overflow else
                        "ASR_DRAFT_UNREVIEWED"
                    )
                except (InputProblem, OSError, TypeError, KeyError, ValueError) as exc:
                    row["status"] = "INVALID_DRAFT"
                    row["error"] = str(exc).replace("|", "/").replace("\n", " ")
            rows.append(row)
            overruns = [
                seg for seg in row["segments"]
                if "beyond_media_end_check_audio" in seg["flags"]
            ]
            suffix = ""
            if overruns:
                maximum = max(seg["end"] - seg["source_duration"] for seg in overruns)
                suffix = f", {len(overruns)} segment(s) beyond video end (max +{maximum:.2f}s)"
            print(f"{name}: {row['status']}, {len(row['segments'])} segments{suffix}")
        if not args.status:
            report = output_dir / "_qr-audio-manual-review-queue.md"
            if report.exists() and not args.overwrite:
                raise InputProblem("Review report already exists; use --overwrite explicitly")
            output_dir.mkdir(parents=True, exist_ok=True)
            import os
            import tempfile
            fd, temp = tempfile.mkstemp(prefix=".qr-review-", dir=output_dir)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as file:
                    file.write(generate_report(rows))
                os.replace(temp, report)
            finally:
                if os.path.exists(temp):
                    os.unlink(temp)
            print("PRIVATE REVIEW REPORT:", report)
        if args.strict and any(row["status"] != "ASR_DRAFT_UNREVIEWED" for row in rows):
            return 2
        return 0
    except (InputProblem, OSError, ValueError) as exc:
        print("ERROR:", exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
