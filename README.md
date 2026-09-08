# 📚 Lector Digital de Libros EPUB (PWA para Android y Web)

Una aplicación móvil moderna, rápida y 100% privada diseñada para leer libros electrónicos en formato `.epub` en smartphones Android y PC.

---

## ✨ Características Principales

- 📱 **Instalable en Android (PWA)**: Se instala directamente desde Google Chrome o Edge en tu celular con su propio icono de app y se abre a pantalla completa como una aplicación nativa.
- ✈️ **100% Offline y Privada**: Los libros, el progreso y las notas se guardan en el almacenamiento interno de tu dispositivo (IndexedDB). No requiere cuentas, suscripciones ni internet.
- 📖 **Experiencia de Lectura Cómoda**:
  - **Temas**: Claro, Sepia (estilo libro en papel), Oscuro y **Negro AMOLED** (ahorra batería en pantallas OLED de celular).
  - **Ajustes de texto**: Aumentar/reducir tamaño de letra, tipografía con serifa clásica, moderna o monospace, e interlineado.
  - **Navegación táctil móvil**:
    - Tocar lado derecho: avanzar página.
    - Tocar lado izquierdo: retroceder página.
    - Tocar centro: mostrar/ocultar menús y barra de progreso.
    - Deslizar el dedo (swipe) hacia la izquierda o derecha.
  - **Marcadores**: Guarda tus páginas y citas favoritas con un toque.
  - **Índice (TOC)**: Navega fácilmente entre capítulos con buscador integrado.
  - **Progreso automático**: Recuerda automáticamente dónde te quedaste al volver a abrir el libro.
- 🚀 **Libro de Prueba incluido**: Botón directo para cargar "El Principito" y comenzar a leer de inmediato.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: En tu computadora
1. Haz doble clic en el archivo `iniciar_lector.bat` (o abre una terminal en esta carpeta y corre `npm run dev`).
2. Abre en tu navegador: [http://localhost:5173](http://localhost:5173).

### Opción 2: Abrir e instalar en tu celular Android
1. Asegúrate de que tu celular esté conectado a la **misma red Wi-Fi** que tu computadora.
2. Al ejecutar `npm run dev`, Vite te mostrará una dirección de red (por ejemplo: `http://192.168.1.50:5173`).
3. Abre esa dirección en el navegador **Google Chrome** de tu celular Android.
4. Toca los **3 puntos (⋮)** en la esquina superior de Chrome y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
5. ¡Listo! La app aparecerá en el menú de aplicaciones de tu Android y funcionará incluso sin internet.

---

## 🌐 Cómo Publicarla Gratis en Internet (Para no depender de la PC)
Si deseas acceder a tu lector desde tu celular en cualquier lugar (fuera de casa) sin tener la computadora encendida:
1. Puedes subir el proyecto a **Vercel** o **Netlify** o **Firebase Hosting**.
2. Con solo conectar la carpeta o repositorio, te darán un enlace permanente gratuito (ejemplo: `https://mi-lector-personal.vercel.app`).
3. Entras desde tu Android una sola vez, la instalas, y ya tienes tu lector disponible para siempre.
