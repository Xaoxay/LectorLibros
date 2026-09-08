import JSZip from 'jszip';

/**
 * Crea una imagen en formato Blob usando canvas para las páginas de prueba de manga
 */
function createMangaPageCanvas(pageNumber, totalPages, title, quote, bgDark = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  // Fondo estilo manga blanco y negro
  ctx.fillStyle = bgDark ? '#111827' : '#ffffff';
  ctx.fillRect(0, 0, 800, 1200);

  // Marco de viñeta
  ctx.strokeStyle = bgDark ? '#e5e7eb' : '#1f2937';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, 720, 1120);

  // Viñeta superior
  ctx.fillStyle = bgDark ? '#1f2937' : '#f3f4f6';
  ctx.fillRect(60, 60, 680, 480);
  ctx.strokeRect(60, 60, 680, 480);

  // Texto título viñeta 1
  ctx.fillStyle = bgDark ? '#f9fafb' : '#111827';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 400, 200);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = bgDark ? '#9ca3af' : '#4b5563';
  ctx.fillText('DEMO MANGA / CÓMIC', 400, 260);

  // Viñeta inferior izquierda
  ctx.strokeRect(60, 560, 320, 500);
  ctx.fillStyle = bgDark ? '#374151' : '#e5e7eb';
  ctx.fillRect(60, 560, 320, 500);

  ctx.fillStyle = bgDark ? '#ffffff' : '#000000';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('¡Lectura RTL!', 220, 750);
  ctx.font = '16px sans-serif';
  ctx.fillText('(Estilo Manga Japonés)', 220, 790);

  // Viñeta inferior derecha
  ctx.strokeRect(400, 560, 340, 500);
  ctx.fillStyle = bgDark ? '#1f2937' : '#f9fafb';
  ctx.fillRect(400, 560, 340, 500);

  ctx.fillStyle = bgDark ? '#f59e0b' : '#b45309';
  ctx.font = 'italic 20px serif';
  ctx.fillText(`"${quote}"`, 570, 800);

  // Número de página
  ctx.fillStyle = bgDark ? '#9ca3af' : '#6b7280';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Página ${pageNumber} de ${totalPages}`, 400, 1100);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
  });
}

/**
 * Genera un archivo .cbz de prueba con viñetas de manga
 */
export async function createSampleManga() {
  const zip = new JSZip();

  const pages = [
    { num: 1, title: 'Capítulo 1: El Despertar', quote: 'El viaje apenas comienza.' },
    { num: 2, title: 'Capítulo 1: La Decisión', quote: 'No hay marcha atrás.' },
    { num: 3, title: 'Capítulo 1: El Destino', quote: 'El verdadero poder está en tu interior.' },
  ];

  for (const p of pages) {
    const blob = await createMangaPageCanvas(p.num, pages.length, p.title, p.quote, p.num % 2 === 0);
    zip.file(`page_${String(p.num).padStart(3, '0')}.jpg`, blob);
  }

  return await zip.generateAsync({ type: 'arraybuffer' });
}
