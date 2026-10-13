const path = require('node:path');
const { Worker } = require('node:worker_threads');
function extractPdfInWorker(bytes, maxCharacters = 2000000) {
  return new Promise((resolve, reject) => {
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const worker = new Worker(path.join(__dirname, 'pdf-worker.js'), { workerData: { bytes: data, maxCharacters }, transferList: [data], resourceLimits: { maxOldGenerationSizeMb: 256, stackSizeMb: 4 } });
    let settled = false;
    const finish = (error, pages) => {
      if (settled) return; settled = true; clearTimeout(timer); worker.terminate().catch(() => {});
      if (error) reject(error); else resolve(pages);
    };
    const timer = setTimeout(() => finish(new Error('La extracción del PDF tardó demasiado. Probá una versión con texto más simple.')), 60000);
    worker.on('message', result => finish(result.error ? new Error(result.error) : null, result.pages));
    worker.on('error', error => finish(error));
    worker.on('exit', code => { if (!settled) finish(new Error('No se pudo procesar el PDF dentro de los límites de memoria.')); });
  });
}
module.exports = { extractPdfInWorker };
