const { parentPort, workerData } = require('node:worker_threads');
const { extractPdf } = require('./pdf');
extractPdf(new Uint8Array(workerData.bytes), workerData.maxCharacters)
  .then(pages => parentPort.postMessage({ pages }))
  .catch(error => parentPort.postMessage({ error: error.message || 'No se pudo extraer el texto del PDF.' }));
