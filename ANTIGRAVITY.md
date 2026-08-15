# 🌌 Degv's Messenger — Enlace Directo con GitHub, Antigravity, Termux, Capacitor y Bubblewrap

Este proyecto está completamente configurado para ser desarrollado, desplegado y ejecutado en múltiples entornos con todos los permisos habilitados:

---

## 1. 🐙 Enlace Directo con GitHub
- **Sincronización Inmediata**:
  ```bash
  chmod +x sync-github.sh
  ./sync-github.sh https://github.com/TU-USUARIO/degvs-messenger.git
  ```
- **Compilación Automática de APK en GitHub Actions**:
  - Cada `git push` a `main` activa `.github/workflows/build-apk.yml`, generando un artefacto `.apk` descargable directamente desde la pestaña **Actions** de tu repositorio.
- **Despliegue Web en GitHub Pages**:
  - Automatizado mediante `.github/workflows/deploy-pages.yml`.

---

## 2. ⚡ Google Antigravity & AI Studio Build
- **Agente Motor**: Google Antigravity Agent & Gemini Models (`gemini-2.5-flash` y `gemini-3.7-flash`).
- **Archivo de Configuración**: `antigravity.config.json` y `metadata.json`.
- **Capacidades**:
  - Ejecución de servidor Express en puerto 3000 con backend seguro para Gemini API.
  - Sincronización en tiempo real con Firestore y autenticación WebAuthn/Biométrica.
  - Almacenamiento y caché offline 0ms con PWA Service Worker.

---

## 3. 📱 Ejecución Nativa en Termux (Android Linux)
Para ejecutar la aplicación localmente dentro de tu dispositivo Android sin necesidad de PC:

```bash
# 1. Instalar dependencias y permisos
chmod +x termux-install.sh termux-start.sh
./termux-install.sh

# 2. Iniciar el servidor
./termux-start.sh
```

**Permisos en Termux:**
- `termux-setup-storage`: Acceso a almacenamiento compartido de Android.
- `termux-wake-lock`: Mantiene el servidor activo en segundo plano aunque se apague la pantalla.
- `termux-notification`: Envía notificaciones locales del sistema.

---

## 4. 📦 Capacitor (APK Nativo Android)
Proyecto Android preconfigurado con todos los permisos en `android/app/src/main/AndroidManifest.xml`:

```bash
# 1. Configurar y sincronizar Capacitor
chmod +x setup-capacitor.sh
./setup-capacitor.sh

# 2. Abrir en Android Studio o compilar directamente
npx cap open android
# O por terminal con Gradle:
cd android && ./gradlew assembleDebug
```

**Permisos Habilitados en `AndroidManifest.xml`:**
- `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `MANAGE_EXTERNAL_STORAGE`
- `POST_NOTIFICATIONS`, `VIBRATE`, `WAKE_LOCK`, `FOREGROUND_SERVICE`
- `USE_BIOMETRIC`, `USE_FINGERPRINT`
- `BLUETOOTH`, `BLUETOOTH_CONNECT`

---

## 5. 🌐 Bubblewrap (TWA - Trusted Web Activity para Google Play Store)
Genera paquetes `.aab` y `.apk` firmados y verificados para publicar directamente en Google Play Store:

```bash
chmod +x build-twa.sh
./build-twa.sh
```
- Archivos configurados: `twa-manifest.json` y `bubblewrap.json`.
