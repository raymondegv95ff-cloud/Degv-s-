#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# DEGV'S MESSENGER - INSTALADOR AUTOMÁTICO EN TERMUX
# ==============================================================================

set -e

echo -e "\033[1;36m>> Actualizando repositorios de Termux...\033[0m"
pkg update -y && pkg upgrade -y

echo -e "\033[1;36m>> Instalando paquetes necesarios (Node.js LTS, Git, OpenSSL, Termux-API, Wget, Curl, Build-Essential)...\033[0m"
pkg install -y nodejs-lts git openssl termux-api wget curl build-essential

echo -e "\033[1;36m>> Concediendo permisos de almacenamiento Termux...\033[0m"
termux-setup-storage || true

echo -e "\033[1;36m>> Instalando dependencias de Node.js...\033[0m"
npm install

echo -e "\033[1;36m>> Compilando el proyecto...\033[0m"
npm run build

echo -e "\033[1;32m>> Asignando permisos de ejecución a los scripts...\033[0m"
chmod +x termux-start.sh setup-capacitor.sh build-twa.sh sync-github.sh || true

echo -e "\033[1;32m============================================================\033[0m"
echo -e "\033[1;32m[*] ¡Instalación en Termux completada con éxito!\033[0m"
echo -e "\033[1;37mPara iniciar la aplicación ejecuta:\033[0m"
echo -e "\033[1;33m    ./termux-start.sh\033[0m"
echo -e "\033[1;32m============================================================\033[0m"
