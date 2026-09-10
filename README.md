# Lector Libros 2.1

Lector personal para Android con biblioteca local, importación de PDF/EPUB y búsqueda de fichas en Google Books. Abre directamente la biblioteca; no requiere registro ni simula autenticación o sincronización en la nube.

## Funciones

- PDF nativo: paginación horizontal, zoom, salto de página, marcadores y recuperación de posición.
- EPUB de texto sin DRM: lectura en orden del spine, extracción de portada, paginación sin perder párrafos largos y almacenamiento permanente en el dispositivo.
- Paso de página con arrastre, perspectiva, sombra, cancelación del gesto y controles anterior/siguiente. Respeta la opción de reducir movimiento del sistema.
- Temas claro, sepia y noche, tamaño de letra de 14 a 30, lectura inmersiva, índice por encabezados y búsqueda dentro del EPUB.
- Posición exacta, porcentaje y marcadores persistentes por libro. Preferencias persistentes.
- Biblioteca con búsqueda, filtros PDF/EPUB, favoritos e historial desde el perfil.
- Google Books guarda fichas descriptivas; la vista previa disponible se abre en el navegador desde los ajustes del lector. Las fichas y muestras están identificadas y no se presentan como libros completos.

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
- `src/epub.js`: extracción EPUB y utilidades de paginación.
- `tests/`: pruebas de EPUB y del estado/interacciones del lector con módulos nativos simulados.

## Límites conocidos

EPUB usa extracción de texto, no maquetación editorial: no reproduce imágenes interiores, tablas complejas, CSS ni diseños fijos. Archivos DRM, EPUB sin texto y PDF protegidos por contraseña no están soportados. El índice se deriva de encabezados reconocidos. Los cambios de tamaño de letra mantienen estable el número de página y permiten desplazamiento vertical si el texto ocupa más espacio.

Esta versión conserva dependencias antiguas de la base del proyecto. `npm audit` informa vulnerabilidades que requieren una actualización de plataforma planificada; no se aplican actualizaciones mayores automáticas que puedan romper los módulos nativos.
