const encoder = new TextEncoder();

function xml(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainText(value) {
  if (value == null || typeof value === "boolean") return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(plainText);
  if (typeof value === "object") {
    const label = value.title || value.label || value.term || value.name;
    const body = value.body || value.text || value.definition || value.meaning || value.description;
    if (label && body) return [`${label}: ${body}`];
    if (label) return [String(label), ...Object.entries(value).filter(([key]) => key !== "title" && key !== "label" && key !== "term" && key !== "name").flatMap(([, item]) => plainText(item))];
    return Object.values(value).flatMap(plainText);
  }
  return [];
}

function paragraphs(value) {
  return plainText(value).map((line) => line.trim()).filter(Boolean);
}

function wrapContent(values, maxChars = 82) {
  return values.flatMap((value) => {
    const words = String(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      if (word.length > maxChars) {
        if (line) lines.push(line);
        line = "";
        for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      } else if (!line) line = word;
      else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value, true); }

function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const [name, contents] of files) {
    const filename = encoder.encode(name);
    const data = encoder.encode(contents);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30);
    const lh = new DataView(localHeader.buffer);
    u32(lh, 0, 0x04034b50); u16(lh, 4, 20); u16(lh, 6, 0x0800); u16(lh, 8, 0);
    u16(lh, 10, 0); u16(lh, 12, 0); u32(lh, 14, checksum); u32(lh, 18, data.length);
    u32(lh, 22, data.length); u16(lh, 26, filename.length); u16(lh, 28, 0);
    local.push(localHeader, filename, data);

    const centralHeader = new Uint8Array(46);
    const ch = new DataView(centralHeader.buffer);
    u32(ch, 0, 0x02014b50); u16(ch, 4, 20); u16(ch, 6, 20); u16(ch, 8, 0x0800);
    u16(ch, 10, 0); u16(ch, 12, 0); u16(ch, 14, 0); u32(ch, 16, checksum);
    u32(ch, 20, data.length); u32(ch, 24, data.length); u16(ch, 28, filename.length);
    u16(ch, 30, 0); u16(ch, 32, 0); u16(ch, 34, 0); u16(ch, 36, 0); u32(ch, 38, 0);
    u32(ch, 42, offset);
    central.push(centralHeader, filename);
    offset += localHeader.length + filename.length + data.length;
  }

  const centralSize = central.reduce((size, part) => size + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, files.length);
  u16(ev, 10, files.length); u32(ev, 12, centralSize); u32(ev, 16, offset); u16(ev, 20, 0);
  return new Blob([...local, ...central, end], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  });
}

function shape(id, name, text, { x, y, w, h, size, color, bold = false, align = "l" }) {
  const lines = paragraphs(text);
  const body = lines.length ? lines : [""];
  const xmlLines = body.map((line) => `<a:p><a:pPr algn="${align}"><a:buNone/></a:pPr><a:r><a:rPr lang="tr-TR" sz="${size}" b="${bold ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t xml:space="preserve">${xml(line)}</a:t></a:r><a:endParaRPr lang="tr-TR" sz="${size}"/></a:p>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" lIns="0" rIns="0" tIns="0" bIns="0"/><a:lstStyle/>${xmlLines}</p:txBody></p:sp>`;
}

const GROUP = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Ders Sunumu"><a:themeElements><a:clrScheme name="Ders Sunumu"><a:dk1><a:srgbClr val="1B2330"/></a:dk1><a:lt1><a:srgbClr val="F5F2EA"/></a:lt1><a:dk2><a:srgbClr val="0F6F68"/></a:dk2><a:lt2><a:srgbClr val="FFFFFF"/></a:lt2><a:accent1><a:srgbClr val="0F6F68"/></a:accent1><a:accent2><a:srgbClr val="3F4AA8"/></a:accent2><a:accent3><a:srgbClr val="9A5B00"/></a:accent3><a:accent4><a:srgbClr val="6A4A8C"/></a:accent4><a:accent5><a:srgbClr val="7B8594"/></a:accent5><a:accent6><a:srgbClr val="D8D1C0"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Ders Sunumu"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Ders Sunumu"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;

function slideXml(title, content, number) {
  const titleShape = shape(2, "Başlık", title, { x: 800000, y: 520000, w: 10400000, h: 1200000, size: 2600, color: "0F6F68", bold: true });
  const bodyShape = shape(3, "İçerik", content, { x: 800000, y: 1850000, w: 10400000, h: 4500000, size: 1800, color: "1B2330" });
  const footer = shape(4, "Slayt numarası", String(number), { x: 10900000, y: 6400000, w: 500000, h: 300000, size: 1100, color: "7B8594", align: "r" });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F5F2EA"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${GROUP}${titleShape}${bodyShape}${footer}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function stepContent(step) {
  const out = [];
  if (step.heading) out.push(step.heading);
  if (step.content?.lead) out.push(step.content.lead);
  if (step.content?.items?.length) out.push(...step.content.items.map((item, index) => `${index + 1}. ${item}`));
  if (step.content?.sections?.length) out.push(...step.content.sections.flatMap((section) => [section.title, section.body]));
  if (step.content?.scale?.length) out.push(`Ölçek: ${step.content.scale.join(" · ")}`);
  return out;
}

function answerContent(step, key) {
  const answer = step.answer || {};
  if (key === "answer") return [answer.answer, answer.answer_sections].flatMap(paragraphs);
  if (key === "guidance") return paragraphs(answer.guidance);
  if (key === "explanation") return paragraphs(answer.explanation);
  if (key === "evidence") return paragraphs(answer.evidence_quotes);
  if (key === "dictionary") return paragraphs(answer.dictionary_terms);
  return [];
}

export function createLessonPptx(lesson) {
  const slides = [{ title: lesson.title, content: [lesson.subtitle || "", `Sayfa ${lesson.pages}`, "Ders Sunumu"] }];
  const appendSlides = (title, content) => {
    const lines = wrapContent(content);
    const pages = [];
    for (let i = 0; i < lines.length; i += 14) pages.push(lines.slice(i, i + 14));
    (pages.length ? pages : [[""]]).forEach((page, index) => {
      slides.push({ title: index ? `${title} · devam ${index + 1}` : title, content: page });
    });
  };
  for (const [index, step] of lesson.steps.entries()) {
    const prompt = step.prompt || `Adım ${index + 1}`;
    const body = stepContent(step);
    appendSlides(`${index + 1}. ${prompt}`, body.length ? body : [step.page ? `Sayfa ${step.page}` : ""]);
    for (const key of step.reveals || []) {
      const content = answerContent(step, key);
      if (!content.length) continue;
      const labels = { guidance: "Öğretmen yönlendirmesi", answer: "Cevap", evidence: "Metinden kanıt", explanation: "Açıklama", dictionary: "Sözlük" };
      appendSlides(`${index + 1}. ${prompt} · ${labels[key] || key}`, content);
    }
  }

  const files = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`],
    ["ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="tr-TR"/></a:defPPr></p:defaultTextStyle></p:presentation>`],
    ["ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`],
    ["ppt/slideMasters/slideMaster1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${GROUP}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`],
    ["ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`],
    ["ppt/slideLayouts/slideLayout1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${GROUP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`],
    ["ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`],
    ["ppt/theme/theme1.xml", themeXml]
  ];
  files.push(["ppt/presentationProps.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`]);
  for (const [index, slide] of slides.entries()) {
    const n = index + 1;
    files.push([`ppt/slides/slide${n}.xml`, slideXml(slide.title, slide.content, n)]);
    files.push([`ppt/slides/_rels/slide${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`]);
  }
  return zip(files);
}

export function pptxFilename(lesson) {
  const slug = (lesson.slug || lesson.title || "ders-sunumu")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "ders-sunumu";
  return `${slug}.pptx`;
}
