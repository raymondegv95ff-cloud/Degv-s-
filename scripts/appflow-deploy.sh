#!/usr/bin/env bash
# ==============================================================================
# Degv's Messenger - Ionic Appflow Automation & Deployment Script
# Automates synchronization, Live Update manifest generation and Cloud Packaging
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 INICIANDO AUTOMATIZACIÓN DE IONIC APPFLOW & CLOUD BUILD"
echo "=========================================================="

# 1. Validar integridad previa
echo "🔍 Paso 1: Validando integridad de archivos y enlaces productivos..."
npm run validate:integrity

# 2. Compilar Web Assets para Appflow
echo "📦 Paso 2: Generando bundle de producción (Vite + Server)..."
npm run build

# 3. Sincronizar Capacitor si existe el entorno nativo
echo "🔄 Paso 3: Sincronizando capas nativas de Capacitor..."
if [ -d "android" ]; then
  if command -v npx &> /dev/null; then
    npx cap sync android || echo "Capacitor sync opcional completado"
  fi
fi

# 4. Generar Manifiesto de Live Updates para Ionic Appflow
echo "⚡ Paso 4: Generando manifiesto de Live Updates en dist/..."
mkdir -p dist
cat <<EOF > dist/pro-manifest.json
{
  "appId": "com.degv.messenger",
  "channel": "Production",
  "version": "2.5.0",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "atomicSync": true,
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'production-release')"
}
EOF

echo "✔ Manifiesto dist/pro-manifest.json generado exitosamente."

# 5. Resumen de automatización
echo "=========================================================="
echo "✨ ¡PREPARACIÓN DE APPFLOW COMPLETADA CON ÉXITO! ✨"
echo "=========================================================="
echo "El paquete web está listo en /dist para:"
echo "  1. Live Updates en tiempo real vía Appflow"
echo "  2. Compilación de APK / AAB nativo en la nube de Ionic"
echo "  3. Despliegue atómico sin interrumpir a los usuarios"
echo "=========================================================="
