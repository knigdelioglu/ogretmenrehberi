#!/usr/bin/env python3
"""Theme 1 integration/quality-freeze audit.

Hard gates cover:
- canonical source/answer integrity
- Lesson Player completeness
- ÖğretmenOS projection losslessness
- Kindle EPUB semantic answer-field parity

Editorial repetition is reported separately so useful, context-specific wording is
not automatically deleted by a similarity heuristic.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
THEME_ROOT = ROOT / "data/grade-11/source/teacher-book/theme-1"
XHTML = "{http://www.w3.org/1999/xhtml}"


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def norm_compare(value: Any) -> str:
    text = norm(value).casefold()
    text = re.sub(r"[^\wçğıöşü]+", " ", text, flags=re.UNICODE)
    return norm(text)


def compact(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def flatten_scalars(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        out: list[str] = []
        for key, val in value.items():
            out.append(str(key).replace("_", " ").title())
            out.extend(flatten_scalars(val))
        return out
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(flatten_scalars(item))
        return out
    return [str(value)]


def load_answers() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    index = json.loads((THEME_ROOT / "answer-bank.json").read_text(encoding="utf-8"))
    entries: list[dict[str, Any]] = []
    declared = 0
    for part in index["parts"]:
        declared += int(part["entries"])
        payload = json.loads((THEME_ROOT / part["path"]).read_text(encoding="utf-8"))
        actual = payload.get("entries", [])
        if len(actual) != int(part["entries"]):
            raise ValueError(f"PART_COUNT_MISMATCH:{part['path']}")
        entries.extend(actual)
    if declared != index["coverage"]["entry_count"] or len(entries) != declared:
        raise ValueError("ANSWER_INDEX_COUNT_MISMATCH")
    return index, entries


def load_sources() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = json.loads((THEME_ROOT / "source-index.json").read_text(encoding="utf-8"))
    return payload, payload.get("records", [])


def epub_sections(path: Path) -> tuple[dict[str, str], dict[str, str]]:
    by_id: dict[str, str] = {}
    file_by_id: dict[str, str] = {}
    with zipfile.ZipFile(path) as archive:
        if archive.namelist()[0] != "mimetype":
            raise ValueError("EPUB_MIMETYPE_NOT_FIRST")
        if archive.read("mimetype") != b"application/epub+zip":
            raise ValueError("EPUB_MIMETYPE_INVALID")
        if archive.testzip() is not None:
            raise ValueError("EPUB_CRC_FAILURE")
        for name in archive.namelist():
            if not name.endswith(".xhtml"):
                continue
            root = ET.fromstring(archive.read(name))
            for section in root.findall(f".//{XHTML}section"):
                classes = set((section.attrib.get("class") or "").split())
                if "entry" not in classes:
                    continue
                entry_id = section.attrib.get("id") or ""
                if not entry_id:
                    raise ValueError(f"EPUB_ENTRY_WITHOUT_ID:{name}")
                if entry_id in by_id:
                    raise ValueError(f"EPUB_DUPLICATE_ENTRY:{entry_id}")
                text = " ".join(part.strip() for part in section.itertext() if part.strip())
                by_id[entry_id] = norm(text)
                file_by_id[entry_id] = name
    return by_id, file_by_id


def add(errors: list[dict[str, Any]], code: str, detail: Any) -> None:
    errors.append({"code": code, "detail": detail})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--lesson-catalog",
        type=Path,
        default=ROOT / "apps/lesson-player/src/generated/lessons.json",
    )
    parser.add_argument(
        "--ogretmenos-export",
        type=Path,
        default=ROOT / "dist/ogretmenos/theme-1-guide-projection.json",
    )
    parser.add_argument(
        "--epub",
        type=Path,
        default=ROOT / "dist/Ogretmen-Rehberi-Tema-1-Kindle.epub",
    )
    parser.add_argument(
        "--epub-report",
        type=Path,
        default=ROOT / "dist/Ogretmen-Rehberi-Tema-1-Kindle.build.json",
    )
    parser.add_argument(
        "--freeze-manifest",
        type=Path,
        default=THEME_ROOT / "quality-freeze.json",
    )
    parser.add_argument(
        "--json-report",
        type=Path,
        default=ROOT / "dist/theme1-quality-freeze.json",
    )
    parser.add_argument(
        "--md-report",
        type=Path,
        default=ROOT / "dist/theme1-quality-freeze.md",
    )
    args = parser.parse_args()

    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    answer_index, answers = load_answers()
    source_index, sources = load_sources()
    all_lessons = json.loads(args.lesson_catalog.read_text(encoding="utf-8"))
    lessons = [
        lesson
        for lesson in all_lessons
        if lesson.get("theme_id") == "TEMA_01"
        or (
            lesson.get("theme_id") is None
            and str(lesson.get("lesson_id", "")).startswith("T11-T01-")
        )
    ]
    ogretmenos = json.loads(args.ogretmenos_export.read_text(encoding="utf-8"))
    epub_report = json.loads(args.epub_report.read_text(encoding="utf-8"))
    freeze_manifest = json.loads(args.freeze_manifest.read_text(encoding="utf-8"))

    answer_ids = [entry.get("question_id") for entry in answers]
    source_ids = [record.get("source_record_id") for record in sources]

    if len(answer_ids) != len(set(answer_ids)):
        add(errors, "DUPLICATE_ANSWER_ID", len(answer_ids) - len(set(answer_ids)))
    if len(source_ids) != len(set(source_ids)):
        add(errors, "DUPLICATE_SOURCE_ID", len(source_ids) - len(set(source_ids)))

    if len(answers) != 151:
        add(errors, "ANSWER_COUNT", f"{len(answers)}!=151")
    if len(sources) != 129:
        add(errors, "SOURCE_COUNT", f"{len(sources)}!=129")
    if answer_index.get("status") != "COMPLETE_WITH_SOURCE_LIMITED":
        add(errors, "ANSWER_BANK_STATUS", answer_index.get("status"))
    if source_index.get("answer_bank_status") != "COMPLETE_WITH_SOURCE_LIMITED":
        add(errors, "SOURCE_INDEX_ANSWER_STATUS", source_index.get("answer_bank_status"))
    if source_index.get("counts") != {"records": 129, "verified_records": 129}:
        add(errors, "SOURCE_INDEX_COUNTS", source_index.get("counts"))

    source_statuses = Counter(record.get("source_status") for record in sources)
    if source_statuses != Counter({"VERIFIED": 129}):
        add(errors, "SOURCE_REVIEW_STATUS", dict(source_statuses))

    allowed_types = {"question_answer", "performance_support", "source_limited"}
    source_limited = []
    field_counts = Counter()
    for entry in answers:
        qid = entry.get("question_id")
        for required in ("question_id", "entry_type", "printed_page", "prompt_summary", "answer", "source_locator"):
            if required not in entry or not norm(entry.get(required)):
                add(errors, "EMPTY_REQUIRED_ANSWER_FIELD", {"id": qid, "field": required})
        if entry.get("entry_type") not in allowed_types:
            add(errors, "UNKNOWN_ENTRY_TYPE", {"id": qid, "type": entry.get("entry_type")})
        page = entry.get("printed_page")
        if not isinstance(page, int) or not 14 <= page <= 83:
            add(errors, "ANSWER_PAGE_RANGE", {"id": qid, "page": page})
        for field in ("guidance", "explanation", "evidence_quotes", "answer_sections"):
            if field in entry and not entry.get(field):
                add(errors, "EMPTY_OPTIONAL_ANSWER_FIELD", {"id": qid, "field": field})
            if entry.get(field):
                field_counts[field] += 1
        if entry.get("entry_type") == "source_limited":
            source_limited.append(entry)
            if not entry.get("guidance"):
                add(errors, "SOURCE_LIMITED_WITHOUT_GUIDANCE", qid)

    if len(source_limited) != 12:
        add(errors, "SOURCE_LIMITED_COUNT", f"{len(source_limited)}!=12")

    # Detect accidental exact answer reuse.
    answers_by_text: dict[str, list[str]] = defaultdict(list)
    for entry in answers:
        key = norm_compare(entry.get("answer"))
        if key:
            answers_by_text[key].append(entry["question_id"])
    for ids in answers_by_text.values():
        if len(ids) > 1:
            add(errors, "EXACT_DUPLICATE_ANSWER", ids)

    # Editorial repetition report: exact and very-high-similarity optional helper fields.
    repetition_candidates: list[dict[str, Any]] = []
    for field in ("guidance", "explanation"):
        values = [
            (entry["question_id"], norm(entry.get(field)))
            for entry in answers
            if norm(entry.get(field))
        ]
        exact: dict[str, list[str]] = defaultdict(list)
        for qid, value in values:
            exact[norm_compare(value)].append(qid)
        for ids in exact.values():
            if len(ids) > 1:
                repetition_candidates.append(
                    {"field": field, "kind": "exact", "ids": ids}
                )
        for i, (left_id, left) in enumerate(values):
            left_norm = norm_compare(left)
            if len(left_norm) < 70:
                continue
            for right_id, right in values[i + 1 :]:
                right_norm = norm_compare(right)
                if len(right_norm) < 70 or left_norm == right_norm:
                    continue
                ratio = SequenceMatcher(None, left_norm, right_norm).ratio()
                if ratio >= 0.94:
                    repetition_candidates.append(
                        {
                            "field": field,
                            "kind": "near",
                            "ids": [left_id, right_id],
                            "similarity": round(ratio, 3),
                        }
                    )

    # Lesson Player parity.
    lp_answer_ids: list[str] = []
    lp_source_ids: list[str] = []
    lp_steps = 0
    for lesson in lessons:
        for step in lesson.get("steps", []):
            lp_steps += 1
            source = step.get("source") or {}
            if source.get("source_record_id"):
                lp_source_ids.append(source["source_record_id"])
            answer = step.get("answer")
            if answer:
                lp_answer_ids.append(answer["question_id"])

    lesson_order = [lesson.get("lesson_id") for lesson in lessons]
    expected_order = [
        "T11-T01-GIRIS",
        "T11-T01-KARAGOZ",
        "T11-T01-MEKTUP",
        "T11-T01-KONUSMA",
        "T11-T01-DINLEME-IZLEME",
        "T11-T01-YAZMA",
        "T11-T01-DEGERLENDIRME",
    ]
    if lesson_order != expected_order:
        add(errors, "LESSON_ORDER", lesson_order)
    if len(lessons) != 7 or lp_steps != 176:
        add(errors, "LESSON_PLAYER_TOTALS", {"lessons": len(lessons), "steps": lp_steps})
    if set(lp_source_ids) != set(source_ids):
        add(errors, "LESSON_PLAYER_SOURCE_PARITY", {
            "missing": sorted(set(source_ids) - set(lp_source_ids)),
            "extra": sorted(set(lp_source_ids) - set(source_ids)),
        })
    if set(lp_answer_ids) != set(answer_ids) or len(lp_answer_ids) != len(answer_ids):
        add(errors, "LESSON_PLAYER_ANSWER_PARITY", {
            "missing": sorted(set(answer_ids) - set(lp_answer_ids)),
            "extra": sorted(set(lp_answer_ids) - set(answer_ids)),
            "uses": len(lp_answer_ids),
        })

    # ÖğretmenOS projection parity and runtime-contract row shape.
    coverage = ogretmenos.get("coverage", {})
    expected_coverage = {
        "lessons": 7,
        "lesson_steps": 176,
        "source_records": 129,
        "answer_entries": 151,
        "source_limited_entries": 12,
    }
    if coverage != expected_coverage:
        add(errors, "OGRETMENOS_COVERAGE", coverage)
    snapshot = ogretmenos.get("canonical_snapshot", {})
    if snapshot.get("sources") != sources:
        add(errors, "OGRETMENOS_SOURCE_PAYLOAD_PARITY", "snapshot differs")
    if snapshot.get("answers") != answers:
        add(errors, "OGRETMENOS_ANSWER_PAYLOAD_PARITY", "snapshot differs")
    row_counts = ogretmenos.get("row_counts", {})
    expected_rows = {
        "canonical_entities": 281,
        "teacher_guides": 1,
        "teacher_guide_sections": 7,
        "teacher_guide_units": 129,
        "teacher_guide_items": 176,
        "teacher_guide_item_relations": 327,
    }
    if row_counts != expected_rows:
        add(errors, "OGRETMENOS_ROW_COUNTS", row_counts)

    # Frozen baseline: future canonical/presentation changes must update the
    # manifest intentionally rather than silently moving the quality target.
    if freeze_manifest.get("status") != "FROZEN_REPO_QA":
        add(errors, "FREEZE_STATUS", freeze_manifest.get("status"))
    if freeze_manifest.get("canonical") != {
        "source_records": len(sources),
        "verified_sources": source_statuses.get("VERIFIED", 0),
        "answer_entries": len(answers),
        "source_limited_entries": len(source_limited),
    }:
        add(errors, "FREEZE_CANONICAL_DRIFT", freeze_manifest.get("canonical"))
    if freeze_manifest.get("lesson_player") != {
        "lessons": len(lessons),
        "steps": lp_steps,
        "source_records": len(set(lp_source_ids)),
        "answer_entries": len(lp_answer_ids),
    }:
        add(errors, "FREEZE_LESSON_PLAYER_DRIFT", freeze_manifest.get("lesson_player"))

    frozen_ogretmenos = freeze_manifest.get("ogretmenos") or {}
    if frozen_ogretmenos.get("content_fingerprint") != ogretmenos.get("content_fingerprint"):
        add(errors, "FREEZE_FINGERPRINT_DRIFT", {
            "frozen": frozen_ogretmenos.get("content_fingerprint"),
            "actual": ogretmenos.get("content_fingerprint"),
        })
    if frozen_ogretmenos.get("row_counts") != row_counts:
        add(errors, "FREEZE_OGRETMENOS_ROW_DRIFT", frozen_ogretmenos.get("row_counts"))
    if frozen_ogretmenos.get("deterministic_build") is not True:
        add(errors, "FREEZE_DETERMINISM_NOT_DECLARED", frozen_ogretmenos.get("deterministic_build"))

    frozen_epub = freeze_manifest.get("epub") or {}
    if (
        frozen_epub.get("answer_entries") != len(answers)
        or frozen_epub.get("semantic_parity_entries") != len(answers)
        or frozen_epub.get("source_limited_entries") != len(source_limited)
    ):
        add(errors, "FREEZE_EPUB_DRIFT", frozen_epub)

    frozen_schema = freeze_manifest.get("schema_decision") or {}
    if (
        frozen_schema.get("migration_required") is not False
        or frozen_schema.get("answer_bank_schema") != answer_index.get("schema_version")
        or frozen_schema.get("lesson_flow_schema") != "0.2.0"
        or frozen_schema.get("source_index_schema") != source_index.get("schema_version")
    ):
        add(errors, "FREEZE_SCHEMA_DRIFT", frozen_schema)

    # EPUB parity: every canonical answer and every rendered teacher field must survive.
    epub_entries, epub_files = epub_sections(args.epub)
    if set(epub_entries) != set(answer_ids) or len(epub_entries) != 151:
        add(errors, "EPUB_ENTRY_PARITY", {
            "rendered": len(epub_entries),
            "missing": sorted(set(answer_ids) - set(epub_entries)),
            "extra": sorted(set(epub_entries) - set(answer_ids)),
        })
    if epub_report.get("entries") != 151 or epub_report.get("source_limited") != 12:
        add(errors, "EPUB_BUILD_REPORT", epub_report)

    for entry in answers:
        qid = entry["question_id"]
        rendered = epub_entries.get(qid, "")
        rendered_cmp = norm_compare(rendered)
        fragments = [entry.get("prompt_summary"), entry.get("answer")]
        fragments.extend(flatten_scalars(entry.get("answer_sections")))
        fragments.append(entry.get("guidance"))
        fragments.append(entry.get("explanation"))
        fragments.extend(entry.get("evidence_quotes") or [])
        for fragment in fragments:
            if not norm(fragment):
                continue
            needle = norm_compare(html.unescape(str(fragment)))
            if needle and needle not in rendered_cmp:
                add(errors, "EPUB_FIELD_LOSS", {
                    "id": qid,
                    "fragment": norm(fragment)[:120],
                })

    p14 = [qid for qid in answer_ids if qid.startswith("T1-P14-")]
    p15 = [qid for qid in answer_ids if qid.startswith("T1-P15-")]
    if any("temaya-baslarken" not in epub_files.get(qid, "") for qid in p14):
        add(errors, "EPUB_P14_CHAPTER", p14)
    if any("metin-tahlili-1" not in epub_files.get(qid, "") for qid in p15):
        add(errors, "EPUB_P15_CHAPTER", p15)

    metrics = {
        "canonical": {
            "source_records": len(sources),
            "verified_sources": source_statuses.get("VERIFIED", 0),
            "answer_entries": len(answers),
            "source_limited_entries": len(source_limited),
            "answer_fields": dict(field_counts),
        },
        "lesson_player": {
            "lessons": len(lessons),
            "steps": lp_steps,
            "unique_sources": len(set(lp_source_ids)),
            "answer_uses": len(lp_answer_ids),
        },
        "ogretmenos": {
            "coverage": coverage,
            "row_counts": row_counts,
            "content_fingerprint": ogretmenos.get("content_fingerprint"),
        },
        "epub": {
            "rendered_entries": len(epub_entries),
            "build_report": epub_report,
        },
        "editorial": {
            "repetition_candidates": repetition_candidates,
            "repetition_candidate_count": len(repetition_candidates),
        },
    }

    status = "PASS" if not errors else "FAIL"
    report = {
        "schema_version": "1.0.0",
        "document_type": "THEME_1_QUALITY_FREEZE_REPORT",
        "status": status,
        "scope": "TDE_11 / TEMA_01 / basılı s.12-83",
        "metrics": metrics,
        "errors": errors,
        "warnings": warnings,
        "manual_checks": [
            {
                "id": "KINDLE_PHYSICAL_DEVICE",
                "status": "PENDING_MANUAL",
                "note": "Fiziksel Kindle cihazında gerçek gönderim/okuma bu CI ortamında doğrulanamaz.",
            },
            {
                "id": "OGRETMENOS_DEVICE_IMPORT",
                "status": "PENDING_MANUAL",
                "note": "Bundle mevcut generic runtime contract ile uyumlu üretilir; gerçek uygulama runtime entegrasyonu ayrı repo değişikliğidir.",
            },
        ],
        "schema_decision": {
            "migration_required": False,
            "reason": "Mevcut answer-bank 2.0 + lesson-flow 0.2 alanları üç tüketici için veri kaybı olmadan yeterli.",
        },
    }

    args.json_report.parent.mkdir(parents=True, exist_ok=True)
    args.json_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    md = [
        "# 1. Tema Entegrasyon ve Kalite Dondurma Raporu",
        "",
        f"**Durum:** {status}",
        "",
        "## Otomatik kalite kapısı",
        "",
        f"- Kanonik kaynak: {len(sources)} kayıt; {source_statuses.get('VERIFIED', 0)} VERIFIED",
        f"- Cevap bankası: {len(answers)} kayıt; {len(source_limited)} source-limited",
        f"- Lesson Player: {len(lessons)} ders / {lp_steps} adım / {len(set(lp_source_ids))} source / {len(lp_answer_ids)} answer",
        f"- ÖğretmenOS projeksiyonu: {row_counts.get('teacher_guide_items', 0)} item / {row_counts.get('teacher_guide_units', 0)} unit",
        f"- EPUB: {len(epub_entries)} / {len(answers)} cevap kaydı semantik alan paritesi",
        "",
        "## Editoryal tekrar taraması",
        "",
        f"- Yüksek benzerlik / tam tekrar adayı: {len(repetition_candidates)}",
    ]
    if repetition_candidates:
        for item in repetition_candidates:
            suffix = f" ({item.get('similarity')})" if item.get("similarity") else ""
            md.append(
                f"- {item['field']} · {item['kind']}{suffix}: " + ", ".join(item["ids"])
            )
    else:
        md.append("- Aday bulunmadı.")

    md.extend([
        "",
        "## Hatalar",
        "",
    ])
    if errors:
        md.extend(f"- **{item['code']}**: {item['detail']}" for item in errors)
    else:
        md.append("- Yok.")

    md.extend([
        "",
        "## Uyarılar",
        "",
    ])
    if warnings:
        md.extend(f"- **{item['code']}**: {item['detail']}" for item in warnings)
    else:
        md.append("- Yok.")

    md.extend([
        "",
        "## Manuel doğrulama sınırı",
        "",
        "- Fiziksel Kindle gönderim/okuma testi CI içinde yapılamaz.",
        "- ÖğretmenOS için bu repoda generic runtime sözleşmesine uyumlu projection bundle üretilir; uygulama runtime'ına gerçek import ayrı repo entegrasyonudur.",
        "",
        "## Şema kararı",
        "",
        "- Şema migrasyonu gerekmiyor. Answer-bank 2.0 ve lesson-flow 0.2, üç tüketiciye veri kaybı olmadan projekte edilebiliyor.",
        "",
    ])
    args.md_report.write_text("\n".join(md), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
