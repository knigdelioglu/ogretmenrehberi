#!/usr/bin/env python3
"""Validate the self-contained Grade 11 Theme 4 Book Source JSON bundle."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / "manifest.json"
errors = []

def fail(message):
    errors.append(message)

def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"JSON parse failure: {path.relative_to(ROOT)}: {exc}")
        return None

manifest = read_json(MANIFEST_PATH)
if manifest is None:
    sys.exit(1)

if (manifest.get("grade"), manifest.get("theme_id"), manifest.get("theme_no")) != (11, "theme-4", 4):
    fail("manifest grade/theme identity is not Grade 11 Theme 4")
if (manifest.get("printed_page_start"), manifest.get("printed_page_end")) != (236, 307):
    fail("manifest printed page range must be 236–307")
if (manifest.get("pdf_page_start"), manifest.get("pdf_page_end"), manifest.get("pdf_page_offset")) != (237, 308, 1):
    fail("manifest PDF range/offset must be 237–308 / +1")

expected_files = [f"pages/p{p}.json" for p in range(236, 308)]
listed_files = manifest.get("page_files", [])
if listed_files != expected_files:
    fail("manifest page_files must list each page p236–p307 exactly once and in order")
actual_files = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "pages").glob("*.json"))
if actual_files != expected_files:
    fail("pages directory does not contain exactly p236.json–p307.json")
for rel in expected_files:
    if not (ROOT / rel).is_file():
        fail(f"manifest page file missing: {rel}")

pages = [read_json(ROOT / rel) for rel in expected_files if (ROOT / rel).is_file()]
if any(page is None for page in pages):
    sys.exit(1)

blocks = []
ids = {}
for expected_printed, page in zip(range(236, 308), pages):
    if page.get("grade") != 11 or page.get("theme_id") != "theme-4":
        fail(f"page p{expected_printed} has wrong grade/theme identity")
    if page.get("printed_page") != expected_printed or page.get("pdf_page") != expected_printed + 1:
        fail(f"page p{expected_printed} printed/PDF page mapping is inconsistent")
    if not isinstance(page.get("page_text"), str) or not page["page_text"].strip():
        fail(f"page p{expected_printed} has no source page_text")
    for block in page.get("blocks", []):
        blocks.append(block)
        block_id = block.get("id", "")
        if not re.fullmatch(rf"G11-T4-P{expected_printed}-.+", block_id):
            fail(f"invalid or out-of-scope block ID on p{expected_printed}: {block_id!r}")
        if block_id in ids:
            fail(f"duplicate block ID: {block_id}")
        ids[block_id] = block
        src = block.get("source", {})
        if (src.get("printed_page"), src.get("pdf_page")) != (expected_printed, expected_printed + 1):
            fail(f"block {block_id} has inconsistent source page")
        if block.get("type") == "question":
            if not str(block.get("question_number", "")).strip():
                fail(f"question number missing: {block_id}")
            if not str(block.get("text", "")).strip() and not block.get("subquestions"):
                fail(f"question has neither prompt text nor subquestions: {block_id}")
            # Carried subquestions on p252 explicitly continue question 2 from p251.
            if not (expected_printed == 252 and block.get("continuation", {}).get("from_previous_page")):
                number = re.escape(str(block["question_number"]))
                if not re.search(rf"(?m)^\s*{number}\.\s", page["page_text"]):
                    fail(f"question number {number} not found in p{expected_printed} page_text ({block_id})")
        if block.get("type") == "table":
            columns = block.get("columns", [])
            if not columns:
                fail(f"table has no columns: {block_id}")
            for row_no, row in enumerate(block.get("rows", []), 1):
                if len(row) != len(columns):
                    fail(f"table row width mismatch: {block_id} row {row_no}")

# Resolve every declared ID reference within this Theme 4 bundle.
scalar_refs = ("instruction_id", "continues_from")
list_refs = ("related_text_ids", "related_table_ids", "instruction_ids", "question_ids", "table_ids")
for block in blocks:
    for key in scalar_refs:
        ref = block.get(key)
        if ref and ref not in ids:
            fail(f"unresolved {key}={ref} in {block['id']}")
    for key in list_refs:
        for ref in block.get(key, []):
            if ref not in ids:
                fail(f"unresolved {key}={ref} in {block['id']}")
    continuation = block.get("continuation", {})
    for key in ("previous_question_id", "from_block_id", "to_block_id"):
        ref = continuation.get(key)
        if ref and ref not in ids:
            fail(f"unresolved continuation.{key}={ref} in {block['id']}")
    if block.get("theme_id", "theme-4") != "theme-4":
        fail(f"out-of-theme block: {block['id']}")
    if any("answer" in str(key).casefold() for key in block):
        fail(f"answer field present in Book Source block: {block['id']}")

counts = Counter(block.get("type") for block in blocks)
stats = manifest.get("statistics", {})
expected_stats = {
    "pages": 72,
    "blocks": len(blocks),
    "questions": counts["question"],
    "tables": counts["table"],
    "activities": counts["activity"],
}
for key, expected in expected_stats.items():
    if stats.get(key) != expected:
        fail(f"manifest statistics.{key}={stats.get(key)!r}; expected {expected}")
if stats.get("all_block_types") != dict(counts):
    fail("manifest all_block_types does not match page block records")

if errors:
    print(f"FAIL: {len(errors)} issue(s)")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("PASS: 72 page JSON files parse and match printed/PDF page mapping (236–307 / 237–308).")
print(f"PASS: {len(blocks)} blocks have unique in-scope IDs; all declared ID references resolve.")
print(f"PASS: {counts['question']} questions retain source question numbers; {counts['table']} tables have consistent row widths.")
print(f"PASS: manifest files and all block statistics match; no answer fields or out-of-theme IDs found.")
