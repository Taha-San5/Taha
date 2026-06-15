"""
Build a professional bilingual (English + Arabic) PDF
from clinical_practice_study_guide_AR_EN.md
"""
import re
from pathlib import Path
import markdown as md
from weasyprint import HTML, CSS

ROOT = Path("/projects/sandbox/Taha")
SRC_MD = ROOT / "clinical_practice_study_guide_AR_EN.md"
OUT_PDF = ROOT / "Clinical_Practice_MS2_Bilingual_Study_Guide.pdf"

md_text = SRC_MD.read_text(encoding="utf-8")

# Convert markdown -> HTML
html_body = md.markdown(
    md_text,
    extensions=["tables", "fenced_code", "toc", "sane_lists", "attr_list"],
)

# Wrap Arabic-containing inline portions so we can style them (RTL feel + nicer Arabic font).
# Detect any Arabic letters; we'll just rely on the body font stack which includes Noto Sans Arabic.

CSS_STYLES = """
@page {
  size: A4;
  margin: 18mm 16mm 22mm 16mm;
  @top-center {
    content: "Clinical Practice — Medical Surgical II  |  دليل الممارسة الإكلينيكية";
    font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif;
    font-size: 9pt;
    color: #6b7280;
    border-bottom: 0.5pt solid #d1d5db;
    padding-bottom: 4pt;
    width: 100%;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-family: 'Noto Sans', sans-serif;
    font-size: 9pt;
    color: #6b7280;
  }
  @bottom-left {
    content: "NUR 204 P  •  Misr University for Science and Technology";
    font-family: 'Noto Sans', sans-serif;
    font-size: 8.5pt;
    color: #9ca3af;
  }
}

@page :first {
  margin: 0;
  @top-center { content: none; }
  @bottom-right { content: none; }
  @bottom-left { content: none; }
}

html, body {
  font-family: 'Noto Sans', 'Noto Sans Arabic', 'DejaVu Sans', sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #1f2937;
  -weasy-hyphens: auto;
}

/* ===== COVER ===== */
.cover {
  page: cover;
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0e7490 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40mm 22mm 22mm 22mm;
  page-break-after: always;
}
.cover .badge {
  display: inline-block;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.35);
  padding: 6pt 14pt;
  border-radius: 999pt;
  font-size: 9.5pt;
  letter-spacing: 0.6pt;
  text-transform: uppercase;
}
.cover h1 {
  font-size: 34pt;
  line-height: 1.1;
  margin: 14pt 0 6pt;
  font-weight: 800;
  color: #fff;
  border: none;
}
.cover .subtitle-ar {
  font-size: 22pt;
  font-weight: 700;
  margin-top: 0;
  color: #fde68a;
}
.cover .subtitle-en {
  font-size: 14pt;
  color: #cbd5e1;
  margin-top: 16pt;
  max-width: 140mm;
  line-height: 1.5;
}
.cover .meta {
  border-top: 1px solid rgba(255,255,255,0.25);
  padding-top: 14pt;
  font-size: 11pt;
  color: #e2e8f0;
}
.cover .meta strong { color: #fff; }
.cover .author-line {
  font-size: 10pt;
  color: #94a3b8;
  margin-top: 6pt;
}

/* ===== TYPOGRAPHY ===== */
h1, h2, h3, h4 {
  font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif;
  color: #0f172a;
  page-break-after: avoid;
}
h1 {
  font-size: 22pt;
  margin-top: 18pt;
  margin-bottom: 8pt;
  padding-bottom: 6pt;
  border-bottom: 2pt solid #1e3a8a;
  page-break-before: always;
}
h1:first-of-type { page-break-before: avoid; }
h2 {
  font-size: 15pt;
  color: #1e3a8a;
  margin-top: 14pt;
  margin-bottom: 6pt;
  padding: 4pt 0 4pt 8pt;
  border-left: 4pt solid #0e7490;
  background: linear-gradient(to right, #f0f9ff, transparent 70%);
}
h3 {
  font-size: 12.5pt;
  color: #0e7490;
  margin-top: 12pt;
  margin-bottom: 4pt;
}
h4 {
  font-size: 11pt;
  color: #334155;
}

p { margin: 4pt 0; text-align: justify; }

strong { color: #0f172a; font-weight: 700; }
em { color: #475569; }

/* Numbered procedure paragraphs (keep them tighter) */
p { orphans: 3; widows: 3; }

/* ===== TABLES ===== */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0 12pt 0;
  font-size: 9.8pt;
  page-break-inside: auto;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th {
  background: #1e3a8a;
  color: #fff;
  text-align: left;
  padding: 6pt 8pt;
  font-weight: 700;
  border: 1pt solid #1e40af;
}
td {
  padding: 5pt 8pt;
  border: 1pt solid #e5e7eb;
  vertical-align: top;
}
tbody tr:nth-child(even) td { background: #f8fafc; }
tbody tr:hover td { background: #fef9c3; }

/* ===== LISTS ===== */
ul, ol { margin: 4pt 0 8pt 18pt; padding: 0; }
li { margin: 2pt 0; }
li::marker { color: #1e3a8a; }

/* ===== BLOCKQUOTES (callouts) ===== */
blockquote {
  margin: 10pt 0;
  padding: 10pt 14pt;
  background: #fef3c7;
  border-left: 4pt solid #f59e0b;
  border-radius: 4pt;
  color: #78350f;
  page-break-inside: avoid;
}
blockquote p { margin: 2pt 0; }
blockquote strong { color: #92400e; }

/* ===== HORIZONTAL RULE ===== */
hr {
  border: none;
  border-top: 1pt dashed #cbd5e1;
  margin: 14pt 0;
}

/* ===== CODE ===== */
code {
  background: #f1f5f9;
  padding: 1pt 4pt;
  border-radius: 3pt;
  font-family: 'DejaVu Sans Mono', monospace;
  font-size: 9.5pt;
  color: #0e7490;
}

/* ===== TOC PAGE ===== */
.toc-page {
  page-break-after: always;
}
.toc-page h1 {
  border-bottom: 2pt solid #1e3a8a;
  page-break-before: avoid;
}
.toc-page ol {
  list-style: none;
  margin-left: 0;
  padding: 0;
  counter-reset: toc;
}
.toc-page ol li {
  counter-increment: toc;
  padding: 8pt 12pt;
  margin-bottom: 4pt;
  border-left: 3pt solid #0e7490;
  background: #f0f9ff;
  font-size: 11pt;
}
.toc-page ol li::before {
  content: counter(toc) ".";
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 8pt;
}
.toc-page ol li .ar {
  display: block;
  color: #475569;
  font-size: 10pt;
  margin-top: 2pt;
}

/* ===== HIGHLIGHTS ===== */
.highlight-box {
  background: #ecfdf5;
  border: 1pt solid #34d399;
  padding: 10pt 14pt;
  border-radius: 6pt;
  margin: 10pt 0;
}
"""

# A custom cover + TOC HTML, then injected document body
COVER_HTML = """
<section class="cover">
  <div>
    <span class="badge">Bilingual Study Guide • دليل ثنائي اللغة</span>
    <h1>Clinical Practice<br/>Medical Surgical II</h1>
    <p class="subtitle-ar">دليل الممارسة الإكلينيكية — جراحي 2</p>
    <p class="subtitle-en">A comprehensive English &amp; Arabic study guide covering Wound Care, Suture Removal, IV Therapy, Chest Physiotherapy, and NGT Insertion.<br/>
    دليل مذاكرة شامل بالإنجليزي والعربي يغطي العناية بالجروح وإزالة الغرز والعلاج الوريدي والعلاج الطبيعي للصدر وتركيب أنبوبة المعدة.</p>
  </div>
  <div class="meta">
    <p><strong>Course:</strong> NUR 204 P &nbsp;•&nbsp; <strong>المقرر:</strong> الممارسة الإكلينيكية - جراحي 2</p>
    <p><strong>Faculty:</strong> Misr University for Science and Technology — College of Nursing</p>
    <p class="author-line">Compiled study aid based on the official Clinical Practice book (2026 edition).</p>
  </div>
</section>

<section class="toc-page">
  <h1>Table of Contents — الفهرس</h1>
  <ol>
    <li>Wound Care — Applying a Dry Sterile Dressing<span class="ar">العناية بالجرح — تطبيق ضمادة جافة معقمة</span></li>
    <li>Surgical Suture Removal<span class="ar">إزالة الغرز الجراحية</span></li>
    <li>Intravenous (IV) Therapy<span class="ar">العلاج الوريدي</span></li>
    <li>Chest Physiotherapy (Percussion, Vibration, Postural Drainage, Deep Breathing)<span class="ar">العلاج الطبيعي للصدر</span></li>
    <li>Nasogastric Tube (NGT) Insertion &amp; Care<span class="ar">تركيب أنبوبة المعدة الأنفية والعناية بها</span></li>
    <li>Quick Exam Memorization &amp; Memory Tricks<span class="ar">تلخيص سريع للامتحان وحيل الذاكرة</span></li>
  </ol>
</section>
"""

# Strip the inline H1 from the markdown body (we already have a cover)
# but keep the rest. Markdown's first H1 is "Clinical Practice — Medical Surgical II"
# We'll remove the first <h1>...</h1> block to avoid duplication.
html_body_no_first_h1 = re.sub(r"<h1[^>]*>.*?</h1>", "", html_body, count=1, flags=re.S)

# Also remove the small "Index — الفهرس" h2 + ol because we have a TOC
html_body_no_first_h1 = re.sub(
    r"<h2[^>]*>\s*Index — الفهرس\s*</h2>\s*<ol>.*?</ol>",
    "",
    html_body_no_first_h1,
    count=1,
    flags=re.S,
)
# Remove any leading <hr> after the removed sections
html_body_no_first_h1 = re.sub(r"^\s*(<hr\s*/?>\s*)+", "", html_body_no_first_h1)

FULL_HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Clinical Practice MS2 — Bilingual Study Guide</title>
</head>
<body>
{COVER_HTML}
<main>
{html_body_no_first_h1}
</main>
</body>
</html>
"""

# Build PDF
HTML(string=FULL_HTML, base_url=str(ROOT)).write_pdf(
    str(OUT_PDF),
    stylesheets=[CSS(string=CSS_STYLES)],
)

print(f"OK -> {OUT_PDF}  ({OUT_PDF.stat().st_size/1024:.1f} KB)")
