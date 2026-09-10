const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCatalog, normalizeGutenberg, safeHttps } = require('../src/catalog');
const { downloadBook } = require('../src/downloadBook');
const item = { id:'gutenberg_2000', name:'Libro', downloadUrl:'https://www.gutenberg.org/ebooks/2000.epub3.images',sourceUrl:'https://www.gutenberg.org/ebooks/2000' };
test('only explicitly public-domain EPUB results are downloadable', () => {
 const input = {id:1,title:'Libro',copyright:false,formats:{'application/epub+zip':'http://www.gutenberg.org/a.epub'}};
 assert.equal(normalizeGutenberg(input).downloadUrl,'https://www.gutenberg.org/a.epub');
 assert.equal(normalizeGutenberg({...input,copyright:true}).downloadUrl,null);
 assert.equal(normalizeGutenberg({...input,copyright:null}).downloadUrl,null);
 assert.equal(safeHttps('https://www.gutenberg.org.evil.com/a',['www.gutenberg.org']),null);
 assert.equal(safeHttps('https://user@www.gutenberg.org/a',['www.gutenberg.org']),null);
});
test('search encodes titles and language, and returns pagination', async () => {
 let requested;
 const result = await searchCatalog({query:'Cien & más',language:'es',page:2}, async url => { requested=url; return {ok:true,json:async()=>({next:'https://gutendex.com/books/?page=3',results:[]})}; });
 assert.match(requested,/Cien%20%26%20m%C3%A1s/);assert.match(requested,/languages=es/);assert.match(requested,/page=2/);assert.equal(result.more,true);
});
test('catalog errors are surfaced and general results do not invent downloads', async () => {
 await assert.rejects(searchCatalog({},async()=>({ok:false})),/catálogo/);
 const result = await searchCatalog({source:'all',query:'Dune'},async()=>({ok:true,json:async()=>({docs:[{key:'/works/OL1W',title:'Dune'}]})}));
 assert.equal(result.books[0].downloadUrl,null);assert.match(result.books[0].sourceUrl,/openlibrary.org/);
});
function dependencies(overrides={}) {
 const writes=[];const deleted=[];const saves=[];
 const fs={documentDirectory:'file:///private/',EncodingType:{Base64:'base64'},makeDirectoryAsync:async()=>{},createDownloadResumable:()=>({downloadAsync:async()=>({status:200}),pauseAsync:async()=>{}}),readAsStringAsync:async()=> 'epub-data',writeAsStringAsync:async(...args)=>writes.push(args),deleteAsync:async p=>deleted.push(p)};
 return {fs,parse:async()=>({title:'Libro',author:'Autor',pages:['Capítulo uno']}),load:async()=>[],save:async books=>saves.push(books),writes,deleted,saves,...overrides};
}
test('download persists valid EPUB and its text only once', async()=>{
 const deps=dependencies();const book=await downloadBook(item,deps);
 assert.equal(book.id,item.id);assert.match(book.url,/^file:\/\/\/private\/books\/gutenberg_2000_\d+.epub$/);
 assert.equal(deps.saves.length,1);assert.equal(deps.writes.length,1);assert.equal(deps.deleted.length,0);
 assert.equal(book.pageCount,1);
});
test('existing downloads are reused without network access', async()=>{
 const deps=dependencies({load:async()=>[{id:item.id,url:'local'}]});
 deps.fs.createDownloadResumable=()=>{throw Error('must not download');};
 assert.equal((await downloadBook(item,deps)).url,'local');
});
test('invalid EPUB, HTTP errors, cancellation and failed save clean up files', async()=>{
 for(const mode of ['parse','http','cancel','save']) {
  const deps=dependencies();
  if(mode==='parse') deps.parse=async()=>{throw Error('EPUB corrupto');};
  if(mode==='http') deps.fs.createDownloadResumable=()=>({downloadAsync:async()=>({status:503})});
  if(mode==='save') deps.save=async()=>{throw Error('Sin espacio');};
  if(mode==='cancel'){ const controller=new AbortController();controller.abort();deps.signal=controller.signal; }
  await assert.rejects(downloadBook(item,deps));assert.equal(deps.deleted.length,2,mode);
  assert.equal(deps.saves.length,0,mode);
 }
});
