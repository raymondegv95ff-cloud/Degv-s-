# 🚀 Guía de Integración y Automatización CI/CD con Ionic Appflow & GitHub Actions

Esta guía detalla el procedimiento paso a paso para conectar el repositorio **`Degv's Messenger`** con **Ionic Appflow**, configurando variables de entorno, pipelines de compilación en la nube para APK/AAB y actualizaciones en vivo (Live Updates) sin necesidad de pasar por la tienda.

---

## 1. 📋 Estructura de Configuración en el Proyecto

El repositorio ya contiene los archivos requeridos para la integración nativa y de nube:

| Archivo | Función |
| :--- | :--- |
| `ionic.config.json` | Identificador de la app (`com.degv.messenger`), integración con Capacitor y mapeo de canales (`Production`, `Staging`). |
| `appflow.json` | Pila de compilación (`Android - 2024.11`, Node.js 20.x, SDK 34) y configuración de Live Updates en segundo plano. |
| `capacitor.config.json` | Puente nativo entre la PWA y la capa Android de Capacitor. |
| `.github/workflows/ionic-appflow-build.yml` | Pipeline de GitHub Actions que valida la integridad de producción y sincroniza con Appflow. |
| `scripts/validate-production-integrity.js` | Script que audita el 100% de enlaces entre WebManifest, Capacitor, Firebase y Appflow. |
| `scripts/appflow-deploy.sh` | Script de automatización local/CI para preparar bundles y manifiestos de Live Update. |

---

## 2. 🔑 Configuración de Variables y Secretos en GitHub

Para que GitHub Actions y Appflow compilen y publiquen de forma 100% real y automática, añade estos secretos en tu repositorio de GitHub:

1. Ve a **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
2. Añade las siguientes variables:

| Nombre del Secreto | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- |
| `IONIC_TOKEN` | Token de acceso personal generado en el panel de Ionic Appflow. | `ion_pat_xxxxxxxxxxxxxxxx` |
| `APPFLOW_APP_ID` | ID de la aplicación en el dashboard de Appflow. | `com.degv.messenger` o ID asignado |
| `GEMINI_API_KEY` | Llave de API del motor Gemini AI para el servidor Express. | `AIzaSy...` |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase aprovisionado. | `sacred-wavelet-t9v0l` |

---

## 3. 🌐 Vinculación con el Dashboard de Ionic Appflow

1. **Iniciar sesión en Appflow**: Ingresa a [https://dashboard.ionicframework.com/](https://dashboard.ionicframework.com/).
2. **Crear o Vincular App**:
   - Haz clic en **New App** -> **Import an existing app**.
   - Selecciona **GitHub** como proveedor de Git.
   - Selecciona el repositorio: `raymondegv95ff-cloud/Degv-s-Messenger-APK`.
3. **Configurar Build Stack**:
   - **Framework**: Capacitor / React.
   - **Build Stack**: `Android - 2024.11` o más reciente.
   - **Node Version**: `20.x`.
   - **Web Dir**: `dist`.
   - **Build Script**: `npm run build`.

---

## 4. 📲 Configuración de Certificados de Firma Android (Keystore) en Appflow

Para generar APKs o AABs listos para producción o Google Play:
1. En el panel de Appflow de tu aplicación, navega a **Signing Certificates** -> **Add Certificate**.
2. Sube tu archivo `.keystore` o `.jks` (alias: `degvsmessenger`).
3. Introduce la contraseña del keystore y la clave privada.
4. Asigna el perfil de firma al canal **Production**.

---

## 5. ⚡ Live Updates Atómicas (Actualización Instantánea en Segundo Plano)

Con la configuración en `appflow.json` y `public/sw.js`:
- Cada vez que hagas `git push origin main`, GitHub Actions y Appflow empaquetan la versión web.
- Los usuarios que tengan instalada la app en Android reciben la actualización **automáticamente en segundo plano sin interrumpir su sesión**.
- La arquitectura atómica del Service Worker y el canal de actualización promueven la nueva versión de forma fluida.

---

## 6. 🛠️ Comandos de Automatización Disponibles en el Proyecto

```bash
# 1. Validar integridad multi-plataforma de todos los archivos y configuraciones
npm run validate:integrity

# 2. Compilar Web + Servidor Express para producción
npm run build

# 3. Ejecutar pipeline de empaquetado y manifiesto de Appflow
./scripts/appflow-deploy.sh

# 4. Sincronizar cambios nativos de Capacitor con Android
npm run appflow:sync
```
