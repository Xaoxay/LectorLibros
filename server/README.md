# Servicio de traducción de Lector Libros

Servidor separado de la app Android. Necesita Node.js 22.13 o posterior, una API de OpenAI y almacenamiento persistente. No incluye una API gratuita ni un servidor publicado.

## Iniciar

1. Dentro de `server/`, ejecutar `npm ci`.
2. Copiar `.env.example` a `.env` y completar `OPENAI_API_KEY` en ese archivo privado.
3. Generar una clave distinta por lector con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y agregarla a `TRANSLATION_CLIENT_TOKENS`. Se pueden separar varias claves con comas.
4. Ejecutar `npm start`. Para producción, poner el servicio detrás de HTTPS y montar `DATA_DIRECTORY` en un volumen persistente privado. En contenedores, configurar `HOST=0.0.0.0`.
5. En la app, abrir Traducir → ajustes, ingresar la URL HTTPS del servicio y la clave de acceso de ese lector. La clave de OpenAI queda exclusivamente en el servidor. Para el emulador Android local se permite `http://10.0.2.2:8787`; un teléfono físico necesita una URL HTTPS accesible.

No poner claves de API o de cliente en `app.json`, en variables públicas de Expo ni en GitHub. La app guarda la configuración de acceso con Expo SecureStore.

## Comportamiento

- Origen: chino (`zh`), japonés (`ja`), coreano (`ko`), inglés (`en`) o detección entre esos idiomas. Destino: español latino neutro (`es-419`).
- El modelo inicial es `gpt-4.1`, configurable con `OPENAI_MODEL`. Se usa Responses API y salida estructurada. Cada fragmento tiene una traducción y una revisión comparada con el original. Un glosario y contexto de los dos fragmentos anteriores ayudan a mantener continuidad; no garantizan calidad editorial profesional.
- Una cola procesa un libro a la vez. Cada fragmento completado queda en un archivo privado. Pausar aborta la llamada en curso; reanudar conserva los fragmentos revisados y el borrador pendiente, si ya se había guardado.
- Al reiniciar el servidor, los trabajos interrumpidos se recuperan pausados y requieren reanudación explícita. No se reinicia automáticamente el consumo pago de la API.
- La clave de solicitud evita crear un segundo trabajo cuando se reintenta un envío cuya respuesta se perdió. Cada clave de cliente puede ver solo sus trabajos.
- EPUB: la app envía su texto extraído. PDF: sube el archivo (máximo 40 MB), se extrae texto en un proceso de trabajo con límite de memoria y tiempo. No se usa OCR; PDF escaneados, con contraseña o sin texto extraíble generan un error claro.
- La copia traducida se guarda como texto paginado en la biblioteca, con posición y notas independientes del original. No replica tablas, ilustraciones ni la maquetación del PDF/EPUB.
- Límite inicial: 2.000.000 caracteres por libro, cinco trabajos pendientes por lector, veinte en todo el servicio, tres inicios por minuto y 120 consultas por minuto. `MAX_BOOK_CHARACTERS` permite ajustar el límite de texto. No son límites de facturación: configurar también presupuesto y alertas en la cuenta de OpenAI.
- Cancelar elimina texto, borradores y traducciones de ese trabajo del servidor. Los resultados completados se conservan durante siete días para permitir descargar la copia. Después se eliminan del servidor; las copias ya guardadas y los originales del dispositivo no se eliminan. Los libros completados se descargan desde disco y no quedan acumulados en la memoria de la cola.

## Pruebas

`npm test` usa proveedores simulados exclusivamente en los tests; no llama a OpenAI ni consume saldo. Incluye extracción de un PDF real generado en la prueba. La calidad lingüística y el costo de libros reales requieren una prueba de aceptación con API configurada y material de muestra autorizado.

Fuentes: [Responses API y salida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 y precios](https://developers.openai.com/api/docs/models/gpt-4.1), [PDF.js](https://mozilla.github.io/pdf.js/).
