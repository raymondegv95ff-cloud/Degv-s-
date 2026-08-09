import React from "react";
import { Smartphone, X, Terminal, CheckCircle2, Download } from "lucide-react";

interface AndroidGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidGuideModal: React.FC<AndroidGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 rounded-2xl bg-[#00E676]/20 text-[#00E676]">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">Exportar a App Nativa Android / Capacitor</h2>
            <p className="text-xs text-slate-400">Guía paso a paso para empaquetar Degv's Messenger en APK</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-[#00E676] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 1. Instalar Capacitor CLI
            </h3>
            <p className="text-slate-300 text-[11px]">Ejecuta en tu terminal:</p>
            <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 select-all border border-slate-800">
              npm install @capacitor/core @capacitor/cli @capacitor/android
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-[#00E676] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 2. Inicializar Proyecto Capacitor
            </h3>
            <p className="text-slate-300 text-[11px]">Genera el archivo capacitor.config.json:</p>
            <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 select-all border border-slate-800">
              npx cap init "Degv's Messenger" "com.degv.messenger" --web-dir dist
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-[#00E676] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 3. Compilar Build Web y Añadir Android
            </h3>
            <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 select-all border border-slate-800">
              npm run build && npx cap add android && npx cap copy
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-[#00E676] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 4. Abrir en Android Studio y Generar APK
            </h3>
            <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 select-all border border-slate-800">
              npx cap open android
            </div>
            <p className="text-slate-400 text-[11px]">
              En Android Studio presiona <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> para obtener tu archivo .apk listo para instalar en cualquier teléfono.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#00E676] text-slate-950 font-extrabold text-xs hover:bg-[#00E676]/90 transition"
        >
          Entendido, cerrar guía
        </button>
      </div>
    </div>
  );
};
