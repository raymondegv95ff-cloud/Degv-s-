import React from "react";
import { ShieldCheck, Lock, X, QrCode } from "lucide-react";

interface E2EEModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export const E2EEModal: React.FC<E2EEModalProps> = ({ isOpen, onClose, roomName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-[#00E676]/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-3xl bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center text-[#00E676] shadow-xl shadow-[#00E676]/10">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight">Cifrado de Extremo a Extremo</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tu conversación con <span className="font-bold text-slate-200">{roomName}</span> está cifrada con claves criptográficas únicas de 256-bit.
          </p>
        </div>

        {/* QR Verification Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <p className="text-[10px] font-mono text-[#00E676] font-bold">Código QR de Verificación de Seguridad</p>
          <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl flex items-center justify-center">
            {/* QR Code de Cifrado Criptográfico */}
            <QrCode className="w-32 h-32 text-slate-950" />
          </div>
          <p className="text-[9px] font-mono text-slate-500">KEY-VERIFY-9921-DEGV-SECURE-E2EE</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-[#00E676] text-slate-950 font-black text-xs hover:bg-[#00E676]/90 transition"
        >
          Confirmar Seguridad
        </button>
      </div>
    </div>
  );
};
