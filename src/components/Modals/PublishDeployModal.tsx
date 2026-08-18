import React, { useState } from "react";
import {
  X,
  Globe,
  Github,
  Flame,
  Layers,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Copy,
  Terminal,
  Download,
  Share2,
  Boxes,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Cpu,
  FolderGit2,
  Radio,
  Play,
  Settings2,
  CloudLightning,
} from "lucide-react";

interface PublishDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlatformUpdate?: () => void;
}

type TabType = "all" | "github_antigravity" | "appflow" | "termux" | "capacitor" | "bubblewrap" | "pwabuilder" | "vercel" | "firebase";

export const PublishDeployModal: React.FC<PublishDeployModalProps> = ({
  isOpen,
  onClose,
  onOpenPlatformUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customRepoUrl, setCustomRepoUrl] = useState<string>("https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git");

  if (!isOpen) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "https://degvs-messenger.web.app";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const platforms = [
    {
      id: "github_antigravity",
      name: "Enlace Directo con GitHub & Repositorio Oficial",
      category: "GitHub & AI Engine",
      icon: <FolderGit2 className="w-5 h-5 text-emerald-400" />,
      tag: "CI/CD & APK Automático",
      tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      description:
        "Repositorio oficial configurado: raymondegv95ff-cloud/Degv-s-Messenger-APK con pipelines automáticos de compilación de APK en GitHub Actions y despliegue a GitHub Pages.",
      actionText: "Ver Repositorio en GitHub",
      actionUrl: "https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK",
      command: `gh repo clone raymondegv95ff-cloud/Degv-s-Messenger-APK\ncd Degv-s-Messenger-APK\n./sync-github.sh https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git`,
      steps: [
        "Repositorio configurado: https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK",
        "Clona el repositorio en cualquier entorno con: 'gh repo clone raymondegv95ff-cloud/Degv-s-Messenger-APK'",
        "Ejecuta './sync-github.sh' para sincronizar todos los ficheros (Capacitor, Appflow, Termux, Workflows) con un solo clic.",
        "GitHub Actions compilará automáticamente el APK de Android (.github/workflows/build-apk.yml) en cada push.",
      ],
      details: "Archivos vinculados: .github/workflows/build-apk.yml, .github/workflows/deploy-pages.yml, sync-github.sh, README.md",
    },
    {
      id: "appflow",
      name: "Ionic Appflow (Compilación Cloud Android & Live Updates)",
      category: "Ionic Cloud CI/CD & Deploy",
      icon: <CloudLightning className="w-5 h-5 text-cyan-400" />,
      tag: "Compilación Cloud APK/AAB",
      tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      description:
        "Compila APK y AAB de Android directamente en la nube de Ionic Appflow y publica actualizaciones en vivo sin pasar por la revisión de Google Play Store.",
      actionText: "Ionic Appflow Dashboard",
      actionUrl: "https://dashboard.ionicframework.com/",
      command: `npm install -g @ionic/cli\nionic login\nionic link --id com.degv.messenger\nnpm run appflow:build\nionic deploy build --channel=Production`,
      steps: [
        "Inicia sesión en Ionic Appflow Dashboard e importa este repositorio de Git (GitHub / GitLab).",
        "Appflow detectará automáticamente la configuración de Capacitor, ionic.config.json y appflow.json.",
        "En 'Package (Native Builds)', selecciona Android y el build type (Debug APK para pruebas directas o Release AAB para Google Play).",
        "Usa 'ionic deploy build --channel=Production' para enviar Live Updates instantáneas a los usuarios en segundo plano sin recompilar el APK.",
      ],
      details: "Archivos listos: ionic.config.json, appflow.json, capacitor.config.json, android/app/build.gradle, appflow-build.sh, appflow-sync.sh, APPFLOW.md",
    },
    {
      id: "termux",
      name: "Termux (Ejecución Nativa en Android)",
      category: "Android Linux CLI",
      icon: <Terminal className="w-5 h-5 text-[#00E676]" />,
      tag: "100% en el Móvil",
      tagColor: "bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40",
      description:
        "Ejecuta el servidor y la app completamente dentro de Android usando Termux, con permisos de almacenamiento, wake-lock en segundo plano y notificaciones.",
      actionText: "Descargar Termux (F-Droid)",
      actionUrl: "https://f-droid.org/packages/com.termux/",
      command: `pkg update -y && pkg install -y git nodejs-lts\nchmod +x termux-install.sh termux-start.sh\n./termux-install.sh\n./termux-start.sh`,
      steps: [
        "Abre Termux en tu teléfono Android.",
        "Ejecuta './termux-install.sh' para configurar Node.js, dependencias y permisos de almacenamiento (termux-setup-storage).",
        "Ejecuta './termux-start.sh' para arrancar el servidor con Wake-Lock (CPU activa sin apagarse en segundo plano).",
        "Accede desde cualquier navegador en http://localhost:3000 o mediante la IP de tu red Wi-Fi.",
      ],
      details: "Scripts listos: termux-start.sh, termux-install.sh (permisos de almacenamiento, wake-lock, nodejs, network)",
    },
    {
      id: "capacitor",
      name: "Capacitor Nativo (APK con Todos los Permisos)",
      category: "Android Studio & APK",
      icon: <Boxes className="w-5 h-5 text-cyan-400" />,
      tag: "APK Nativo Android",
      tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      description:
        "Compila la aplicación en un APK nativo de Android con acceso total a cámara, micrófono, biometría, geolocalización y notificaciones push.",
      actionText: "Android Developers",
      actionUrl: "https://developer.android.com/studio",
      command: `chmod +x setup-capacitor.sh\n./setup-capacitor.sh\nnpx cap open android`,
      steps: [
        "Ejecuta './setup-capacitor.sh' para sincronizar los archivos web compilados con el proyecto Android.",
        "Abre el proyecto en Android Studio con 'npx cap open android'.",
        "Compila el APK con Build > Build Bundle(s) / APK(s) > Build APK(s) o en terminal con './gradlew assembleDebug'.",
        "Todos los permisos (cámara, audio, storage, gps, biometría, bluetooth) están configurados en android/app/src/main/AndroidManifest.xml.",
      ],
      details: "Configuraciones listas: capacitor.config.json, capacitor.config.ts, android/app/src/main/AndroidManifest.xml",
    },
    {
      id: "bubblewrap",
      name: "Bubblewrap (TWA para Google Play Store)",
      category: "Google Play TWA",
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
      tag: "Listo para Google Play",
      tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      description:
        "Genera un archivo .AAB / .APK firmado y optimizado mediante Trusted Web Activity (TWA) listo para subir a Google Play Console.",
      actionText: "Google Play Console",
      actionUrl: "https://play.google.com/console",
      command: `chmod +x build-twa.sh\n./build-twa.sh`,
      steps: [
        "Ejecuta './build-twa.sh' en tu terminal.",
        "Bubblewrap generará el APK / AAB firmado automáticamente usando 'twa-manifest.json' y 'bubblewrap.json'.",
        "Sube el archivo '.aab' generado directamente a tu cuenta de desarrollador en Google Play Console.",
      ],
      details: "Archivos listos: twa-manifest.json, bubblewrap.json, build-twa.sh",
    },
    {
      id: "pwabuilder",
      name: "PWA Builder (Generador Rápido de APK en la Nube)",
      category: "Generador Web de APK",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: "Sin Instalar Nada",
      tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      description:
        "Convierte la app al instante en APK firmado para Android directamente desde tu navegador sin instalar herramientas locales.",
      actionText: "Abrir en PWA Builder",
      actionUrl: `https://www.pwabuilder.com/?url=${encodeURIComponent(currentUrl)}`,
      command: `npx @pwabuilder/pwa-starter`,
      steps: [
        "Ingresa en PWABuilder.com con la URL de tu aplicación.",
        "Haz clic en 'Package for Stores' y selecciona 'Android'.",
        "Descarga el paquete APK / AAB listo para instalar o distribuir.",
      ],
      details: "Compatible con el manifest PWA enriquecido (/manifest.json) y Service Worker offline (/sw.js).",
    },
    {
      id: "vercel",
      name: "Vercel Cloud",
      category: "Hosting Global",
      icon: <Globe className="w-5 h-5 text-white" />,
      tag: "Deploy en 1 Click",
      tagColor: "bg-white/10 text-white border-white/20",
      description:
        "Despliega y escala la app globalmente con CDN ultrarrápido, SSL automático y soporte de dominio personalizado.",
      actionText: "Desplegar en Vercel",
      actionUrl: "https://vercel.com/new",
      command: "npm i -g vercel && vercel --prod",
      steps: [
        "Instala Vercel CLI o conecta tu repositorio de GitHub.",
        "Ejecuta 'vercel' en la raíz del proyecto para desplegar en segundos.",
      ],
      details: "Variables de entorno y routing SPA preconfigurados.",
    },
    {
      id: "firebase",
      name: "Firebase Hosting & Google Cloud",
      category: "Google Cloud Services",
      icon: <Flame className="w-5 h-5 text-orange-400" />,
      tag: "Base de Datos & Hosting",
      tagColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      description:
        "Alojamiento de alto rendimiento y sincronización en tiempo real con Firestore y autenticación Google Cloud.",
      actionText: "Consola de Firebase",
      actionUrl: "https://console.firebase.google.com/",
      command: "npm install -g firebase-tools\nfirebase login\nfirebase deploy --only hosting",
      steps: [
        "Inicia sesión con Firebase CLI: 'firebase login'",
        "Ejecuta 'firebase deploy' para publicar tu versión en la infraestructura de Google.",
      ],
      details: "Configuraciones en: firebase-applet-config.json, firestore.rules",
    },
  ];

  const filteredPlatforms =
    activeTab === "all"
      ? platforms
      : platforms.filter((p) => p.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#00E676]/20 via-cyan-500/20 to-indigo-500/20 border border-[#00E676]/30 text-[#00E676]">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tight text-white flex items-center gap-2">
              GitHub, Antigravity, Termux & Compilación APK
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                Multi-Plataforma
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Enlace directo con GitHub, motor Google Antigravity, ejecución en Termux y paquetes nativos con Capacitor y Bubblewrap.
            </p>
          </div>
        </div>

        {/* Quick App URL Bar */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold">URL de la App Web / PWA</p>
              <p className="text-xs font-mono text-slate-200 truncate">{currentUrl}</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(currentUrl, "url")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition shrink-0"
          >
            {copiedId === "url" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                <span className="text-[#00E676]">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </button>
        </div>

        {/* Cross-Platform Sync and Link Hub Action Bar */}
        {onOpenPlatformUpdate && (
          <div className="p-3 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 rounded-2xl border border-[#00E676]/30 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#00E676]/20 text-[#00E676]">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Sincronizador Universal Multi-Plataforma</p>
                <p className="text-[10px] text-slate-400">Enlaza y optimiza Web, PWA, Android APK, TWA, Termux y GitHub al actualizar</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPlatformUpdate();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 text-xs font-black flex items-center gap-1.5 transition shrink-0 shadow-lg shadow-[#00E676]/20"
            >
              <span>Centro de Actualización</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          {[
            { id: "all", label: "Todos los Destinos" },
            { id: "github_antigravity", label: "🐙 GitHub & Antigravity" },
            { id: "appflow", label: "☁️ Ionic Appflow" },
            { id: "termux", label: "📱 Termux (Android)" },
            { id: "capacitor", label: "⚡ Capacitor APK" },
            { id: "bubblewrap", label: "🌐 Bubblewrap (TWA)" },
            { id: "pwabuilder", label: "PWA Builder" },
            { id: "vercel", label: "Vercel" },
            { id: "firebase", label: "Firebase" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                activeTab === tab.id
                  ? "bg-[#00E676] text-slate-950 font-black shadow-md shadow-[#00E676]/20"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Platforms List */}
        <div className="space-y-4">
          {filteredPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    {platform.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-100">{platform.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${platform.tagColor}`}>
                        {platform.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{platform.description}</p>
                  </div>
                </div>

                {platform.actionUrl !== "#" && (
                  <a
                    href={platform.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <span>{platform.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Extra Details Banner */}
              {platform.details && (
                <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] text-cyan-300/90 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{platform.details}</span>
                </div>
              )}

              {/* Steps */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-300">Guía y ejecución paso a paso:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                  {platform.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Commands Snippet */}
              {platform.command && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-[#00E676]" /> Comandos de Terminal / Scripts Listos
                    </span>
                    <button
                      onClick={() => copyToClipboard(platform.command, platform.id)}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedId === platform.id ? (
                        <span className="text-[#00E676] font-bold">¡Copiado!</span>
                      ) : (
                        <span>Copiar código</span>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-black rounded-xl font-mono text-[11px] text-emerald-400 select-all border border-slate-800 whitespace-pre-wrap">
                    {platform.command}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Motor Google Antigravity • Permisos Android 100% Configurados • Termux, Capacitor & Bubblewrap</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
