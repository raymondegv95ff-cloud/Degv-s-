import React, { useState, useRef } from "react";
import { storageService } from "../../services/storageService";
import {
  ShieldCheck,
  Download,
  Upload,
  Lock,
  KeyRound,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Database,
  Sparkles,
} from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onBackupRestored,
}) => {
  const [password, setPassword] = useState("DEGVS_2026");
  const [importPassword, setImportPassword] = useState("DEGVS_2026");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export Download
  const handleExport = () => {
    try {
      setLoading(true);
      const encryptedJson = storageService.exportEncryptedBackup(password);
      
      const blob = new Blob([encryptedJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `degvs_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "Copia de seguridad cifrada exportada y descargada exitosamente.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Error al exportar copia de seguridad.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedFileContent(event.target?.result as string);
        setStatusMessage(null);
      };
      reader.readAsText(file);
    }
  };

  // Handle Import Restoration
  const handleImport = () => {
    if (!selectedFileContent) {
      setStatusMessage({ type: "error", text: "Por favor selecciona un archivo JSON de respaldo." });
      return;
    }

    try {
      setLoading(true);
      storageService.importEncryptedBackup(selectedFileContent, importPassword);
      setStatusMessage({
        type: "success",
        text: "¡Copia de seguridad restaurada correctamente! Actualizando historial...",
      });
      setTimeout(() => {
        onBackupRestored();
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Contraseña incorrecta o archivo corrupto.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 text-slate-100 shadow-2xl relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#00E676]/10 text-[#00E676]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-1.5">
                <span>Copia de Seguridad y Cifrado</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 uppercase">
                  AES-256
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Respalda o restaura todos tus chats, contactos y archivos localmente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00E676]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Section 1: Export Backup */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Download className="w-4 h-4 text-[#00E676]" />
            <span>Exportar Historial Completo (JSON Cifrado)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Genera un archivo `.json` que contiene todos los mensajes, fotos, contactos y claves de baúl protegidos con tu contraseña de cifrado.
          </p>

          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-[#00E676]" /> Clave de Cifrado del Respaldo:
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Escribe una contraseña segura..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-[#00E676] text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90 transition shadow-lg shadow-[#00E676]/10 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Copia de Seguridad (.json)</span>
          </button>
        </div>

        {/* Section 2: Import / Restore Backup */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Restaurar Copia desde Archivo</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-3 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/60 rounded-xl cursor-pointer text-center space-y-1 transition group"
          >
            <FileJson className="w-6 h-6 text-indigo-400 mx-auto group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-slate-200">
              {fileName ? fileName : "Seleccionar archivo .json de respaldo"}
            </p>
            <p className="text-[10px] text-slate-500">Haz clic para examinar en tu dispositivo</p>
          </div>

          {selectedFileContent && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-400" /> Clave para Descifrar:
              </label>
              <input
                type="text"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Ingresa la clave usada al exportar..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 text-xs font-mono text-slate-100 focus:outline-none"
              />

              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>Descifrar y Restaurar Historial</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
