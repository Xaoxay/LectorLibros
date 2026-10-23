# Lector Libros 2.7.0

Lector personal para Android con biblioteca local, importación de PDF/EPUB y búsqueda en Gutenberg y Open Library. Abre directamente la biblioteca; no requiere registro ni simula autenticación o sincronización en la nube.

## Funciones

- PDF nativo: paginación horizontal, zoom, salto de página, marcadores y recuperación de posición.
- EPUB de texto sin DRM: lectura en orden del spine, extracción de portada, paginación sin perder párrafos largos y almacenamiento permanente en el dispositivo.
- Efecto **page curl** en los EPUB: la hoja tiene frente y dorso, gira en perspectiva desde el lomo y combina pliegue, brillo y sombras progresivas mientras sigue el dedo. La página de destino queda visible debajo; al soltar, el gesto completa el cambio o vuelve con resorte. La posición solo cambia al completar la transición y respeta la opción de reducir movimiento del sistema.
- Temas claro, sepia y noche, tamaño de letra de 14 a 30, lectura inmersiva, índice por encabezados y búsqueda dentro del EPUB.
- Posición exacta, porcentaje y marcadores persistentes por libro. Preferencias persistentes.
- Resaltados persistentes en EPUB: elección de frase, cuatro colores y nota opcional. En PDF se pueden guardar referencias y notas por página. El panel del lector reúne marcadores, resaltados y notas y permite volver a su página.
- Pantalla de Inicio funcional con continuación de lectura y accesos directos a búsqueda, importación y biblioteca.
- Los ajustes, el índice y las anotaciones se muestran en una hoja inferior animada: entra desde abajo, acompaña el arrastre, vuelve con resorte al soltarla y se cierra al superar el umbral. Respeta la preferencia de reducir movimiento.
- Biblioteca con búsqueda, filtros PDF/EPUB, favoritos e historial desde el perfil.
- Buscador online: Gutenberg ofrece EPUB completos descargables; Open Library permite consultar títulos del catálogo general y su disponibilidad. Filtro de idioma, paginación, progreso y cancelación de descargas. Las descargas se incorporan a la biblioteca local sin duplicados; archivos fallidos se eliminan.
- Los libros descargables se seleccionan según la marca de dominio público en EE.UU. del catálogo Gutenberg. La disponibilidad y los derechos pueden variar por país. No se ofrecen descargas ficticias ni se eluden DRM o préstamos.

El contenido EPUB se guarda en archivos privados para evitar el límite de tamaño por registro de AsyncStorage. La importación y lectura local no requieren internet. Las portadas remotas, el catálogo y las vistas previas sí.

## Ejecutar y verificar

Requisitos: Node.js 18+, JDK 17 y Android SDK para compilar. El proyecto mantiene Expo SDK 48 / React Native 0.71.

```sh
npm ci --legacy-peer-deps
npm test
npm run check:android
npm run android
```

El visor PDF contiene código nativo: **no funciona en Expo Go**. Usa la compilación Android del proyecto. El comando de exportación verifica JavaScript/Hermes; no sustituye la compilación Gradle ni una prueba en un dispositivo.

## APK y GitHub

Cada push a `main` ejecuta las pruebas y compila el APK con GitHub Actions. Cuando termina correctamente, el workflow publica una release con `LectorLibros.apk`.

- Acciones: https://github.com/Xaoxay/LectorLibros/actions
- Descargas: https://github.com/Xaoxay/LectorLibros/releases/latest

La firma actual es la firma de desarrollo heredada del proyecto. El APK sirve para instalación directa; publicar en Play Store requiere firma de distribución y modernizar la plataforma Android/Expo.

## Estructura

- `App.js`: biblioteca, importación, detalle, catálogo y perfil local.
- `src/Reader.js`: lector PDF/EPUB, gestos, paneles y persistencia de lectura.
- `src/PageCurl.js`: representación y sombreado de la hoja animada de dos caras.
- `src/epub.js`: extracción EPUB y utilidades de paginación.
- `src/CatalogScreen.js`: búsqueda, filtros y descargas.
- `src/catalog.js`: APIs de Gutendex y Open Library.
- `src/downloadBook.js`: descarga transaccional y limpieza de archivos parciales.
- `tests/`: pruebas de EPUB y del estado/interacciones del lector con módulos nativos simulados.

## Límites conocidos

EPUB usa extracción de texto, no maquetación editorial: no reproduce imágenes interiores, tablas complejas, CSS ni diseños fijos. Archivos DRM, EPUB sin texto y PDF protegidos por contraseña no están soportados. El índice se deriva de encabezados reconocidos. Los cambios de tamaño de letra mantienen estable el número de página y permiten desplazamiento vertical si el texto ocupa más espacio.

Esta versión conserva dependencias antiguas de la base del proyecto. `npm audit` informa vulnerabilidades que requieren una actualización de plataforma planificada; no se aplican actualizaciones mayores automáticas que puedan romper los módulos nativos.

## Verificación anterior de 2.5

33 pruebas automatizadas: hoja inferior y gesto de cierre, gestos repetidos y transición interrumpida, persistencia PDF/EPUB, resaltados y notas, caché de búsqueda, resultados de catálogo, descargas, duplicados, cancelación y limpieza ante errores. Prueba de red real con Cervantes: búsqueda en español y descarga/procesamiento de Don Quijote. Consulta real del catálogo general con Dune. Las pruebas de componentes simulan módulos nativos y no sustituyen la revisión visual en un teléfono Android.

Fuentes: [Gutendex](https://gutendex.com/), [Open Library Search API](https://openlibrary.org/dev/docs/api/search). El catálogo general busca automáticamente con una espera de 450 ms; la descarga gratuita se busca al pulsar el botón para evitar solicitudes innecesarias al servicio público de Gutendex. La app cancela solicitudes obsoletas, guarda resultados recientes durante cinco minutos y pagina la lista para reducir red y trabajo de renderizado. Para un despliegue de gran escala, Gutendex recomienda alojar una instancia propia; el servicio público puede tardar o no estar disponible. La app muestra errores recuperables y limita las descargas a 40 MB y 90 segundos.


## Correcciones de estabilidad de 2.6.1

- La biblioteca distingue archivos ausentes de errores de lectura y no sustituye datos guardados con muestras. El progreso opcional se carga sin comprometer la lista de libros.
- Una cola compartida coordina incorporaciones, favoritos y eliminaciones para evitar sobrescrituras entre pantallas.
- El lector recupera ajustes independientemente de la posición. Si falla la recuperación del libro, conserva el estado original y ofrece reintento.
- Importación transaccional: elimina PDF/EPUB, texto y portada parciales si no se confirma el guardado. EPUB limitados a 40 MB y PDF a 200 MB antes de copiarlos.
- EPUB se descomprime por bloques con límites de contenido por entrada y acumulado, cantidad de archivos y páginas. Los capítulos ausentes generan un error en vez de crear un libro truncado. Archivos válidos que superen los límites también se rechazan.
- Las descargas verifican el tamaño final antes de leer el archivo, incluso cuando los eventos de progreso se retrasan en segundo plano. Las descargas duplicadas usan archivos temporales independientes.
- La foto de perfil admite la respuesta del selector de Expo SDK 48 y se copia al almacenamiento permanente. Los fallos al guardar el nombre se muestran al usuario.
- Se retiraron Firebase, epubjs y WebView, que no se utilizan en las pantallas ni en el lector actual.

Validación de esta revisión: 50 pruebas automatizadas aprobadas y exportación Android/Hermes exitosa. Para repetir: `npm test` y `npm run check:android`. En Windows con carpetas redirigidas o junctions, ejecutar Expo desde la ruta real de la carpeta para evitar el error de SHA-1 de Metro. La compilación JavaScript/Hermes y las pruebas con mocks no sustituyen la compilación nativa ni una prueba en Android.

## Nuevo diseño en 2.7.0

Interfaz cálida con crema, tinta y acentos terracota, portadas de tonos naturales y títulos editoriales. La navegación mantiene Inicio, Biblioteca, Buscar y Perfil. La importación, lectura, notas y marcadores funcionan localmente sin configurar servicios de traducción.

La vista previa interactiva está en `design-preview/index.html`; usa libros de muestra para revisar el diseño. Validación: `npm test` y `npm run check:android`.

## Pantalla completa en 2.7.1

Android oculta las barras de estado y navegación del sistema para dar más espacio a la app. Se muestran temporalmente deslizando desde el borde y el modo se recupera al volver del selector de archivos o de otra app. Se respetan las áreas de cámara y la navegación inferior.
