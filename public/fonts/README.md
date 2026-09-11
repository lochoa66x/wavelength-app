# PDF fonts

Noto Sans and Noto Serif regular/bold/italic are unmodified TTF files from https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf. Their license is OFL.txt.

Noto Sans SC regular/bold are static wght=400/700 instances of https://github.com/notofonts/noto-cjk/blob/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf. FontTools 4.61.1 generated these instances and retained U+0020–02FF, U+2000–206F, U+3000–30FF, U+3400–9FFF and U+FF00–FFEF. Layout features were removed; copyright/name metadata remains in the fonts. Their license is OFL-CJK.txt. See scripts/preparePdfCjkFonts.py for the reproducible transformation (input downloaded separately).

Fonts load from same-origin static assets only during non-ASCII PDF export. PDF output embeds only used glyphs. Ordinary Latin/Greek/Cyrillic documents use Noto Sans or Serif according to the selected design; documents containing CJK use Noto Sans SC. CJK date italics use the upright face; Latin, Greek, and Cyrillic dates retain the italic font. Unsupported glyphs cause an explicit export error and leave the document unchanged; DOCX remains available. These fonts do not provide every Unicode character or complex-script shaping.
