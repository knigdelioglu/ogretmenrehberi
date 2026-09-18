#!/usr/bin/env python3
"""Build a lossless Theme 1 Teacher Guide projection bundle for ÖğretmenOS.

The bundle mirrors the generic Teacher Guide runtime contract used by
knigdelioglu/OgretmenOS (guide/section/unit/item/relation rows) without
materializing a course_runtime.sqlite in this repository.

Input:
- canonical Theme 1 source-index + answer-bank
- generated Lesson Player catalog

Output:
- deterministic JSON bundle suitable for a downstream runtime compiler
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
THEME_ROOT = ROOT / "data/grade-11/source/teacher-book/theme-1"


def compact(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def sha256_json(value: Any) -> str:
    return hashlib.sha256(compact(value).encode("utf-8")).hexdigest()


def load_answers() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    index = json.loads((THEME_ROOT / "answer-bank.json").read_text(encoding="utf-8"))
    entries: list[dict[str, Any]] = []
    for part in index["parts"]:
        payload = json.loads((THEME_ROOT / part["path"]).read_text(encoding="utf-8"))
        entries.extend(payload.get("entries", []))
    if len(entries) != index["coverage"]["entry_count"]:
        raise SystemExit("ANSWER_COUNT_MISMATCH")
    ids = [entry["question_id"] for entry in entries]
    if len(ids) != len(set(ids)):
        raise SystemExit("DUPLICATE_ANSWER_ID")
    return index, entries


def load_sources() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = json.loads((THEME_ROOT / "source-index.json").read_text(encoding="utf-8"))
    records = payload.get("records", [])
    ids = [record["source_record_id"] for record in records]
    if len(ids) != len(set(ids)):
        raise SystemExit("DUPLICATE_SOURCE_ID")
    return payload, records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--lesson-catalog",
        type=Path,
        default=ROOT / "apps/lesson-player/src/generated/lessons.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "dist/ogretmenos/theme-1-guide-projection.json",
    )
    args = parser.parse_args()

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

    answer_by_id = {entry["question_id"]: entry for entry in answers}
    source_by_id = {record["source_record_id"]: record for record in sources}

    if len(lessons) != 7:
        raise SystemExit(f"LESSON_COUNT_MISMATCH:{len(lessons)}!=7")

    canonical_entities = [
        {"entity_type": "theme", "entity_id": "TEMA_01"},
        *[
            {"entity_type": "teacher_guide_source", "entity_id": source_id}
            for source_id in sorted(source_by_id)
        ],
        *[
            {"entity_type": "teacher_guide_answer", "entity_id": answer_id}
            for answer_id in sorted(answer_by_id)
        ],
    ]

    guide_id = "TDE_11:TEMA_01:OGRETMEN_REHBERI"
    guides = [
        {
            "guide_id": guide_id,
            "course_id": "TDE_11",
            "scope_type": "theme",
            "scope_id": "TEMA_01",
            "title": answer_index["theme_title"],
            "content_status": "VERIFIED",
            "schema_version": "1.0.0",
            "provenance": {
                "source_ids": ["official_textbook_pdf"],
                "source_locators": [answer_index["coverage"]["printed_page_range"]],
                "content_class": "OGRETMEN_REHBERI_THEME_FREEZE",
                "answer_bank_schema": answer_index["schema_version"],
                "source_index_schema": source_index["schema_version"],
            },
        }
    ]

    sections: list[dict[str, Any]] = []
    units: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []
    relations: list[dict[str, Any]] = []

    seen_sources: set[str] = set()
    seen_answers: set[str] = set()
    seen_items: set[str] = set()

    for section_order, lesson in enumerate(lessons, start=1):
        section_id = f"{guide_id}:SECTION:{section_order:02d}"
        sections.append(
            {
                "section_id": section_id,
                "guide_id": guide_id,
                "section_order": section_order,
                "title": lesson["title"],
                "section_type": "LESSON_FLOW",
                "page_locator": lesson["printed_page_range"],
                "source_locator": f"basılı s. {lesson['printed_page_range']}",
                "content_status": "VERIFIED",
                "provenance": {
                    "source_ids": [lesson["lesson_id"]],
                    "source_locators": [lesson["printed_page_range"]],
                    "content_class": "LESSON_PLAYER_FLOW",
                    "lesson_id": lesson["lesson_id"],
                    "lesson_slug": lesson["lesson_slug"],
                },
            }
        )

        source_to_unit: dict[str, str] = {}
        source_unit_order: dict[str, int] = {}
        next_unit_order = 1
        item_orders: dict[str, int] = {}

        for step in lesson["steps"]:
            source = step["source"]
            source_id = source["source_record_id"]
            if source_id not in source_by_id:
                raise SystemExit(f"UNKNOWN_SOURCE:{source_id}")
            if source_by_id[source_id] != source:
                raise SystemExit(f"SOURCE_PAYLOAD_DRIFT:{source_id}")
            seen_sources.add(source_id)

            if source_id not in source_to_unit:
                unit_id = f"{guide_id}:UNIT:{source_id}"
                source_to_unit[source_id] = unit_id
                source_unit_order[source_id] = next_unit_order
                next_unit_order += 1
                units.append(
                    {
                        "unit_id": unit_id,
                        "section_id": section_id,
                        "unit_order": source_unit_order[source_id],
                        "title": source.get("book_heading") or source_id,
                        "page_locator": source.get("printed_page_range"),
                        "source_locator": source.get("source_locator"),
                        "content_status": source.get("source_status", "VERIFIED"),
                        "purpose": {
                            "task_type": source.get("task_type"),
                            "rights_mode": source.get("rights_mode"),
                            "prompt_mode": source.get("prompt_mode"),
                        },
                        "provenance": {
                            "source_ids": [source_id],
                            "source_locators": [source.get("source_locator") or ""],
                            "content_class": "SOURCE_INDEX_RECORD",
                        },
                    }
                )

            unit_id = source_to_unit[source_id]
            item_orders[unit_id] = item_orders.get(unit_id, 0) + 1

            generated_answer = step.get("answer")
            answer = None
            answer_id = None
            if generated_answer is not None:
                answer_id = generated_answer["question_id"]
                if answer_id not in answer_by_id:
                    raise SystemExit(f"UNKNOWN_ANSWER:{answer_id}")
                # The Lesson Player may add derived display metadata such as
                # question_no. The export must remain bound to the canonical
                # answer-bank payload, not to a UI-normalized copy.
                answer = answer_by_id[answer_id]
                seen_answers.add(answer_id)

            item_id = f"{lesson['lesson_id']}:{step['id']}"
            if item_id in seen_items:
                raise SystemExit(f"DUPLICATE_ITEM_ID:{item_id}")
            seen_items.add(item_id)

            content_status = (
                "SOURCE_LIMITED"
                if answer is not None and answer.get("entry_type") == "source_limited"
                else "VERIFIED"
            )
            expected_response: Any = answer if answer is not None else step.get("content")
            teacher_guidance = {
                "guidance": answer.get("guidance") if answer else None,
                "explanation": answer.get("explanation") if answer else None,
                "lesson_content": step.get("content"),
                "reveal_order": step.get("reveal_order", []),
                "density": step.get("density"),
            }
            assessment_evidence = answer.get("evidence_quotes", []) if answer else []
            provenance = {
                "source_ids": [source_id] + ([answer_id] if answer_id else []),
                "source_locators": [source.get("source_locator") or ""],
                "content_class": "OGRETMEN_REHBERI_LESSON_STEP",
                "lesson_id": lesson["lesson_id"],
                "step_id": step["id"],
                "layout": step["layout"],
                "display_prompt_mode": step.get("display_prompt_mode"),
                "answer_id": answer_id,
            }
            digest_payload = {
                "source": source,
                "answer": answer,
                "content": step.get("content"),
                "display_prompt": step.get("display_prompt"),
                "layout": step.get("layout"),
                "reveal_order": step.get("reveal_order"),
            }

            items.append(
                {
                    "item_id": item_id,
                    "unit_id": unit_id,
                    "item_order": item_orders[unit_id],
                    "title": step.get("display_prompt"),
                    "label": step.get("display_prompt") or source.get("book_heading") or step["id"],
                    "item_type": source.get("task_type") or step.get("layout") or "REFERENCE",
                    "page_locator": source.get("printed_page_range"),
                    "source_locator": source.get("source_locator"),
                    "content_status": content_status,
                    "expected_response": expected_response,
                    "acceptance_criteria": [],
                    "teacher_guidance": teacher_guidance,
                    "common_misconceptions": [],
                    "assessment_evidence": assessment_evidence,
                    "differentiation": {"support": None, "enrichment": None},
                    "provenance": provenance,
                    "canonical_payload_sha256": sha256_json(digest_payload),
                }
            )

            relations.append(
                {
                    "item_id": item_id,
                    "target_type": "teacher_guide_source",
                    "target_id": source_id,
                    "relation_type": "DERIVED_FROM",
                    "relation_order": 1,
                }
            )
            if answer_id:
                relations.append(
                    {
                        "item_id": item_id,
                        "target_type": "teacher_guide_answer",
                        "target_id": answer_id,
                        "relation_type": "USES_ANSWER",
                        "relation_order": 2,
                    }
                )

    if seen_sources != set(source_by_id):
        missing = sorted(set(source_by_id) - seen_sources)
        raise SystemExit(f"UNPROJECTED_SOURCES:{missing}")
    if seen_answers != set(answer_by_id):
        missing = sorted(set(answer_by_id) - seen_answers)
        raise SystemExit(f"UNPROJECTED_ANSWERS:{missing}")

    # generated_at is build metadata, not content. Excluding it keeps the
    # fingerprint stable across identical rebuilds.
    semantic_lessons = [
        {
            key: value
            for key, value in lesson.items()
            if key not in {"generated_at", "theme_id"}
        }
        for lesson in lessons
    ]
    canonical_payload = {
        "sources": sources,
        "answers": answers,
        "lessons": semantic_lessons,
    }
    fingerprint = sha256_json(canonical_payload)

    bundle = {
        "schema_version": "1.0.0",
        "document_type": "OGRETMENOS_TEACHER_GUIDE_PROJECTION_BUNDLE",
        "runtime_contract": "OgretmenOS/docs/TEACHER_GUIDE_RUNTIME_CONTRACT.md",
        "course_id": "TDE_11",
        "theme_id": "TEMA_01",
        "validation_status": "PASS",
        "content_fingerprint": f"sha256:{fingerprint}",
        "coverage": {
            "lessons": len(lessons),
            "lesson_steps": len(items),
            "source_records": len(sources),
            "answer_entries": len(answers),
            "source_limited_entries": sum(
                1 for answer in answers if answer.get("entry_type") == "source_limited"
            ),
        },
        "row_counts": {
            "canonical_entities": len(canonical_entities),
            "teacher_guides": len(guides),
            "teacher_guide_sections": len(sections),
            "teacher_guide_units": len(units),
            "teacher_guide_items": len(items),
            "teacher_guide_item_relations": len(relations),
        },
        "canonical_entities": canonical_entities,
        "teacher_guides": guides,
        "teacher_guide_sections": sections,
        "teacher_guide_units": units,
        "teacher_guide_items": items,
        "teacher_guide_item_relations": relations,
        "canonical_snapshot": {
            "sources": sources,
            "answers": answers,
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": "PASS",
                "output": str(args.output),
                "coverage": bundle["coverage"],
                "row_counts": bundle["row_counts"],
                "content_fingerprint": bundle["content_fingerprint"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
