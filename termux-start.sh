#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# DEGV'S MESSENGER - SCRIPT DE EJECUCIÓN NATIVO EN TERMUX (ANDROID)
# ==============================================================================

set -e

echo -e "\033[1;32m"
echo "  ____                  _      __  __                                  "
echo " |  _ \  ___  __ ___   _( )___ |  \/  | ___  ___ ___  ___ _ __   __ _  ___ _ __ "
echo " | | | |/ _ \/ _\` \ \ / /// __|| |\/| |/ _ \/ __/ __|/ _ \ '_ \ / _\` |/ _ \ '__|"
echo " | |_| |  __/ (_| |\ V /  \__ \| |  | |  __/\__ \__ \  __/ | | | (_| |  __/ |   "
echo " |____/ \___|\__, | \_/   |___/|_|  |_|\___||___/___/\___|_| |_|\__, |\___|_|   "
echo "             |___/                                              |___/           "
echo -e "\033[0m"
echo -e "\033[1;36m>> Iniciando Degv's Messenger en entorno Android Termux...\033[0m"

# 1. Solicitar Permisos de Almacenamiento Termux
if [ ! -d "$HOME/storage" ]; then
    echo -e "\033[1;33m[*] Solicitando permisos de almacenamiento en Android...\033[0m"
    termux-setup-storage || true
fi

# 2. Mantener CPU activa en segundo plano (Evita que Android cierre el servidor)
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo -e "\033[1;32m[*] Activando Termux Wake-Lock (CPU Activa en segundo plano)...\033[0m"
    termux-wake-lock
fi

# 3. Notificación de inicio si Termux:API está instalado
if command -v termux-notification >/dev/null 2>&1; then
    termux-notification --title "Degv's Messenger" --content "Servidor iniciado en http://localhost:3000" --priority high || true
fi

# 4. Verificar Node.js y Git
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;31m[!] Node.js no encontrado. Instalando dependencias de Termux...\033[0m"
    pkg update -y && pkg install -y nodejs git openssl
fi

# 5. Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo -e "\033[1;36m[*] Instalando módulos de Node.js...\033[0m"
    npm install
fi

# 6. Compilar build para producción si no existe
if [ ! -d "dist" ]; then
    echo -e "\033[1;36m[*] Compilando interfaz web y servidor...\033[0m"
    npm run build
fi

# 7. Obtener la IP Local de la red Wi-Fi
IP_LOCAL=$(ifconfig wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\033[1;32m========================================================\033[0m"
echo -e "\033[1;32m[*] ¡DEGV'S MESSENGER LISTO Y EN EJECUCIÓN!\033[0m"
echo -e "\033[1;37m    Local:     \033[1;36mhttp://localhost:3000\033[0m"
echo -e "\033[1;37m    Red Wi-Fi: \033[1;36mhttp://${IP_LOCAL}:3000\033[0m"
echo -e "\033[1;32m========================================================\033[0m"
echo -e "\033[1;33m[i] Presiona Ctrl+C para detener el servidor.\033[0m"

# 8. Iniciar el servidor
npm run start || npm run dev
