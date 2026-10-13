const JSZip = require("jszip");
const { paginateText } = require("./textPagination");
const { MAX_EPUB_BYTES } = require('./importBook');
const EPUB_LIMITS = { entry: 4 * 1024 * 1024, total: 24 * 1024 * 1024, entries: 2000, pages: 20000 };
// Stop the decompression stream before accumulating an oversized entry.
function readEntry(file, type, budget) {
  return new Promise((resolve, reject) => {
    let length = 0;
    const chunks = [];
    const stream = file.internalStream(type);
    stream.on('data', chunk => {
      length += chunk.length;
      budget.used += chunk.length;
      if (length > EPUB_LIMITS.entry || budget.used > EPUB_LIMITS.total) {
        stream.pause();
        reject(new Error('El EPUB contiene demasiados datos descomprimidos.'));
        return;
      }
      chunks.push(chunk);
    }).on('error', reject).on('end', () => {
      const content = chunks.join('');
      // StreamHelper emits binary strings for base64; encoding happens at the end.
      resolve(type === 'base64' ? new JSZip().file('image', content, { binary: true }).file('image').async('base64') : content);
    }).resume();
  });
}
function decodeHtmlEntities(text) {
  if (!text) return "";
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&laquo;": "«",
    "&raquo;": "»",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&aacute;": "á",
    "&eacute;": "é",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&uacute;": "ú",
    "&ntilde;": "ñ",
    "&Aacute;": "Á",
    "&Eacute;": "É",
    "&Iacute;": "Í",
    "&Oacute;": "Ó",
    "&Uacute;": "Ú",
    "&Ntilde;": "Ñ",
    "&iexcl;": "¡",
    "&iquest;": "¿",
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    if (entities[match]) return entities[match];
    if (match.startsWith("&#x")) {
      const code = parseInt(match.slice(3, -1), 16);
      return !isNaN(code) ? String.fromCodePoint(code <= 0x10ffff && code >= 0 ? code : 0xfffd) : match;
    }
    if (match.startsWith("&#")) {
      const code = parseInt(match.slice(2, -1), 10);
      return !isNaN(code) ? String.fromCodePoint(code <= 0x10ffff && code >= 0 ? code : 0xfffd) : match;
    }
    return match;
  });
}

function htmlToCleanText(html) {
  if (!html) return "";
  let cleaned = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, "\n\n$1\n\n")
    .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, "\n\n$1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n• $1")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n"$1"\n')
    .replace(/<[^>]+>/g, "");

  cleaned = decodeHtmlEntities(cleaned);
  return cleaned
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function resolveZipPath(base, href) {
  const parts = [];
  for (const part of (base + decodeURIComponent(href.split("#")[0])).split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

async function parseEpubFromBase64(base64Data, defaultTitle = "Libro EPUB") {
  try {
    if (typeof base64Data !== 'string' || base64Data.length > Math.ceil(MAX_EPUB_BYTES / 3) * 4) throw new Error('El EPUB supera el límite de 40 MB.');
    const zip = await JSZip.loadAsync(base64Data, { base64: true });
    if (Object.keys(zip.files).length > EPUB_LIMITS.entries) throw new Error('El EPUB contiene demasiados archivos.');
    const budget = { used: 0 };
    const containerFile = zip.file("META-INF/container.xml") || zip.file("meta-inf/container.xml");
    if (!containerFile) throw new Error("No es un archivo EPUB válido");

    const containerXml = await readEntry(containerFile, "string", budget);
    const rootFileMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
    const opfPath = rootFileMatch ? rootFileMatch[1] : "content.opf";
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    const opfFile = zip.file(opfPath);
    if (!opfFile) throw new Error("No se encontró el manifiesto OPF");

    const opfContent = await readEntry(opfFile, "string", budget);
    const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : defaultTitle;
    const author = authorMatch ? decodeHtmlEntities(authorMatch[1].trim()) : "Autor desconocido";

    const manifest = Object.create(null);
    const itemRegex = /<item\s+[^>]*?id=["']([^"']+)["'][^>]*?href=["']([^"']+)["'][^>]*?>|<item\s+[^>]*?href=["']([^"']+)["'][^>]*?id=["']([^"']+)["'][^>]*?>/gi;
    let match;
    while ((match = itemRegex.exec(opfContent)) !== null) {
      const id = match[1] || match[4];
      const href = match[2] || match[3];
      const fullPath = resolveZipPath(opfDir, href);
      manifest[id] = fullPath;
    }

    // Buscar portada
    let coverBase64 = null;
    let coverFileId = null;
    const metaCoverMatch = opfContent.match(/<meta\s+name=["']cover["']\s+content=["']([^"']+)["']/i);
    if (metaCoverMatch) {
      coverFileId = metaCoverMatch[1];
    }
    if (!coverFileId) {
      for (const id in manifest) {
        if (/cover/i.test(id) && /\.(jpe?g|png|webp)$/i.test(manifest[id])) {
          coverFileId = id;
          break;
        }
      }
    }
    if (coverFileId && manifest[coverFileId]) {
      const coverPath = manifest[coverFileId];
      const coverZipFile = zip.file(coverPath) || zip.file(coverPath.replace(/^\//, ""));
      if (coverZipFile) {
        const rawImg = await readEntry(coverZipFile, "base64", budget);
        const mime = /\.png$/i.test(coverPath) ? "image/png" : /\.webp$/i.test(coverPath) ? "image/webp" : "image/jpeg";
        coverBase64 = `data:${mime};base64,${rawImg}`;
      }
    }

    // Orden de capítulos
    const spineItems = [];
    const spineRegex = /<itemref\s+[^>]*?idref=["']([^"']+)["'][^>]*?>/gi;
    while ((match = spineRegex.exec(opfContent)) !== null) {
      spineItems.push(match[1]);
    }

    const allPages = [];
    for (const id of spineItems) {
      const filePath = manifest[id];
      if (!filePath) throw new Error("El EPUB contiene un capítulo sin referencia válida.");
      const chapterFile =
        zip.file(filePath) ||
        zip.file(filePath.replace(/^\//, "")) ||
        zip.file(opfDir + filePath);
      if (!chapterFile) throw new Error("Falta un capítulo del EPUB.");
      if (chapterFile) {
        const rawHtml = await readEntry(chapterFile, "string", budget);
        const cleanText = htmlToCleanText(rawHtml);
        if (cleanText && cleanText.length > 0) {
          const chapterPages = paginateText(cleanText, 1100);
          for (const p of chapterPages) {
            allPages.push(p);
            if (allPages.length > EPUB_LIMITS.pages) throw new Error("El EPUB contiene demasiadas páginas.");
          }
        }
      }
    }

    if (!allPages.length) throw new Error("El EPUB no contiene texto legible. Puede estar protegido con DRM o contener solo imágenes.");
    return {
      title,
      author,
      cover: coverBase64,
      pages: allPages,
      totalPages: allPages.length,
    };
  } catch (error) {
    throw new Error(error.message || "No se pudo leer el EPUB.");
  }
}

module.exports = { decodeHtmlEntities, htmlToCleanText, paginateText, resolveZipPath, parseEpubFromBase64, EPUB_LIMITS };
