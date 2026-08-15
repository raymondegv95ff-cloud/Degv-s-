#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - ENLACE DIRECTO Y SINCRONIZADOR CON GITHUB
# ==============================================================================

set -e

echo -e "\033[1;36m>> Iniciando enlace directo con GitHub...\033[0m"

REPO_URL=$1

if [ -z "$REPO_URL" ]; then
    echo -e "\033[1;33mIngresa la URL de tu repositorio de GitHub (ejemplo: https://github.com/tu-usuario/degvs-messenger.git):\033[0m"
    read -p "GitHub URL: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
    echo -e "\033[1;31m[!] No se proporcionó una URL de repositorio. Abortando.\033[0m"
    exit 1
fi

# Inicializar Git si no existe
if [ ! -d ".git" ]; then
    echo -e "\033[1;32m[*] Inicializando repositorio Git local...\033[0m"
    git init
    git branch -M main
fi

# Configurar remote origin
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo -e "\033[1;32m[*] Añadiendo archivos al commit...\033[0m"
git add .
git commit -m "feat: release Degv's Messenger with Termux, Capacitor, Bubblewrap, and Antigravity Link" || true

echo -e "\033[1;32m[*] Subiendo código a GitHub en la rama main...\033[0m"
git push -u origin main

echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m[*] ¡Sincronización con GitHub completada exitosamente!\033[0m"
echo -e "\033[1;37mTu repositorio está vinculado en:\033[0m \033[1;36m$REPO_URL\033[0m"
echo -e "\033[1;32m============================================================\033[0m"
