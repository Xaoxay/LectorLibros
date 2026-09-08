# 📱 Guía para Generar, Instalar y Actualizar el APK en Android (Lector Libros)

Esta aplicación fue transformada con éxito en un proyecto nativo de Android usando **Capacitor**, y cuenta con un **sistema de actualización integrado**.

Tienes **dos opciones muy sencillas** para obtener el archivo `.apk` e instalarlo en tu celular:

---

### Opción 1 (Recomendada y 100% Automática): GitHub Actions (Sin instalar nada en tu PC)

Ya dejamos configurado el archivo `.github/workflows/build-apk.yml`. Cada vez que subas el proyecto a un repositorio de GitHub:

1. Ve a la pestaña **Actions** en tu repositorio de GitHub.
2. Selecciona **Generar APK de Android (Lector Libros)**.
3. Haz clic en **Run workflow**.
4. En ~2 minutos terminará la compilación y en la sección **Artifacts** podrás descargar directamente el archivo:
   👉 `LectorLibros-Android-APK.zip`
5. Descomprímelo y tendrás tu `app-debug.apk` listo para pasar a tu celular e instalarlo.

---

### Opción 2: Compilar en tu PC con Android Studio

Si prefieres compilarlo directamente desde tu computadora:

1. Abre la terminal en esta carpeta (`LectorLibros`).
2. Ejecuta:
   ```bash
   npm run cap:open
   ```
3. Esto abrirá automáticamente el proyecto en **Android Studio**.
4. En el menú superior de Android Studio, haz clic en:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Al terminar, te mostrará una notificación con el enlace directo al archivo `app-debug.apk`.
6. Conecta tu celular por USB o envíate el archivo por WhatsApp / Telegram para instalarlo.

---

### 📲 Cómo instalar el APK en tu celular Android

1. Pasa el archivo `app-debug.apk` a tu teléfono (por cable, Drive, WhatsApp, etc.).
2. En tu celular, pulsa sobre el archivo descargado.
3. Si el sistema te lo pide, activa la opción **"Permitir instalar aplicaciones de orígenes desconocidos"**.
4. Pulsa **Instalar** y ¡listo! Ya tienes **Lector Libros** instalado como app nativa en tu pantalla de inicio.

---

### 🔄 ¿Cómo funcionan las actualizaciones en el futuro?

La app cuenta con un **gestor de actualizaciones integrado**:

1. **Detección Automática**: Al abrir la aplicación, comprueba automáticamente si hay una nueva versión. Si detecta mejoras, aparecerá una píldora flotante dorada arriba:  
   *«Nueva versión disponible • Toca para actualizar»*.
2. **Comprobación Manual**:
   - En la biblioteca principal, junto a "Instalar", tienes el botón **Actualizar**.
   - En el lector, dentro de los **Ajustes de Lectura**, también tienes el acceso directo **Actualizaciones**.
3. **Descarga e Instalación en 1 toque**:
   - Pulsa **"Descargar e Instalar Actualización (.apk)"**. Se descargará el nuevo instalador y el sistema de Android te pedirá actualizar la app.
4. **🛡️ Tus datos están 100% protegidos**:
   - Al actualizar el APK, **NO se borra nada**. Android mantiene intactos todos tus libros guardados, marcadores, subrayados de colores, notas personales y el progreso de lectura de cada libro.
5. **Configuración con tu GitHub**:
   - En la pestaña *Canal & Configuración* del modal de actualizaciones puedes poner tu usuario y repositorio de GitHub (ej: `tu-usuario/LectorLibros`). De este modo, la app leerá directamente las nuevas versiones y APKs que publiques en tus *Releases* de GitHub.
