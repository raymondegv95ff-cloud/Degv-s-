#!/usr/bin/env bash
# ==============================================================================
# DEGV'S MESSENGER - ORACLE CLOUD ALWAYS FREE 24/7 AUTO-DEPLOY SCRIPT
# Architecture: Ampere A1 (ARM64 - 4 OCPU / 24GB RAM) or AMD Micro (x86_64)
# OS: Ubuntu 22.04 / 24.04 LTS / Oracle Linux 8 & 9
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
AMBER='\033[0;33m'
NC='\033[0m'

echo -e "${CYAN}====================================================================${NC}"
echo -e "${GREEN} 🚀 DEGV'S MESSENGER - DESPLIEGUE CONTINUO 24/7 EN ORACLE CLOUD ALWAYS FREE ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# 1. Detect OS and update packages
echo -e "${AMBER}📦 [1/6] Actualizando sistema operativo e instalando dependencias base...${NC}"
if [ -f /etc/debian_version ]; then
  sudo apt-get update -y && sudo apt-get upgrade -y
  sudo apt-get install -y curl git nginx build-essential ufw netfilter-persistent
elif [ -f /etc/oracle-release ] || [ -f /etc/redhat-release ]; then
  sudo dnf update -y
  sudo dnf install -y curl git nginx gcc gcc-c++ make firewalld
fi

# 2. Install Node.js 20 LTS and Global Build Tools
echo -e "${AMBER}⚡ [2/6] Instalando Node.js 20.x LTS y gestor de procesos PM2...${NC}"
if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs || sudo dnf install -y nodejs
fi

sudo npm install -g pm2 tsx vite esbuild

# 3. Configure Firewall (OCI VCN Ingress Rules + local iptables/UFW)
echo -e "${AMBER}🛡️ [3/6] Abriendo puertos 80, 443 y 3000 en el Firewall de Linux...${NC}"
if command -v ufw > /dev/null; then
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw allow 3000/tcp || true
  sudo ufw --force enable || true
fi

# OCI specific iptables rules for Oracle Linux & Ubuntu on OCI
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
sudo netfilter-persistent save 2>/dev/null || true

# 4. Clone or update repository
echo -e "${AMBER}📂 [4/6] Configurando código fuente de Degv's Messenger en /opt/degvs-messenger...${NC}"
APP_DIR="/opt/degvs-messenger"
if [ ! -d "$APP_DIR" ]; then
  sudo git clone https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git "$APP_DIR"
  sudo chown -R $USER:$USER "$APP_DIR"
else
  cd "$APP_DIR"
  git pull origin main || true
fi

cd "$APP_DIR"
echo -e "${AMBER}📦 [4b/6] Instalando módulos y compilando servidor de producción...${NC}"
npm install --legacy-peer-deps
npm run build

# 5. Start with PM2 with 24/7 zero-downtime auto-restart
echo -e "${AMBER}⚡ [5/6] Configurando proceso PM2 permanente (Auto-reinicio 24/7 al reiniciar la VM)...${NC}"
pm2 delete degvs-messenger 2>/dev/null || true
pm2 start "npm run start" --name "degvs-messenger" --max-memory-restart 1800M
pm2 save
pm2 startup | tail -n 1 | sudo bash 2>/dev/null || true

# 6. Configure Nginx Reverse Proxy with WebSocket support
echo -e "${AMBER}🌐 [6/6] Configurando Nginx Reverse Proxy y soporte WebSockets 24/7...${NC}"
NGINX_CONF="/etc/nginx/sites-available/degvs-messenger"
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx || sudo service nginx restart

PUBLIC_IP=$(curl -s ifconfig.me || echo "tu-ip-oracle")

echo -e "${CYAN}====================================================================${NC}"
echo -e "${GREEN} 🎉 ¡DESPLIEGUE EXITOSO EN ORACLE CLOUD ALWAYS FREE!${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo -e "📡 Tu servidor Degv's Messenger está operando 24 horas al día de forma ininterrumpida."
echo -e "🔗 URL Pública de Acceso: ${GREEN}http://${PUBLIC_IP}${NC}"
echo -e "🔌 WebSocket Endpoint:     ${GREEN}ws://${PUBLIC_IP}/ws${NC}"
echo -e "📊 API de Telemetría:      ${GREEN}http://${PUBLIC_IP}/api/oracle/status${NC}"
echo -e "${CYAN}====================================================================${NC}"
