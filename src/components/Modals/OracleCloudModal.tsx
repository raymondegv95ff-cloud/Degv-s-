import React, { useState, useEffect } from "react";
import {
  Cloud,
  X,
  Zap,
  Activity,
  Server,
  ShieldCheck,
  Cpu,
  HardDrive,
  Network,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Terminal,
  Clock,
  Wifi,
  Sparkles,
  Layers,
  Download,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { oracleCloudService } from "../../services/oracleCloudService";
import { OracleCloudConfig, OracleCloudNodeStatus } from "../../types";

interface OracleCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OracleCloudModal: React.FC<OracleCloudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"monitor" | "config" | "guide" | "docker">("monitor");
  const [nodeStatus, setNodeStatus] = useState<OracleCloudNodeStatus | null>(null);
  const [config, setConfig] = useState<OracleCloudConfig>(oracleCloudService.getConfig());
  const [customEndpointInput, setCustomEndpointInput] = useState<string>(config.customEndpoint || "");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentConf = oracleCloudService.loadConfig();
    setConfig(currentConf);
    setCustomEndpointInput(currentConf.customEndpoint || "");

    const unsub = oracleCloudService.subscribe((status) => {
      setNodeStatus(status);
    });

    oracleCloudService.refreshStatus();

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setSyncNotice(null);
    const result = await oracleCloudService.testLatency();
    setIsPinging(false);
    if (result.success) {
      setSyncNotice(`✅ Latencia 24/7 verificada: ${result.latencyMs} ms (Excelente tránsito de datos)`);
    } else {
      setSyncNotice(`⚠️ Resultado: ${result.latencyMs} ms (${result.error || "Aviso de red"})`);
    }
  };

  const handleOptimizeTransit = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    const result = await oracleCloudService.syncDataTransit({ action: "manual_optimize_24h" });
    setIsSyncing(false);
    setSyncNotice(`⚡ ${result.message} (Latencia: ${result.latencyMs} ms)`);
  };

  const handleSaveConfig = () => {
    const updated = oracleCloudService.saveConfig({
      customEndpoint: customEndpointInput.trim(),
      enabled: config.enabled,
      region: config.region,
      architecture: config.architecture,
      keepAliveHeartbeat: config.keepAliveHeartbeat,
      autoRelay24h: config.autoRelay24h,
    });
    setConfig(updated);
    setSyncNotice("💾 Configuración de Oracle Cloud Always Free guardada correctamente.");
    oracleCloudService.refreshStatus();
  };

  const handleDownloadScript = () => {
    const script = oracleCloudService.getDeployScript();
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oracle-cloud-deploy.sh";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const oneLinerCommand = "curl -sSL https://raw.githubusercontent.com/raymondegv95ff-cloud/Degv-s-Messenger-APK/main/oracle-cloud-deploy.sh | bash";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#080d1a] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <Cloud className="w-6 h-6 animate-pulse text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black bg-gradient-to-r from-white via-cyan-200 to-emerald-400 bg-clip-text text-transparent">
                  Oracle Cloud Always Free
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 uppercase tracking-wider">
                  24/7 ACTIVO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optimización de tránsito de datos, baja latencia y relay continuo las 24 horas del día.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950/70 border-b border-white/5 overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "monitor"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Monitor en Vivo 24/7</span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "config"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuración de Enlace</span>
          </button>

          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "guide"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Guía Despliegue OCI (1-Paso)</span>
          </button>

          <button
            onClick={() => setActiveTab("docker")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === "docker"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Docker & PM2</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 text-sm">
          
          {/* Notification Banner if any action occurred */}
          {syncNotice && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between shadow-lg">
              <span className="font-medium">{syncNotice}</span>
              <button
                onClick={() => setSyncNotice(null)}
                className="text-cyan-400 hover:text-white text-xs underline font-bold ml-2"
              >
                Ocultar
              </button>
            </div>
          )}

          {/* TAB 1: MONITOR EN VIVO 24/7 */}
          {activeTab === "monitor" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* OCI Free Tier Specs Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Uptime 24/7</span>
                  </div>
                  <p className="text-base font-black text-emerald-300">
                    {nodeStatus?.uptimePercentage || "99.99%"}
                  </p>
                  <p className="text-[10px] text-slate-400">Sin interrupciones</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>Latencia Tránsito</span>
                  </div>
                  <p className="text-base font-black text-cyan-300">
                    {nodeStatus?.latencyMs || 15} ms
                  </p>
                  <p className="text-[10px] text-slate-400">Tránsito ultra rápido</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Compute Specs</span>
                  </div>
                  <p className="text-base font-black text-amber-300">
                    {nodeStatus?.ocpus || 4} OCPU / {nodeStatus?.ramGb || 24}GB
                  </p>
                  <p className="text-[10px] text-slate-400">Ampere A1 ARM64</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span>Tránsito Gratuito</span>
                  </div>
                  <p className="text-base font-black text-purple-300">
                    10 TB / mes
                  </p>
                  <p className="text-[10px] text-slate-400">10,000 GB de salida</p>
                </div>
              </div>

              {/* Live Status & 24/7 Relay Engine Details */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00E676]" />
                    <span className="font-extrabold text-sm text-slate-100">
                      Motor de Tránsito Permanente Oracle Cloud
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                    {nodeStatus?.publicEndpoint || "https://oci.degvs.app"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Degv's Messenger utiliza la infraestructura Always Free de Oracle Cloud para enrutar paquetes en tiempo real, señalización WebRTC, notas de voz y colas de IndexedDB. Esto permite operar las <strong>24 horas del día</strong> sin consumir cuotas de servicios de terceros y evitando interrupciones por optimizadores de batería en Android.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Keep-Alive Heartbeat activo (cada 45 seg)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WebSockets bidireccionales persistentes</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sincronización automática de cola fuera de línea</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Protección de cuota diaria (Zero Quota Loss)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleOptimizeTransit}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(0,229,255,0.3)] transition active:scale-95 disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${isSyncing ? "animate-spin text-slate-900" : ""}`} />
                  <span>{isSyncing ? "Optimizando Tránsito..." : "Optimizar Tránsito 24/7 Ahora"}</span>
                </button>

                <button
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isPinging ? "animate-spin" : ""}`} />
                  <span>Test de Latencia (Ping)</span>
                </button>

                <button
                  onClick={handleDownloadScript}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition active:scale-95 ml-auto"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Descargar Deploy Script</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURACIÓN DE ENLACE */}
          {activeTab === "config" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Enlace a tu Servidor Dedicado Oracle Cloud Always Free</span>
                </h3>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-semibold block">
                    Dirección IP Pública o Dominio de tu Instancia OCI:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customEndpointInput}
                      onChange={(e) => setCustomEndpointInput(e.target.value)}
                      placeholder="Ej: http://129.153.84.120 o https://mi-nodo-oracle.duckdns.org"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black text-xs shadow-lg transition"
                    >
                      Guardar
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * Si se deja en blanco, la app usará el túnel y proxy local predeterminado de Degv's Messenger.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-xs font-bold text-slate-200 block mb-1">Región OCI Seleccionada:</span>
                    <select
                      value={config.region}
                      onChange={(e) => setConfig({ ...config, region: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-300"
                    >
                      <option value="sa-saopaulo-1">Sudamérica (São Paulo - sa-saopaulo-1)</option>
                      <option value="sa-santiago-1">Sudamérica (Santiago - sa-santiago-1)</option>
                      <option value="sa-bogota-1">Sudamérica (Bogotá - sa-bogota-1)</option>
                      <option value="us-ashburn-1">Norteamérica (US East - Ashburn)</option>
                      <option value="us-phoenix-1">Norteamérica (US West - Phoenix)</option>
                      <option value="eu-frankfurt-1">Europa (Frankfurt - eu-frankfurt-1)</option>
                      <option value="eu-madrid-1">Europa (Madrid - eu-madrid-1)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-xs font-bold text-slate-200 block mb-1">Arquitectura OCI Compute:</span>
                    <select
                      value={config.architecture}
                      onChange={(e) => setConfig({ ...config, architecture: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-300"
                    >
                      <option value="ampere_arm64">Ampere A1 (ARM64) - 4 OCPUs / 24 GB RAM (Recomendado)</option>
                      <option value="amd64">AMD Micro (x86_64) - 1/8 OCPU / 1 GB RAM</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="keepalive-toggle"
                      checked={config.keepAliveHeartbeat}
                      onChange={(e) => setConfig({ ...config, keepAliveHeartbeat: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-0"
                    />
                    <label htmlFor="keepalive-toggle" className="text-xs text-slate-200 cursor-pointer">
                      Activar Heartbeat Keep-Alive continuo para Android / PWA
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUÍA DE DESPLIEGUE EN 1 PASO */}
          {activeTab === "guide" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-extrabold text-sm text-cyan-200">
                    Comando de Auto-Despliegue OCI (1 Solo Paso)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Copia y pega este comando en la terminal SSH de tu máquina virtual de Oracle Cloud (Ubuntu o Oracle Linux). Instala automáticamente Node 20, PM2, Nginx y arranca el servidor 24/7:
                </p>

                <div className="relative group">
                  <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto pr-16 select-all">
                    {oneLinerCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(oneLinerCommand, "oneliner")}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 transition shadow"
                  >
                    {copiedKey === "oneliner" ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3 Step Visual Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-400/40">
                    1
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-100">Crear Instancia VM</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    En la consola de Oracle Cloud crea una instancia <strong>Always Free</strong> con forma <strong>VM.Standard.A1.Flex (Ampere ARM)</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-400/40">
                    2
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-100">Abrir Puertos VCN</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    En <strong>Security Lists</strong> añade reglas de entrada TCP para los puertos <strong>80, 443 y 3000</strong> desde cualquier IP (0.0.0.0/0).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-400/40">
                    3
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-100">Ejecutar y Conectar</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pega el script en SSH y luego pon tu IP pública en la pestaña <strong>Configuración de Enlace</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCKER & PM2 */}
          {activeTab === "docker" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Despliegue con Docker Compose en Oracle Cloud</span>
                  </h4>
                  <button
                    onClick={() => copyToClipboard(`docker compose -f docker-compose.oracle.yml up -d`, "docker-cmd")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center gap-1 border border-white/10"
                  >
                    {copiedKey === "docker-cmd" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar Comando</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Si prefieres contenedores Docker en tu VM de Oracle Cloud Always Free, ejecuta:
                </p>

                <pre className="p-3 rounded-xl bg-slate-900 font-mono text-xs text-emerald-300 overflow-x-auto border border-white/5">
                  {`# 1. Clonar el repositorio
git clone https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git /opt/degvs-messenger
cd /opt/degvs-messenger

# 2. Levantar con Docker Compose en modo desacoplado 24/7
docker compose -f docker-compose.oracle.yml up -d --build`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tier Permanente Gratuito OCI (Sin Costo 24/7)</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Entendido y Listo
          </button>
        </div>

      </div>
    </div>
  );
};
