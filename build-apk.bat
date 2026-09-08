@echo off
echo ===================================================
echo     Compilador de APK para Android - Lector Libros
echo ===================================================
echo.

echo [1/3] Compilando aplicacion web y sincronizando con Capacitor...
call npm run cap:sync
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la compilacion web. Revisa los errores.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Verificando entorno Java / Android SDK...
where javac >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] No se detecto Java JDK instalado localmente en Windows.
    echo Para compilar el archivo .apk en tu PC necesitas instalar Java JDK 17 o Android Studio.
    echo.
    echo Alternativa recomendada:
    echo Puedes subir este codigo a GitHub y la accion automatica
    echo (.github/workflows/build-apk.yml) te generara el archivo APK listo para descargar gratis.
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Compilando APK con Gradle...
cd android
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo  LISTO! APK generado exitosamente en:
    echo  android\app\build\outputs\apk\debug\app-debug.apk
    echo ===================================================
) else (
    echo [ERROR] Fallo la compilacion de Gradle.
)
cd ..
pause
