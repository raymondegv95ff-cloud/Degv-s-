import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  X,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Download,
  Terminal,
  Copy,
  Check,
  Zap,
  Boxes,
  Smartphone,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { githubActionsService, GitHubSyncResult } from "../../services/githubActionsService";

interface GitHubActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubActionsModal: React.FC<GitHubActionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<GitHubSyncResult | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [syncStepIndex, setSyncStepIndex] = useState<number>(-1);

  const steps = [
    { name: "Verificando rama 'main' y repositorio oficial", detail: "raymondegv95ff-cloud/Degv-s-Messenger-APK" },
    { name: "Reajustando workflows de GitHub Actions", detail: "build-apk.yml, deploy.yml, ionic-appflow-build.yml" },
    { name: "Validando scripts de compilación Gradle y Web", detail: "Java 17, Gradle 8.7, Android SDK 34 y Vite Build" },
    { name: "Enlazando artefactos de descarga y pipelines", detail: "degvs-messenger-debug-apk y degvs-messenger-dist" },
  ];

  const handleTriggerSync = async () => {
    setIsLoading(true);
    setSyncResult(null);

    for (let i = 0; i < steps.length; i++) {
      setSyncStepIndex(i);
      await new Promise((r) => setTimeout(r, 280));
    }

    const result = await githubActionsService.triggerSyncAndRealign();
    setSyncResult(result);
    setIsLoading(false);
    setSyncStepIndex(-1);
  };

  const cloneCommand = `git clone https://github.com/raymondegv95ff-cloud/Degv-s-Messenger-APK.git\ncd Degv-s-Messenger-APK\nnpm install\nnpm run build`;

  const copyCommandToClipboard = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#00E676] shadow-lg shadow-emerald-500/20">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>GitHub Actions & CI/CD Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  Rama Main
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">raymondegv95ff-cloud/Degv-s-Messenger-APK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Action Button */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-950 to-cyan-950/60 border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00E676]" />
              Sincronización Automática
            </span>
            <span className="text-[10px] font-mono text-slate-400">100% Funcional</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Actualiza, enlaza y reajusta la app en GitHub Actions para compilar el APK de Android y el paquete web sin errores.
          </p>

          <button
            onClick={handleTriggerSync}
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2.5 transition shadow-xl active:scale-98 ${
              isLoading
                ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                : "bg-gradient-to-r from-[#00E676] via-[#00F0FF] to-[#00B248] text-slate-950 hover:opacity-95 shadow-[#00E676]/20 font-black"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>
              {isLoading
                ? "Actualizando y Reajustando en GitHub Actions..."
                : "Actualizar, Enlazar y Reajustar en GitHub Actions"}
            </span>
          </button>
        </div>

        {/* Step Progression Animation */}
        {isLoading && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 animate-in fade-in">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2.5 text-xs transition-all ${
                  idx === syncStepIndex
                    ? "text-[#00E676] font-bold"
                    : idx < syncStepIndex
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                {idx < syncStepIndex ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                ) : idx === syncStepIndex ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00E676]" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                )}
                <div>
                  <p>{step.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sync Success Result Details */}
        {syncResult && !isLoading && (
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-xs animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-400 font-black">
              <CheckCircle2 className="w-4 h-4" />
              <span>{syncResult.message}</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-emerald-900/40">
              {syncResult.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-300">
                  <span className="text-[#00E676] font-bold">✓</span>
                  <div>
                    <span className="font-bold text-slate-200">{c.name}: </span>
                    <span className="text-slate-400 text-[11px]">{c.details}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions Links */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <a
                href={syncResult.workflowRunsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-950 border border-emerald-500/40 hover:bg-emerald-950/60 text-emerald-300 font-bold text-center flex items-center justify-center gap-1.5 transition"
              >
                <span>Ver en GitHub Actions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={syncResult.directApkDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#00E676] text-slate-950 font-black text-center flex items-center justify-center gap-1.5 hover:bg-[#00E676]/90 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar APK</span>
              </a>
            </div>
          </div>
        )}

        {/* Workflows Included in the Repository */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Pipelines Automatizados en .github/workflows/</span>
          </h3>
          <div className="space-y-1.5">
            {[
              {
                file: ".github/workflows/build-apk.yml",
                title: "Compilación APK Android Nativo",
                desc: "Java 17, Gradle 8.7, Android SDK 34 -> genera degvs-messenger-debug-apk",
              },
              {
                file: ".github/workflows/deploy.yml",
                title: "Despliegue y Validación Web/PWA",
                desc: "Valida integridad, construye Vite SPA y empaqueta degvs-messenger-dist",
              },
              {
                file: ".github/workflows/ionic-appflow-build.yml",
                title: "Ionic Appflow & Live Updates",
                desc: "Enlace directo con Appflow Cloud y canales Production/Staging",
              },
              {
                file: ".github/workflows/deploy-pages.yml",
                title: "GitHub Pages Hosting",
                desc: "Publicación web automática con HTTPS y soporte PWA",
              },
            ].map((wf, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-200">{wf.title}</p>
                  <p className="text-[10px] font-mono text-emerald-400">{wf.file}</p>
                  <p className="text-[10px] text-slate-400">{wf.desc}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>

        {/* CLI Clone & Sync Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Comando para clonar y compilar localmente
            </span>
            <button
              onClick={copyCommandToClipboard}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {copiedCmd ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
          <pre className="text-[10px] font-mono text-slate-300 bg-slate-900/90 p-2.5 rounded-xl overflow-x-auto border border-white/5">
            {cloneCommand}
          </pre>
        </div>
      </div>
    </div>
  );
};
