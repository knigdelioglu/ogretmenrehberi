#!/usr/bin/env python3
"""Build a Kindle-friendly reflowable EPUB 3 from the canonical teacher guide answer bank.

Uses only the Python standard library. No network access is required.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

THEME_CONFIG = {
    1: {
        "theme_id": "TEMA_01",
        "theme_slug": "theme-1",
        "title": "Bir Diyeceğim Var!",
        "subtitle": "11. Sınıf Türk Dili ve Edebiyatı · Öğretmen Rehberi",
        "blocks": [
            (14, 17, "Temaya Başlarken", "temaya-baslarken"),
            (18, 35, "Metin Tahlili-1 · Karagöz / Yazıcı", "metin-tahlili-1"),
            (36, 52, "Metin Tahlili-2 · Mektup / Âli’ye Mektuplar / Dilekçe", "metin-tahlili-2"),
            (53, 57, "Edebiyat Atölyesi-1 · Konuşma", "konusma"),
            (59, 73, "Metin Tahlili-3 · Dinleme / İzleme", "dinleme-izleme"),
            (74, 78, "Edebiyat Atölyesi-2 · Yazma / E-posta", "yazma"),
            (79, 83, "Tema Sonu Ölçme ve Değerlendirme", "olcme-degerlendirme"),
        ],
    }
}

CSS = r"""
@page { margin: 5%; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: serif;
  line-height: 1.55;
  margin: 0 auto;
  max-width: 42em;
  padding: 0 0.4em;
  color: #111;
}
h1, h2, h3 { font-family: sans-serif; line-height: 1.2; }
h1 { margin-top: 1.4em; }
h2 { margin-top: 1.25em; border-bottom: 1px solid #999; padding-bottom: 0.25em; }
h3 { margin: 0 0 0.55em; font-size: 1.05em; }
a { color: inherit; }
.cover {
  min-height: 85vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
.cover .kicker { font-family: sans-serif; font-weight: bold; letter-spacing: 0.08em; }
.cover h1 { font-size: 2.2em; margin: 0.4em 0; }
.cover .theme { font-size: 1.35em; }
.cover .meta { margin-top: 2em; font-size: 0.9em; }
.notice {
  border-left: 0.35em solid #555;
  padding: 0.2em 0.8em;
  margin: 1em 0;
}
.entry {
  margin: 1.3em 0 1.8em;
  padding-top: 0.2em;
  page-break-inside: avoid;
}
.entry + .entry { border-top: 1px solid #bbb; padding-top: 1.3em; }
.entry-meta {
  font-family: sans-serif;
  font-size: 0.82em;
  margin-bottom: 0.45em;
}
.badge {
  display: inline-block;
  border: 1px solid #777;
  border-radius: 0.2em;
  padding: 0.08em 0.38em;
  margin-right: 0.45em;
  font-size: 0.9em;
}
.badge.performance { font-weight: bold; }
.badge.limited { font-weight: bold; border-style: double; }
.prompt {
  font-weight: bold;
  margin: 0.25em 0 0.65em;
}
.answer-label, .aux-label {
  font-family: sans-serif;
  font-weight: bold;
  margin-top: 0.8em;
  margin-bottom: 0.2em;
}
.guidance, .explanation, .limited-note {
  margin: 0.85em 0;
  padding: 0.55em 0.7em;
  border-left: 0.25em solid #888;
}
.evidence {
  margin: 0.85em 0;
  padding: 0.55em 0.7em;
  border-left: 0.25em solid #444;
}
.evidence strong { font-weight: bold; }
.source {
  font-size: 0.78em;
  margin-top: 0.8em;
}
.page-links {
  font-family: sans-serif;
  font-size: 0.86em;
  line-height: 1.8;
}
.page-links a { white-space: nowrap; }
.back { text-align: right; font-size: 0.78em; margin-top: 0.7em; }
dl { margin: 0.6em 0 0.9em; }
dt { font-weight: bold; margin-top: 0.55em; }
dd { margin-left: 1.1em; }
ul { margin-top: 0.3em; }
.limited-index li { margin: 0.45em 0; }
.small { font-size: 0.82em; }
"""


def e(value) -> str:
    return html.escape(str(value), quote=True)


def slug_id(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_.-]+", "-", value)
    return value.strip("-") or "entry"


def render_paragraphs(text: str) -> str:
    chunks = [x.strip() for x in str(text).split("\n\n") if x.strip()]
    if not chunks:
        chunks = [str(text).strip()]
    out = []
    for chunk in chunks:
        out.append("<p>" + e(chunk).replace("\n", "<br/>") + "</p>")
    return "".join(out)


def render_sections(value) -> str:
    if isinstance(value, dict):
        items = []
        for key, val in value.items():
            items.append(f"<dt>{e(str(key).replace('_', ' ').title())}</dt><dd>{render_sections(val)}</dd>")
        return "<dl>" + "".join(items) + "</dl>"
    if isinstance(value, list):
        return "<ul>" + "".join(f"<li>{render_sections(x)}</li>" for x in value) + "</ul>"
    return e(value)


def type_badge(entry_type: str) -> tuple[str, str]:
    if entry_type == "performance_support":
        return ("performance", "Performans desteği")
    if entry_type == "source_limited":
        return ("limited", "Kaynak gerekli")
    return ("question", "Soru / cevap")


def answer_label(entry_type: str) -> str:
    if entry_type == "performance_support":
        return "Örnek / uygulama desteği"
    if entry_type == "source_limited":
        return "Kaynak durumu ve öğretmen notu"
    return "Cevap"


def load_theme(theme_no: int):
    cfg = THEME_CONFIG[theme_no]
    base = ROOT / "data/grade-11/source/teacher-book" / cfg["theme_slug"]
    index_path = base / "answer-bank.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    entries = []
    for part in index["parts"]:
        part_path = base / part["path"]
        payload = json.loads(part_path.read_text(encoding="utf-8"))
        entries.extend(payload.get("entries", []))

    ids = [x["question_id"] for x in entries]
    if len(ids) != len(set(ids)):
        raise SystemExit("Duplicate question_id detected")
    expected = index["coverage"]["entry_count"]
    if len(entries) != expected:
        raise SystemExit(f"Entry count mismatch: index={expected}, actual={len(entries)}")

    def sort_key(x):
        return (int(x.get("printed_page", 10**9)), str(x.get("question_no", "")), x["question_id"])
    entries.sort(key=sort_key)
    return cfg, index, entries


def xhtml_doc(title: str, body: str, *, extra_head: str = "") -> str:
    return f'''<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="tr" xml:lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>{e(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
  {extra_head}
</head>
<body>{body}</body>
</html>'''


def render_entry(entry: dict, chapter_slug: str) -> str:
    eid = slug_id(entry["question_id"])
    etype = entry.get("entry_type", "question_answer")
    badge_class, badge_text = type_badge(etype)
    page = entry.get("printed_page", "?")
    qno = entry.get("question_no")
    qno_text = f" · {e(qno)}" if qno not in (None, "") else ""
    prompt = entry.get("prompt_summary") or entry.get("prompt") or ""
    parts = [
        f'<section class="entry" id="{eid}">',
        f'<div class="entry-meta"><span class="badge {badge_class}">{e(badge_text)}</span>Basılı s. {e(page)}{qno_text}</div>',
        f'<h3 class="prompt">{e(prompt)}</h3>',
        f'<div class="answer-label">{e(answer_label(etype))}</div>',
        render_paragraphs(entry.get("answer", "")),
    ]
    if entry.get("answer_sections"):
        parts.append(render_sections(entry["answer_sections"]))
    if entry.get("guidance"):
        parts.extend([
            '<div class="guidance">',
            '<div class="aux-label">Yönlendirme</div>',
            render_paragraphs(entry["guidance"]),
            '</div>'
        ])
    if entry.get("explanation"):
        parts.extend([
            '<div class="explanation">',
            '<div class="aux-label">Açıklama</div>',
            render_paragraphs(entry["explanation"]),
            '</div>'
        ])
    if entry.get("evidence_quotes"):
        quotes = " ".join(f"<strong>{e(q)}</strong>" for q in entry["evidence_quotes"])
        parts.append(f'<div class="evidence"><div class="aux-label">Metinden kısa kanıt</div><p>{quotes}</p></div>')
    if entry.get("source_locator"):
        parts.append(f'<div class="source">Kaynak: {e(entry["source_locator"])}</div>')
    parts.append(f'<div class="back"><a href="#chapter-top">↑ Bölüm başına dön</a></div>')
    parts.append("</section>")
    return "".join(parts)


def build(theme_no: int, out_path: Path):
    cfg, index, entries = load_theme(theme_no)

    blocks = []
    assigned = set()
    for start, end, title, slug in cfg["blocks"]:
        block_entries = [x for x in entries if start <= int(x["printed_page"]) <= end]
        blocks.append((start, end, title, slug, block_entries))
        assigned.update(x["question_id"] for x in block_entries)

    unassigned = [x for x in entries if x["question_id"] not in assigned]
    if unassigned:
        raise SystemExit("Entries outside configured block ranges: " + ", ".join(x["question_id"] for x in unassigned))

    limited = [x for x in entries if x.get("entry_type") == "source_limited"]
    declared_limited = index["coverage"].get("source_limited_entries")
    if declared_limited is not None and len(limited) != declared_limited:
        raise SystemExit(f"source_limited mismatch: index={declared_limited}, actual={len(limited)}")

    uid = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, f"ogretmenrehberi:{cfg['theme_id']}:v2"))
    modified = datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")

    files: dict[str, bytes] = {}
    files["META-INF/container.xml"] = b'''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>'''
    files["OEBPS/styles/style.css"] = CSS.encode("utf-8")

    cover_body = f'''
<main class="cover">
  <div class="kicker">ÖĞRETMEN REHBERİ</div>
  <h1>{e(cfg["title"])}</h1>
  <div class="theme">1. Tema</div>
  <div>{e(cfg["subtitle"])}</div>
  <div class="meta">{len(entries)} rehber kaydı · Basılı s. {e(index["coverage"]["printed_page_range"])}</div>
</main>'''
    files["OEBPS/cover.xhtml"] = xhtml_doc(cfg["title"], cover_body).encode("utf-8")

    intro_body = f'''
<h1 id="intro-top">Bu rehber nasıl kullanılır?</h1>
<div class="notice">
  <p>Bu EPUB, Tema 1 için oluşturulan kanonik öğretmen rehberi verisinden üretilmiştir.</p>
  <p><strong>Soru / cevap</strong> kayıtlarında sınıfta doğrudan kullanılabilir cevap; <strong>Performans desteği</strong> kayıtlarında tek doğru iddiası taşımayan örnek plan veya ürün; <strong>Kaynak gerekli</strong> kayıtlarında ise QR/video gibi harici kaynak görülmeden kesinleştirilemeyen noktalar gösterilir.</p>
</div>
<p>Yönlendirme ve açıklamalar yalnız gerektiği yerde bulunur. Metinden alınması yararlı olan kısa ifadeler <strong>kalın</strong> gösterilir. Soru başlıkları ders kitabındaki soruların kısa özetidir; kitabın tam soru metninin yerine geçmez.</p>
<p>Her bölümün başındaki sayfa bağlantılarıyla doğrudan ilgili sayfaya, her kaydın sonundaki bağlantıyla bölüm başına dönebilirsiniz.</p>
'''
    files["OEBPS/intro.xhtml"] = xhtml_doc("Kullanım Notu", intro_body).encode("utf-8")

    chapter_items = []
    page_link_targets = {}
    for idx_no, (start, end, title, slug, block_entries) in enumerate(blocks, start=1):
        by_page = {}
        for item in block_entries:
            by_page.setdefault(int(item["printed_page"]), []).append(item)
        page_links = []
        entry_html = []
        for page in sorted(by_page):
            first_id = slug_id(by_page[page][0]["question_id"])
            page_links.append(f'<a href="#{first_id}">s. {page}</a>')
            page_link_targets[page] = (slug, first_id)
            for item in by_page[page]:
                entry_html.append(render_entry(item, slug))
        body = (
            f'<h1 id="chapter-top">{e(title)}</h1>'
            f'<p class="small">Basılı s. {start}–{end} · {len(block_entries)} kayıt</p>'
            f'<div class="page-links"><strong>Sayfalar:</strong> {" · ".join(page_links)}</div>'
            + "".join(entry_html)
        )
        filename = f"chapter-{idx_no:02d}-{slug}.xhtml"
        files[f"OEBPS/{filename}"] = xhtml_doc(title, body).encode("utf-8")
        chapter_items.append((title, filename, slug, block_entries))

    limited_links = []
    for item in limited:
        page = int(item["printed_page"])
        slug, eid = page_link_targets[page]
        chapter_filename = next(x[1] for x in chapter_items if x[2] == slug)
        limited_links.append(
            f'<li><a href="{chapter_filename}#{eid}">s. {page} · {e(item.get("prompt_summary","Kaynak gerekli kayıt"))}</a></li>'
        )
    limited_body = f'''
<h1 id="limited-top">Harici Kaynak Gerektiren Kayıtlar</h1>
<p>Bu {len(limited)} kayıt, QR video/dinleme/görsel gibi kitap PDF'sinin tek başına doğrulamadığı bir kaynağa bağlıdır. Rehber bu noktalarda içerik uydurmaz.</p>
<ul class="limited-index">{"".join(limited_links)}</ul>
'''
    files["OEBPS/source-limited.xhtml"] = xhtml_doc("Harici Kaynak Gerektiren Kayıtlar", limited_body).encode("utf-8")

    toc_li = ['<li><a href="cover.xhtml">Kapak</a></li>', '<li><a href="intro.xhtml">Kullanım Notu</a></li>']
    for title, filename, _, _ in chapter_items:
        toc_li.append(f'<li><a href="{filename}">{e(title)}</a></li>')
    toc_li.append('<li><a href="source-limited.xhtml">Harici Kaynak Gerektiren Kayıtlar</a></li>')

    nav_body = f'''
<nav epub:type="toc" id="toc">
  <h1>İçindekiler</h1>
  <ol>{"".join(toc_li)}</ol>
</nav>
<nav epub:type="landmarks" hidden="hidden">
  <ol>
    <li><a epub:type="cover" href="cover.xhtml">Kapak</a></li>
    <li><a epub:type="bodymatter" href="intro.xhtml">Başlangıç</a></li>
  </ol>
</nav>
'''
    files["OEBPS/nav.xhtml"] = xhtml_doc("İçindekiler", nav_body).encode("utf-8")

    manifest_items = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="limited" href="source-limited.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="css" href="styles/style.css" media-type="text/css"/>',
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    ]
    spine_items = ['<itemref idref="cover"/>', '<itemref idref="intro"/>']
    for i, (_, filename, _, _) in enumerate(chapter_items, start=1):
        manifest_items.append(f'<item id="ch{i}" href="{filename}" media-type="application/xhtml+xml"/>')
        spine_items.append(f'<itemref idref="ch{i}"/>')
    spine_items.append('<itemref idref="limited"/>')

    opf = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="tr">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">{e(uid)}</dc:identifier>
    <dc:title>Öğretmen Rehberi · 1. Tema · {e(cfg["title"])}</dc:title>
    <dc:language>tr</dc:language>
    <dc:creator>Öğretmen Rehberi</dc:creator>
    <dc:subject>Türk Dili ve Edebiyatı</dc:subject>
    <dc:description>11. sınıf Tema 1 öğretmen rehberi. {len(entries)} rehber kaydı.</dc:description>
    <meta property="dcterms:modified">{modified}</meta>
  </metadata>
  <manifest>{"".join(manifest_items)}</manifest>
  <spine toc="ncx">{"".join(spine_items)}</spine>
</package>'''
    files["OEBPS/content.opf"] = opf.encode("utf-8")

    navpoints = [
        ('cover', 'Kapak', 'cover.xhtml'),
        ('intro', 'Kullanım Notu', 'intro.xhtml'),
    ]
    for i, (title, filename, _, _) in enumerate(chapter_items, start=1):
        navpoints.append((f"ch{i}", title, filename))
    navpoints.append(("limited", "Harici Kaynak Gerektiren Kayıtlar", "source-limited.xhtml"))
    ncx_points = []
    for play, (nid, label, src) in enumerate(navpoints, start=1):
        ncx_points.append(
            f'<navPoint id="{nid}" playOrder="{play}"><navLabel><text>{e(label)}</text></navLabel><content src="{src}"/></navPoint>'
        )
    ncx = f'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="{e(uid)}"/></head>
  <docTitle><text>Öğretmen Rehberi · 1. Tema · {e(cfg["title"])}</text></docTitle>
  <navMap>{"".join(ncx_points)}</navMap>
</ncx>'''
    files["OEBPS/toc.ncx"] = ncx.encode("utf-8")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        for path, data in files.items():
            z.writestr(path, data, compress_type=zipfile.ZIP_DEFLATED)

    validate(out_path, expected_entries=len(entries))
    return {
        "theme": cfg["theme_id"],
        "title": cfg["title"],
        "entries": len(entries),
        "source_limited": len(limited),
        "blocks": [{"title": x[2], "entries": len(x[4]), "pages": f"{x[0]}-{x[1]}"} for x in blocks],
        "output": str(out_path),
        "size_bytes": out_path.stat().st_size,
    }


def validate(path: Path, expected_entries: int):
    with zipfile.ZipFile(path, "r") as z:
        names = z.namelist()
        if not names or names[0] != "mimetype":
            raise SystemExit("EPUB invalid: mimetype must be first")
        if z.getinfo("mimetype").compress_type != zipfile.ZIP_STORED:
            raise SystemExit("EPUB invalid: mimetype must be uncompressed")
        if z.read("mimetype") != b"application/epub+zip":
            raise SystemExit("EPUB invalid mimetype")
        bad = z.testzip()
        if bad:
            raise SystemExit(f"EPUB CRC failure: {bad}")
        required = {"META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml", "OEBPS/toc.ncx"}
        missing = required - set(names)
        if missing:
            raise SystemExit(f"EPUB missing files: {sorted(missing)}")
        for name in names:
            if name.endswith((".xml", ".opf", ".xhtml", ".ncx")):
                ET.fromstring(z.read(name))
        joined = b"\n".join(z.read(n) for n in names if n.endswith(".xhtml"))
        actual_entries = joined.count(b'class="entry"')
        if actual_entries != expected_entries:
            raise SystemExit(f"Rendered entry mismatch: expected={expected_entries}, actual={actual_entries}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--theme", type=int, default=1, choices=sorted(THEME_CONFIG))
    parser.add_argument("--output", type=Path, default=ROOT / "dist" / "Ogretmen-Rehberi-Tema-1-Kindle.epub")
    args = parser.parse_args()
    report = build(args.theme, args.output)
    report_path = args.output.with_suffix(".build.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
