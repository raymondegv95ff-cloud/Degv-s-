#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - SETUP Y CONFIGURACIÓN DE CAPACITOR ANDROID
# ==============================================================================

set -e

echo -e "\033[1;36m>> Iniciando configuración de Capacitor Android...\033[0m"

# 1. Compilar distribución web
echo -e "\033[1;33m[*] Compilando artefactos estáticos (Vite)...\033[0m"
npm run build

# 2. Verificar dependencias de Capacitor
if ! npm list @capacitor/core >/dev/null 2>&1; then
    echo -e "\033[1;33m[*] Instalando dependencias de Capacitor (@capacitor/core, @capacitor/cli, @capacitor/android)...\033[0m"
    npm install @capacitor/core @capacitor/android
    npm install -D @capacitor/cli
fi

# 3. Inicializar Capacitor si no existe la carpeta android
if [ ! -d "android" ]; then
    echo -e "\033[1;32m[*] Creando proyecto nativo Android...\033[0m"
    npx cap add android
fi

# 4. Sincronizar código web y permisos con Android Studio
echo -e "\033[1;32m[*] Sincronizando proyecto con Android...\033[0m"
npx cap sync android

echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m[*] ¡Capacitor Android configurado con éxito!\033[0m"
echo -e "\033[1;37mPara abrir en Android Studio y compilar tu APK:\033[0m"
echo -e "\033[1;33m    npx cap open android\033[0m"
echo -e "\033[1;37mO compilar directamente con Gradle:\033[0m"
echo -e "\033[1;33m    cd android && ./gradlew assembleDebug\033[0m"
echo -e "\033[1;32m============================================================\033[0m"
