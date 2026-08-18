#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - ENLACE DIRECTO Y SINCRONIZADOR CON GITHUB
# Repositorio Oficial: raymondegv95ff-cloud/Degv-s-Messenger-APK
# ==============================================================================

set -e

DEFAULT_REPO="https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git"
REPO_URL=${1:-$DEFAULT_REPO}
COMMIT_MSG=${2:-"feat: sync all project files with GitHub, Capacitor Android APK, Appflow, Termux, and Workflows"}

echo -e "\033[1;36m============================================================\033[0m"
echo -e "\033[1;36m>> DEGV'S MESSENGER - SINCRONIZADOR CON GITHUB\033[0m"
echo -e "\033[1;36m============================================================\033[0m"
echo -e "\033[1;33m[*] Repositorio destino:\033[0m $REPO_URL"

# Configurar identidad de Git si no existe
if [ -z "$(git config user.name 2>/dev/null)" ]; then
    git config user.name "raymondegv95ff-cloud"
fi
if [ -z "$(git config user.email 2>/dev/null)" ]; then
    git config user.email "raymondegv95ff@gmail.com"
fi

# Inicializar Git si no existe
if [ ! -d ".git" ]; then
    echo -e "\033[1;32m[*] Inicializando repositorio Git local...\033[0m"
    git init
fi

git branch -M main

# Configurar remote origin
echo -e "\033[1;32m[*] Configurando remote origin...\033[0m"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Añadir todos los ficheros del proyecto
echo -e "\033[1;32m[*] Staging de todos los ficheros del proyecto...\033[0m"
git add -A

# Crear commit
echo -e "\033[1;32m[*] Creando commit con cambios...\033[0m"
git commit -m "$COMMIT_MSG" || echo -e "\033[1;33m[i] No hay cambios nuevos para commitear.\033[0m"

echo -e "\033[1;32m[*] Estado del repositorio:\033[0m"
git status -s

echo -e "\033[1;36m============================================================\033[0m"
echo -e "\033[1;32m[*] ¡Proyecto preparado y enlazado con GitHub!\033[0m"
echo -e "\033[1;37mPara enviar los cambios al servidor remoto, ejecuta:\033[0m"
echo -e "\033[1;33m  git push -u origin main\033[0m"
echo -e "\033[1;37mO si utilizas un Personal Access Token (PAT):\033[0m"
echo -e "\033[1;33m  git push https://<TU_TOKEN>@github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git main\033[0m"
echo -e "\033[1;36m============================================================\033[0m"
