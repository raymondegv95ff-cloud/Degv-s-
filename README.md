# 🛡️ Degv's Messenger — Multi-Platform Cyber Hybrid Messenger

[![Android APK CI](https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/actions/workflows/build-apk.yml/badge.svg)](https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/actions/workflows/build-apk.yml)
[![GitHub Pages Deploy](https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android%20%7C%20PWA%20%7C%20Termux%20%7C%20Appflow-00E676.svg)]()

> **Degv's Messenger** es una plataforma de mensajería instantánea híbrida, descentralizada y multi-plataforma de ultra-alto rendimiento con cifrado de extremo a extremo, enlace de 6 plataformas (PWA, Android Capacitor APK, Ionic Appflow Cloud, Google Play TWA, Termux Linux Daemon y GitHub Actions CI/CD) e integración con Firebase y Google Gemini AI.

---

## 🚀 Plataformas Soportadas & Canales de Distribución

| Plataforma | Estado | Motor / Pipeline | Salida |
| :--- | :---: | :--- | :--- |
| **🌐 Web App & PWA Instantánea** | `ONLINE` | Vite 6 + React 19 + Service Worker v6 | Caché 0ms, Offline First |
| **📱 Android APK Nativo** | `LISTO` | Capacitor 6 + Android Gradle 8.2 | Debug & Release APK / AAB |
| **☁️ Ionic Appflow Cloud** | `CONECTADO` | Appflow CI/CD + Capacitor Deploy | Live Updates OTA & Cloud Builds |
| **🛍️ Google Play TWA** | `LISTO` | Bubblewrap CLI + Digital Asset Links | Google Play Store Ready (.aab) |
| **💻 Termux Linux (Android)** | `ACTIVO` | Node 20 + Express Daemon + CPU Wake-Lock | Servidor Local Wi-Fi & Background |
| **⚙️ GitHub Actions CI/CD** | `AUTOMATIZADO`| Workflows en `.github/workflows/` | Auto Build APK en cada push |

---

## 📂 Estructura del Repositorio

```text
├── .github/
│   └── workflows/
│       ├── build-apk.yml          # Pipeline de compilación de APK en GitHub Actions
│       └── deploy-pages.yml       # Despliegue automático a GitHub Pages
├── android/                       # Proyecto Nativo Android con Capacitor
│   ├── app/
│   │   ├── build.gradle           # Configuración de compilación Gradle
│   │   └── src/main/
│   │       └── AndroidManifest.xml# Permisos nativos (cámara, audio, storage, gps)
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradlew                    # Wrapper de Gradle para compilación
├── public/                        # Assets estáticos, manifiesto web, sw.js
├── src/                           # Código fuente React 19 & TypeScript
│   ├── components/                # Componentes modulares de interfaz
│   ├── context/                   # Contextos de autenticación, chat y UI
│   ├── services/                  # Servicios de backend, Appflow, PWA y Firebase
│   └── types/                     # Definición de tipos globales
├── capacitor.config.json          # Configuración de Capacitor 6
├── ionic.config.json              # Configuración de Ionic Framework
├── appflow.json                   # Configuración de Ionic Appflow Cloud CI/CD
├── twa-manifest.json              # Manifiesto para Trusted Web Activity (TWA)
├── sync-github.sh                 # Script automatizado de sincronización con GitHub
├── termux-install.sh              # Instalador desatendido para Termux en Android
├── termux-start.sh                # Script de inicio en segundo plano con Wake-Lock
├── package.json                   # Dependencias y scripts de construcción
└── server.ts                      # Servidor backend Express con Vite middleware
```

---

## 🛠️ Guía Rápida de Instalación y Desarrollo

### 1. Requisitos Previos
- **Node.js**: v20.x o superior
- **npm**: v10.x o superior
- *(Opcional para compilación Android local)*: JDK 17 y Android Studio / SDK

### 2. Clonar y Configurar
```bash
git clone https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git
cd Degv-s-Messenger-APK
npm install
```

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
# Acceso en http://localhost:3000
```

### 4. Compilar para Producción
```bash
npm run build
```

---

## 📱 Compilación de APK Nativo para Android

### Opción A: Compilación Automática en GitHub Actions (Recomendada)
1. Haz un commit o push a la rama `main`:
   ```bash
   git add .
   git commit -m "feat: nueva actualización"
   git push origin main
   ```
2. Ve a la pestaña **Actions** en GitHub:
   `https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/actions`
3. El workflow `Build Android APK` compilará automáticamente el APK y lo dejará listo para descargar en la sección de **Artifacts**.

### Opción B: Compilación Local con Capacitor
```bash
npm run build
npx cap sync android
cd android
chmod +x ./gradlew
./gradlew assembleDebug
# Tu APK estará en: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ☁️ Despliegue con Ionic Appflow (Live Updates & Cloud Build)

```bash
# Vincular con el dashboard de Ionic Appflow
npx ionic link --id=com.degv.messenger

# Generar Live Update OTA (sin pasar por la tienda)
npx ionic deploy build --channel=Production

# Compilar APK nativo en la nube
npx ionic package build android --type=debug
```

---

## 💻 Ejecución en Termux (Android Linux)

```bash
# 1. Instalar entorno en Termux
pkg update && pkg install nodejs git -y
bash termux-install.sh

# 2. Iniciar servidor con Wake-Lock (mantiene la app activa en segundo plano)
bash termux-start.sh
```

---

## 🔐 Seguridad y Privacidad
- **Cifrado de Extremo a Extremo (E2EE)** mediante Web Crypto API (AES-GCM & RSA-OAEP).
- **Autenticación Biométrica** WebAuthn y huella dactilar nativa.
- **Base de Datos Firebase Firestore** en tiempo real con reglas de seguridad estrictas.
- **Service Worker v6** con aislamiento de caché de 0ms y operación offline completa.

---

## 👤 Autor
- **Raymond EGV** ([@raymondegv95ff-cloud](https://github.com/raymondegv95ff-cloud))
- Contacto: `raymondegv95ff@gmail.com`
- Repositorio Oficial: `https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK`
