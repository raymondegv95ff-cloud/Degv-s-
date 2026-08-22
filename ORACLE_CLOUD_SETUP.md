# 🌐 Guía de Integración: Oracle Cloud Always Free 24/7 para Degv's Messenger

Esta guía describe cómo desplegar y conectar **Degv's Messenger** a tu máquina virtual gratuita permanente (**Always Free**) de **Oracle Cloud Infrastructure (OCI)** para garantizar **tránsito de datos continuo, sincronización de mensajería y WebSockets activos las 24 horas del día sin interrupciones**.

---

## 💎 Beneficios del Nivel "Always Free" de Oracle Cloud:
1. **Instancias Ampere A1 (ARM64)**: Hasta **4 OCPUs y 24 GB de RAM** 100% gratuitos para siempre (o 2 instancias AMD Micro).
2. **Almacenamiento en Bloque**: **200 GB** de disco SSD NVMe gratuito.
3. **Tránsito de Datos Gratuito**: **10 TB de transferencia de salida mensual** (10,000 GB).
4. **Dirección IP Pública Fija Gratuita**.
5. **Operación Continua 24/7**: Sin apagados automáticos ni límite de horas al día.

---

## 🚀 Despliegue Rápido en 1 Solo Paso (Auto-Deploy Script)

En tu consola SSH de Oracle Cloud (Ubuntu o Oracle Linux), ejecuta el siguiente comando:

```bash
curl -sSL https://raw.githubusercontent.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/main/oracle-cloud-deploy.sh | bash
```

Este script automático realiza:
- ✅ Actualización del sistema operativo y paquetes necesarios.
- ✅ Instalación de Node.js 20 LTS, PM2, Nginx y herramientas de compilación.
- ✅ Apertura de puertos de red en el firewall (`ufw` e `iptables`).
- ✅ Descarga del código fuente de Degv's Messenger.
- ✅ Compilación y arranque del servicio con **PM2** (con auto-inicio en arranque `pm2 startup`).
- ✅ Configuración de **Nginx Reverse Proxy** con soporte de WebSockets y timeouts extendidos de 24 horas.

---

## 🛡️ Configuración de Seguridad en la Consola de Oracle Cloud (VCN Ingress Rules)

Para permitir el tráfico hacia tu servidor desde cualquier parte del mundo:

1. Ve a **Networking > Virtual Cloud Networks (VCN)** en la consola de Oracle Cloud.
2. Selecciona tu VCN y haz clic en **Default Security List for vcn-...**.
3. Haz clic en **Add Ingress Rules** y añade las siguientes reglas:
   - **CIDR de Origen**: `0.0.0.0/0`
   - **Protocolo**: `TCP`
   - **Destination Port Range**: `80, 443, 3000`
4. Guarda las reglas.

---

## 🔗 Conectar la App al Servidor de Oracle Cloud

1. Abre **Degv's Messenger**.
2. Presiona el botón **Oracle Cloud 24/7** en la cabecera lateral o en **Ajustes ⚙️ > Oracle Cloud Always Free**.
3. Ingresa la **IP Pública** o tu dominio (ej: `http://129.153.x.x` o `https://tu-dominio.duckdns.org`).
4. Haz clic en **"Probar Conexión y Optimizar Tránsito"**.
5. La app comenzará a enrutar las llamadas, WebSockets y sincronización en segundo plano a través de tu nodo de Oracle Cloud las 24 horas del día.
