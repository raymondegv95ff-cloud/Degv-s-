# ⚡ Guía Completa de Ionic Appflow - Degv's Messenger

Degv's Messenger está 100% optimizado y configurado para compilarse como **App Nativa Android (APK y AAB)** y actualizarse en tiempo real mediante **Ionic Appflow**.

---

## 🛠️ Archivos de Configuración Incluidos

1. **`ionic.config.json`**:
   - Define el tipo de proyecto (`custom`), identificador (`com.degv.messenger`), integración con Capacitor y canales de despliegue (`Production`, `Staging`).
2. **`appflow.json`**:
   - Especifica el stack de compilación nativo (`Android - 2024.11`), versión de Node (`20.x`), scripts de construcción (`npm run build`), canales de Live Update y opciones de Gradle.
3. **`capacitor.config.json`**:
   - Configuración de plugins de Capacitor, LiveUpdates (`autoUpdateMethod: "background"`), permisos de Android y WebView.
4. **Directorio `/android`**:
   - `build.gradle`, `app/build.gradle`, `AndroidManifest.xml`, `MainActivity.java`, `gradle.properties`, y Gradle Wrapper.
5. **Scripts**:
   - `appflow-build.sh` y `appflow-sync.sh`.

---

## 🚀 Pasos para Conectar y Compilar en Ionic Appflow

### 1. Conectar tu Repositorio en Appflow
1. Inicia sesión en [Ionic Appflow Dashboard](https://dashboard.ionicframework.com/).
2. Haz clic en **"New App"** -> Selecciona **"Import existing app"**.
3. Elige tu proveedor de Git (**GitHub**, GitLab, Bitbucket o Ionic Git).
4. Selecciona el repositorio de **Degv's Messenger**.
5. Appflow detectará automáticamente la integración de **Capacitor** y `ionic.config.json`.

---

### 2. Configurar el Entorno de Compilación Nativo en Appflow
En la sección **Build -> Environments** de Appflow:
- **Build Stack**: `Android - 2024.11` (o la versión recomendada más reciente de Linux/Android).
- **Node Version**: `20.x`
- **Target SDK**: `34` (Android 14) / `35` (Android 15)

---

### 3. Compilar APK Nativo de Android (Debug / Release)
En la sección **Builds -> Package (Native Builds)**:
1. Haz clic en **"New Build"**.
2. Selecciona el **Commit** o rama (`main`).
3. Elige **Target Platform**: `Android`.
4. Elige **Build Type**:
   - `Debug` -> Genera un archivo `.apk` instalable inmediatamente en cualquier dispositivo Android.
   - `Release` -> Genera un `.apk` o `.aab` firmado para Google Play Store.
5. Haz clic en **"Build"**.
6. Una vez completado, descarga tu archivo `.apk` directamente o escanéalo con el código QR generado por Appflow.

---

### 4. Actualizaciones en Vivo (Live Updates / Ionic Deploy)
Con Appflow Live Updates, puedes enviar actualizaciones de código web (JavaScript, CSS, HTML, nuevas funciones) instantáneamente a los dispositivos de los usuarios **sin tener que volver a compilar el APK ni esperar la revisión de Google Play Store**:

1. En el dashboard, ve a **Deploy -> Channels**.
2. Verifica que el canal `Production` esté activo.
3. Para publicar una actualización:
   ```bash
   npm run build
   ionic deploy build --channel=Production
   ```
4. Los dispositivos de los usuarios descargarán silenciosamente la actualización en segundo plano (`autoUpdateMethod: "background"`).

---

## 💻 Comandos CLI de Ionic Appflow

```bash
# Instalar Ionic CLI globalmente
npm install -g @ionic/cli

# Iniciar sesión en Appflow
ionic login

# Enlazar este proyecto con tu ID de Appflow
ionic link --id com.degv.messenger

# Validar compilación web
npm run appflow:build

# Desplegar Live Update directo al canal de Producción
ionic deploy build --channel=Production

# Compilar APK Android en la nube de Appflow
ionic package build android --destination=Android_Debug --build-stack="Android - 2024.11"
```
