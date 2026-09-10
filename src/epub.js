const JSZip = require("jszip");
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

function paginateText(text, charsPerPage = 1100) {
  if (!Number.isInteger(charsPerPage) || charsPerPage < 1) throw new Error("Tamaño de página inválido");
  const pages = [];
  let remaining = (text || "").trim();
  while (remaining.length > charsPerPage) {
    let cut = remaining.lastIndexOf(" ", charsPerPage);
    const paragraph = remaining.lastIndexOf("\n", charsPerPage);
    cut = Math.max(cut, paragraph);
    if (cut < charsPerPage / 2) cut = charsPerPage;
    pages.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pages.push(remaining);
  return pages;
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
    const zip = await JSZip.loadAsync(base64Data, { base64: true });
    const containerFile = zip.file("META-INF/container.xml") || zip.file("meta-inf/container.xml");
    if (!containerFile) throw new Error("No es un archivo EPUB válido");

    const containerXml = await containerFile.async("string");
    const rootFileMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
    const opfPath = rootFileMatch ? rootFileMatch[1] : "content.opf";
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    const opfFile = zip.file(opfPath);
    if (!opfFile) throw new Error("No se encontró el manifiesto OPF");

    const opfContent = await opfFile.async("string");
    const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : defaultTitle;
    const author = authorMatch ? decodeHtmlEntities(authorMatch[1].trim()) : "Autor desconocido";

    const manifest = {};
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
        const rawImg = await coverZipFile.async("base64");
        const mime = coverPath.endsWith(".png") ? "image/png" : "image/jpeg";
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
      if (!filePath) continue;
      const chapterFile =
        zip.file(filePath) ||
        zip.file(filePath.replace(/^\//, "")) ||
        zip.file(opfDir + filePath);
      if (chapterFile) {
        const rawHtml = await chapterFile.async("string");
        const cleanText = htmlToCleanText(rawHtml);
        if (cleanText && cleanText.length > 0) {
          const chapterPages = paginateText(cleanText, 1100);
          for (const p of chapterPages) {
            allPages.push(p);
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

module.exports = { decodeHtmlEntities, htmlToCleanText, paginateText, resolveZipPath, parseEpubFromBase64 };
