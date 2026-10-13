const path = require('node:path');
async function extractPdf(bytes, maxCharacters = 2000000) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true, cMapUrl: path.join(root, 'cmaps').replaceAll('\\', '/') + '/', cMapPacked: true, standardFontDataUrl: path.join(root, 'standard_fonts').replaceAll('\\', '/') + '/' });
  let document;
  try {
    document = await task.promise;
    if (document.numPages > 3000) throw new Error('El PDF supera el límite de páginas del servicio.');
    const pages = []; let characters = 0;
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) if (typeof item.str === 'string') text += item.str + (item.hasEOL ? '\n' : ' ');
      characters += text.length;
      if (characters > maxCharacters) throw new Error('El PDF supera el límite de texto del servicio.');
      pages.push(text.trim()); page.cleanup();
    }
    if (!pages.some(page => page.length > 10)) throw new Error('El PDF no tiene texto extraíble. Los PDF escaneados necesitan OCR.');
    return pages;
  } finally { await task.destroy(); }
}
module.exports = { extractPdf };
