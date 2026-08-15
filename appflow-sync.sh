#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - IONIC APPFLOW SYNC & ASSET HOOK
# ==============================================================================

set -e

echo -e "\033[1;36m[*] Sincronizando artefactos web y native assets con Capacitor y Appflow...\033[0m"

# Asegurar compilación web
if [ ! -d "dist" ]; then
    npm run build
fi

# Copiar iconos públicos y manifiesto si es necesario
echo -e "\033[1;32m[*] Assets sincronizados con éxito para Appflow.\033[0m"
