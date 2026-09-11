// OFL-licensed fonts are loaded only when PDF export needs Unicode glyphs.
const files = { sans: ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf', 'NotoSans-Italic.ttf'], serif: ['NotoSerif-Regular.ttf', 'NotoSerif-Bold.ttf', 'NotoSerif-Italic.ttf'], cjk: ['NotoSansSC-Regular.ttf', 'NotoSansSC-Bold.ttf'] };
const cache = new Map();
async function fontData(file) {
  if (!cache.has(file)) cache.set(file, (async () => {
    if (import.meta.url.startsWith('file:')) {
      const moduleName = 'node:fs/promises';
      const { readFile } = await import(/* @vite-ignore */ moduleName);
      return (await readFile(new URL('../public/fonts/' + file, import.meta.url))).toString('base64');
    }
    const response = await fetch('/fonts/' + file);
    if (!response.ok) throw new Error('The PDF font could not be loaded. Retry the export or download DOCX.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  })().catch(error => { cache.delete(file); throw error; }));
  return cache.get(file);
}
export async function configurePdfFonts(doc, text, tokens) {
  const originalBody = tokens.pdfBodyFontFamily || tokens.pdfFontFamily || 'helvetica';
  const originalDisplay = tokens.pdfDisplayFontFamily || tokens.pdfFontFamily || originalBody;
  // Built-in fonts remain suitable for ASCII. Every non-ASCII glyph is checked.
  if (!/[^\x00-\x7f]/.test(text)) return { bodyFont: originalBody, displayFont: originalDisplay };
  const hasCjk = /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  const select = font => hasCjk ? 'cjk' : font === 'times' ? 'serif' : 'sans';
  const kinds = [...new Set([select(originalBody), select(originalDisplay)])];
  for (const kind of kinds) for (const [index, file] of files[kind].entries()) {
    const style = ['normal', 'bold', 'italic'][index];
    doc.addFileToVFS(file, await fontData(file)); doc.addFont(file, 'Noto-' + kind, style);
    if (!index && kind === 'cjk') doc.addFont(file, 'Noto-' + kind, 'italic'); // CJK has no italic face; preserve glyphs for date emphasis.
    const metadata = doc.getFont('Noto-' + kind, style).metadata;
    const missing = [...new Set([...text].filter(char => char.codePointAt(0) >= 32 && !metadata?.characterToGlyph?.(char.codePointAt(0))))];
    if (missing.length) throw new Error('PDF export cannot render these characters: ' + missing.slice(0, 8).join(' ') + '. Your text is unchanged. Download DOCX instead.');
  }
  return { bodyFont: 'Noto-' + select(originalBody), displayFont: 'Noto-' + select(originalDisplay) };
}
