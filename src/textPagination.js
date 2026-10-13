function paginateText(text, charsPerPage = 1100) {
  if (!Number.isInteger(charsPerPage) || charsPerPage < 1) throw new Error('Tamaño de página inválido');
  const pages = [];
  let remaining = (text || '').trim();
  while (remaining.length > charsPerPage) {
    let cut = Math.max(remaining.lastIndexOf(' ', charsPerPage), remaining.lastIndexOf('\n', charsPerPage));
    if (cut < charsPerPage / 2) cut = charsPerPage;
    // Never split a UTF-16 surrogate pair at a forced page boundary.
    if (cut > 0 && /[\uD800-\uDBFF]/.test(remaining[cut - 1]) && /[\uDC00-\uDFFF]/.test(remaining[cut])) cut++;
    pages.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pages.push(remaining);
  return pages;
}
module.exports = { paginateText };
