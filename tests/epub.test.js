const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { paginateText, decodeHtmlEntities, htmlToCleanText, resolveZipPath, parseEpubFromBase64 } = require('../src/epub');
test('long paragraphs split without losing words', () => {
 const text = Array.from({length: 1500}, (_, i) => 'palabra'+i).join(' ');
 const pages = paginateText(text, 1100);
 assert.ok(pages.length > 5);
 assert.ok(pages.every(p => p.length <= 1100));
 assert.equal(pages.join(' '), text);
});
test('empty text and invalid page sizes', () => {
 assert.deepEqual(paginateText(''), []);
 assert.throws(() => paginateText('abc', 0));
 assert.deepEqual(paginateText('x'.repeat(3000), 1000).map(p => p.length), [1000,1000,1000]);
});
test('Unicode entities support supplementary code points', () => {
 assert.equal(decodeHtmlEntities('&#x1F600; &ntilde; &#225;'), '😀 ñ á');
 assert.equal(decodeHtmlEntities('&#99999999;'), '�');
});
test('remove executable HTML and preserve paragraphs', () => {
 assert.equal(htmlToCleanText('<head>hidden</head><script>alert(1)</script><h1>Title</h1><p>Uno &amp; dos</p>'), 'Title\n\nUno & dos');
});
test('resolve chapter paths relative to OPF', () => {
 assert.equal(resolveZipPath('OEBPS/package/', '../Text/a%20b.xhtml#start'), 'OEBPS/Text/a b.xhtml');
});
async function epub(body = '<h1>Capítulo 1</h1><p>Texto completo.</p>') {
 const zip = new JSZip();
 zip.file('META-INF/container.xml', '<container><rootfile full-path="OEBPS/package/book.opf"/></container>');
 zip.file('OEBPS/package/book.opf', '<package><metadata><dc:title>Prueba</dc:title><dc:creator>Autor</dc:creator></metadata><manifest><item href="../text/chapter.xhtml" media-type="application/xhtml+xml" id="c1" /></manifest><spine><itemref idref="c1" /></spine></package>');
 zip.file('OEBPS/text/chapter.xhtml', body);
 return zip.generateAsync({type:'base64'});
}
test('EPUB follows spine and resolves parent paths', async () => {
 const book = await parseEpubFromBase64(await epub());
 assert.equal(book.title, 'Prueba');
 assert.equal(book.author, 'Autor');
 assert.match(book.pages[0], /Texto completo/);
 assert.equal(book.totalPages, 1);
});
test('short chapters are retained', async () => {
 const book = await parseEpubFromBase64(await epub('<p>Fin.</p>'));
 assert.equal(book.pages[0], 'Fin.');
});
test('corrupt or empty EPUB fails instead of creating fake text', async () => {
 await assert.rejects(parseEpubFromBase64('not-a-zip'));
 await assert.rejects(parseEpubFromBase64(await epub('')), /no contiene texto/);
});
