#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - GENERADOR DE APK / AAB MEDIANTE BUBBLEWRAP (TWA)
# ==============================================================================

set -e

echo -e "\033[1;36m>> Iniciando generador de TWA (Bubblewrap) para Google Play...\033[0m"

# 1. Verificar Node.js y Bubblewrap CLI
if ! command -v bubblewrap >/dev/null 2>&1; then
    echo -e "\033[1;33m[*] Instalando Bubblewrap CLI globalmente...\033[0m"
    npm install -g @bubblewrap/cli
fi

# 2. Inicializar TWA desde el manifest
echo -e "\033[1;32m[*] Inicializando proyecto Bubblewrap desde twa-manifest.json...\033[0m"
bubblewrap init --manifest=twa-manifest.json

# 3. Compilar APK y AAB firmado
echo -e "\033[1;32m[*] Compilando paquete APK/AAB firmado para Android...\033[0m"
bubblewrap build

echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m[*] ¡Compilación con Bubblewrap finalizada!\033[0m"
echo -e "\033[1;37mTu paquete APK / AAB está listo en la raíz del proyecto.\033[0m"
echo -e "\033[1;32m============================================================\033[0m"
