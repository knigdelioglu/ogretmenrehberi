#!/usr/bin/env python3
"""Private, provenance-checked ASR drafts for the 11th-grade QR videos.

Requires mlx-whisper only when transcribing, on Apple Silicon. All transcripts
stay outside git-tracked paths. ASR is NEVER a verified quote.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "data/grade-11/source/qr-media-intake-2026-10-08.json"
DEFAULT_MEDIA = ROOT / "sources/local/qr-media"
DEFAULT_OUTPUT = ROOT / "sources/local/qr-transcripts"
DEFAULT_MODEL = "mlx-community/whisper-large-v3-turbo"
BASENAME = re.compile(r"^[A-Za-z0-9]+\.mp4$")

class InputProblem(Exception):
    """Unsafe/unverifiable source input."""

def sha256_file(file: Path) -> str:
    hasher = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_records(manifest: Path) -> list[dict]:
    document = json.loads(manifest.read_text(encoding="utf-8"))
    records = document.get("records")
    if not isinstance(records, list) or not records:
        raise InputProblem("Video manifest has no records")
    filenames = set()
    for record in records:
        filename = record.get("file_name", "")
        if not isinstance(filename, str) or not BASENAME.fullmatch(filename):
            raise InputProblem(f"Unsafe video filename: {filename!r}")
        if filename in filenames:
            raise InputProblem(f"Duplicate video filename: {filename}")
        filenames.add(filename)
        if not re.fullmatch(r"[0-9a-f]{64}", record.get("sha256", "")):
            raise InputProblem(f"Missing expected SHA-256: {filename}")
    return records

def validate_output_directory(output_dir: Path) -> Path:
    """Never put transcripts in a git-tracked directory, even via symlinks."""
    resolved = output_dir.expanduser().resolve()
    project = ROOT.resolve()
    safe_local = (ROOT / "sources/local").resolve()
    if resolved.is_relative_to(project) and not resolved.is_relative_to(safe_local):
        raise InputProblem("Transcripts may not be written to a tracked repository path; "
                           "use sources/local/qr-transcripts or a directory outside the repo")
    return resolved

def find_media(record: dict, media_dir: Path) -> Path:
    file_name = record["file_name"]
    candidates = [media_dir / file_name]
    if record.get("existing_source_id"):
        candidates.append(media_dir / (record["existing_source_id"] + ".mp4"))
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise InputProblem("Video not found: " + file_name + " (searched " +
                       ", ".join(str(c) for c in candidates) + ")")

def check_media(record: dict, file: Path) -> str:
    actual = sha256_file(file)
    if actual != record["sha256"]:
        raise InputProblem(f"SHA-256 mismatch for {record['file_name']}; "
                           "do not transcribe a different or modified video under this name")
    return actual

def normalize_segments(raw_segments: object) -> list[dict]:
    if not isinstance(raw_segments, list):
        raise InputProblem("ASR returned no valid list of segments")
    result: list[dict] = []
    for index, segment in enumerate(raw_segments, 1):
        if not isinstance(segment, dict):
            raise InputProblem("Invalid ASR segment structure")
        try:
            start, end = float(segment["start"]), float(segment["end"])
        except (KeyError, TypeError, ValueError) as exc:
            raise InputProblem("ASR segment lacks a valid timestamp") from exc
        if not all(map(math.isfinite, [start, end])) or start < 0 or end < start:
            raise InputProblem("Invalid ASR segment timing; review source audio")
        transcript = segment.get("text", "")
        if not isinstance(transcript, str):
            raise InputProblem("ASR segment text is not a string")
        flags: list[str] = []
        if not transcript.strip():
            flags.append("empty_text")
        for field, threshold, flag, direction in [
            ("avg_logprob", -1.0, "low_log_probability", "below"),
            ("no_speech_prob", 0.6, "possible_silence_or_hallucination", "above"),
            ("compression_ratio", 2.4, "possible_repetition", "above"),
        ]:
            number = segment.get(field)
            if number is not None:
                try:
                    value = float(number)
                except (TypeError, ValueError) as exc:
                    raise InputProblem(f"Invalid ASR {field}") from exc
                if not math.isfinite(value):
                    raise InputProblem(f"Non-finite ASR {field}")
                if ((direction == "below" and value < threshold) or
                    (direction == "above" and value > threshold)):
                    flags.append(flag)
        result.append({
            "index": index,
            "start_seconds": round(start, 3),
            "end_seconds": round(end, 3),
            "draft_text": transcript.strip(),
            "review_flags": flags,
            "human_verified": False,
        })
    return result

def srt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    hour, remainder = divmod(ms, 3600000)
    minute, remainder = divmod(remainder, 60000)
    second, fraction = divmod(remainder, 1000)
    return f"{hour:02d}:{minute:02d}:{second:02d},{fraction:03d}"

def to_srt(segments: list[dict]) -> str:
    return "".join(
        f"{i}\n{srt_time(seg['start_seconds'])} --> {srt_time(seg['end_seconds'])}\n"
        f"{seg['draft_text'].replace(chr(10), ' ')}\n\n"
        for i, seg in enumerate(segments, 1)
    )

def draft_document(record: dict, actual_hash: str, model: str, raw_result: dict) -> dict:
    if not isinstance(raw_result, dict):
        raise InputProblem("ASR returned an invalid response")
    segments = normalize_segments(raw_result.get("segments"))
    return {
        "schema_version": "1.0.0",
        "visibility": "LOCAL_PRIVATE_NEVER_COMMIT",
        "verification_status": "ASR_DRAFT_UNREVIEWED",
        "human_review_required": True,
        "transcript_verified": False,
        "video_file_name": record["file_name"],
        "printed_page": record["printed_page"],
        "book_qr_eba_content_id": record["book_qr"]["eba_content_id"],
        "mp4_source_provenance": record["book_qr"]["media_binary_identity"],
        "source_sha256": actual_hash,
        "model": model,
        "language_requested": "tr",
        "language_reported": raw_result.get("language"),
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "segments": segments,
        "quality_note": "Machine-generated draft; poems, names, idioms, quoted speech and speaker identity require listening to original audio. No answer-bank changes are authorized by this file.",
    }

def write_private_files(out_dir: Path, name: str, document: dict, overwrite: bool) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / (name + ".asr-draft.json")
    srt_path = out_dir / (name + ".asr-draft.srt")
    if not overwrite and (json_path.exists() or srt_path.exists()):
        raise InputProblem(f"Private transcription output exists for {name}; use --overwrite explicitly")
    import os
    import tempfile
    for destination, payload in [
        (json_path, json.dumps(document, ensure_ascii=False, indent=2) + "\n"),
        (srt_path, to_srt(document["segments"])),
    ]:
        fd, tempname = tempfile.mkstemp(prefix=".qr-asr-", dir=out_dir)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                stream.write(payload)
            os.replace(tempname, destination)
        finally:
            if os.path.exists(tempname):
                os.unlink(tempname)
    print(f"DRAFT {name}: {len(document['segments'])} segments → {json_path.name}, {srt_path.name} (unverified)")

def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--media-dir", type=Path, default=DEFAULT_MEDIA)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--model", default=DEFAULT_MODEL, help="MLX Whisper model repo or local model path")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", action="append", dest="files", help="Exact manifest MP4 filename; repeatable")
    group.add_argument("--all", action="store_true", help="Transcribe all 18 videos (slow)")
    group.add_argument("--list", action="store_true", help="List supported media without importing a model")
    parser.add_argument("--dry-run", action="store_true", help="Verify file hashes without loading an ASR model or writing outputs")
    parser.add_argument("--overwrite", action="store_true", help="Explicitly replace existing PRIVATE draft files")
    parser.add_argument("--resume", action="store_true", help="Skip existing private drafts only if hashes/model/status match")
    args = parser.parse_args(argv)
    if args.resume and args.overwrite:
        parser.error("--resume and --overwrite cannot be used together")
    try:
        records = load_records(args.manifest)
        by_file = {r["file_name"]: r for r in records}
        if args.list:
            for record in records:
                print(f"{record['file_name']}  s.{record['printed_page']}  SHA={record['sha256'][:12]}…")
            return 0
        files = list(by_file) if args.all else list(dict.fromkeys(args.files))
        unknown = [x for x in files if x not in by_file]
        if unknown:
            raise InputProblem(f"Unknown filename(s): {', '.join(unknown)}")
        out_dir = validate_output_directory(args.output_dir)
        media_dir = args.media_dir.expanduser().resolve()
        selected = []
        for name in files:
            record = by_file[name]
            file = find_media(record, media_dir)
            digest = check_media(record, file)
            selected.append((record, file, digest))
            print(f"VERIFIED MP4 {name}  page={record['printed_page']}  SHA={digest[:12]}…")
        if args.dry_run:
            print(f"DRY RUN PASS: {len(selected)} video file(s); ASR was NOT run.")
            return 0
        todo = []
        for record, file, digest in selected:
            stem = Path(record["file_name"]).stem
            json_path = out_dir / (stem + ".asr-draft.json")
            srt_path = out_dir / (stem + ".asr-draft.srt")
            if json_path.exists() or srt_path.exists():
                if args.resume and json_path.is_file() and srt_path.is_file():
                    prior = json.loads(json_path.read_text(encoding="utf-8"))
                    if (prior.get("source_sha256") == digest and
                        prior.get("model") == args.model and
                        prior.get("verification_status") == "ASR_DRAFT_UNREVIEWED" and
                        prior.get("video_file_name") == record["file_name"] and
                        prior.get("transcript_verified") is False):
                        print(f"SKIPPED EXISTING PRIVATE DRAFT {stem}: hashes and model match")
                        continue
                    raise InputProblem(f"Unsafe --resume for {stem}: source/model/status changed")
                if not args.overwrite:
                    raise InputProblem(f"Draft exists for {stem}; use --resume or --overwrite explicitly")
            todo.append((record, file, digest))
        if not todo:
            print("All selected private drafts already exist and were checked; no ASR was run.")
            return 0
        try:
            import mlx_whisper
        except ImportError as exc:
            raise InputProblem("mlx-whisper is not installed; on Apple Silicon use "
                               "'.venv/bin/pip install mlx-whisper'. No files were transcribed") from exc
        for record, file, digest in todo:
            out_stem = Path(record["file_name"]).stem
            raw = mlx_whisper.transcribe(str(file), path_or_hf_repo=args.model,
                                        language="tr", task="transcribe",
                                        verbose=False, condition_on_previous_text=False)
            draft = draft_document(record, digest, args.model, raw)
            write_private_files(out_dir, out_stem, draft, args.overwrite)
        return 0
    except (InputProblem, FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(run())
