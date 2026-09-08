@echo off
title Lector Digital - Servidor Local
echo ===================================================================
echo     INICIANDO LECTOR DIGITAL: LIBROS (EPUB), DOCUMENTOS (PDF) Y MANGA (CBZ)
echo ===================================================================
echo.
echo 1. Para abrir en esta PC:
echo    http://localhost:5173
echo.
echo 2. Para abrir e instalar en tu celular Android:
echo    - Conecta tu celular a la misma red Wi-Fi de esta PC.
echo    - Abre en Google Chrome la direccion 'Network' que aparecera abajo.
echo    - Toca el boton amarillo "Instalar App" o los 3 puntos de Chrome y
echo      selecciona "Agregar a la pantalla principal" / "Instalar aplicacion".
echo.
echo 3. Nuevo soporte multiformato:
echo    - Libros Digitales (.epub)
echo    - Documentos y Libros (.pdf) con modo nocturno
echo    - Manga y Comics (.cbz / .zip) con lectura japonesa (RTL)
echo    - Catalogo para descargar libros clasicos gratis con 1 clic
echo.
echo ===================================================================
echo.
cd /d "%~dp0"
npm run dev
pause
