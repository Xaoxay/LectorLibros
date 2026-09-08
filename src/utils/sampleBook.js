import JSZip from 'jszip';

/**
 * Genera un archivo EPUB válido en memoria usando JSZip para pruebas inmediatas.
 */
export async function createSampleEpub() {
  const zip = new JSZip();

  // 1. Mimetype (debe ser el primero y sin comprimir)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS content
  const oebps = zip.folder('OEBPS');

  // content.opf
  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>El Principito (Selección)</dc:title>
    <dc:creator>Antoine de Saint-Exupéry</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="BookID">sample-principito-001</dc:identifier>
    <dc:publisher>Dominio Público</dc:publisher>
    <dc:description>Un clásico de la literatura universal para probar tu nuevo lector digital.</dc:description>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="chap1" href="chap1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chap2" href="chap2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chap3" href="chap3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chap1"/>
    <itemref idref="chap2"/>
    <itemref idref="chap3"/>
  </spine>
</package>`);

  // toc.ncx
  oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="sample-principito-001"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>El Principito</text></docTitle>
  <navMap>
    <navPoint id="nav1" playOrder="1">
      <navLabel><text>Capítulo I - El dibujo de la boa</text></navLabel>
      <content src="chap1.xhtml"/>
    </navPoint>
    <navPoint id="nav2" playOrder="2">
      <navLabel><text>Capítulo II - El encuentro en el desierto</text></navLabel>
      <content src="chap2.xhtml"/>
    </navPoint>
    <navPoint id="nav3" playOrder="3">
      <navLabel><text>Capítulo XXI - El secreto del zorro</text></navLabel>
      <content src="chap3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

  // style.css
  oebps.file('style.css', `
    body {
      font-family: inherit;
      line-height: 1.7;
      padding: 0 10px;
    }
    h1 {
      font-size: 1.5em;
      margin-top: 1.2em;
      margin-bottom: 0.8em;
      font-weight: 700;
      text-align: center;
    }
    p {
      margin-bottom: 1.2em;
      text-indent: 1.2em;
      text-align: justify;
    }
    blockquote {
      border-left: 3px solid #eab308;
      padding-left: 1rem;
      margin: 1.5rem 0;
      font-style: italic;
    }
  `);

  // Chapters
  oebps.file('chap1.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capítulo I</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Capítulo I</h1>
  <p>Pido perdón a los niños por haber dedicado este libro a una persona grande. Tengo una seria razón para ello: esta persona grande es el mejor amigo que tengo en el mundo. Tengo otra razón: esta persona grande puede comprenderlo todo, hasta los libros para niños.</p>
  <p>Cuando yo tenía seis años vi en un libro sobre la selva virgen que se titulaba «Historias vividas», una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera.</p>
  <p>El libro decía: «Las serpientes boas tragan sus presas enteras, sin masticarlas. Luego no pueden moverse y duermen durante los seis meses que dura su digestión». Reflexioné mucho entonces sobre las aventuras de la selva y, a mi vez, logré trazar con un lápiz de color mi primer dibujo. Mi dibujo número 1 era así: representaba una serpiente boa que digería un elefante.</p>
</body>
</html>`);

  oebps.file('chap2.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capítulo II</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Capítulo II</h1>
  <p>Viví así, solo, sin nadie con quien hablar verdaderamente, hasta que tuve una avería en el desierto de Sahara, hace seis años. Algo se había roto en mi motor. Y como no llevaba conmigo ni mecánico ni pasajeros, me dispuse a realizar, solo, una difícil reparación. Era para mí una cuestión de vida o muerte.</p>
  <p>La primera noche me dormí sobre la arena, a mil millas de toda tierra habitada. Estaba más aislado que un náufrago en una balsa en medio del océano. Imaginaos, pues, mi sorpresa cuando, al romper el día, me despertó una extraña vocecita que decía:</p>
  <blockquote>—Por favor... ¡dibújame un cordero!</blockquote>
  <p>—¿Eh?</p>
  <p>—Dibújame un cordero...</p>
  <p>Me puse en pie de un salto, como herido por el rayo. Me froté bien los ojos. Miré bien. Y vi un hombrecito enteramente extraordinario que me examinaba gravemente.</p>
</body>
</html>`);

  oebps.file('chap3.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capítulo XXI</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Capítulo XXI - El Secreto</h1>
  <p>Fue entonces cuando apareció el zorro.</p>
  <p>—Buenos días —dijo el zorro.</p>
  <p>—Buenos días —respondió cortésmente el principito, que se volvió pero no vio nada.</p>
  <p>—Estoy aquí —dijo la voz—, bajo el manzano.</p>
  <p>—¿Quién eres tú? —dijo el principito—. Eres muy lindo...</p>
  <p>—Soy un zorro —dijo el zorro.</p>
  <p>—Ven a jugar conmigo —le propuso el principito—. ¡Estoy tan triste!...</p>
  <p>—No puedo jugar contigo —dijo el zorro—. No estoy domesticado.</p>
  <p>—¿Qué significa «domesticar»?</p>
  <p>—Es una cosa demasiado olvidada —dijo el zorro—. Significa «crear lazos».</p>
  <blockquote>«He aquí mi secreto. Es muy simple: no se ve bien sino con el corazón. Lo esencial es invisible a los ojos.»</blockquote>
</body>
</html>`);

  // Generar ArrayBuffer
  return await zip.generateAsync({ type: 'arraybuffer' });
}
