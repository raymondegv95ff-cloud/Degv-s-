import React, { useState } from "react";
import { Lock, Unlock, X, Check } from "lucide-react";

interface RoomLockSetupModalProps {
  isOpen: boolean;
  isCurrentlyLocked: boolean;
  onClose: () => void;
  onSavePin: (pin: string | null) => void;
}

export const RoomLockSetupModal: React.FC<RoomLockSetupModalProps> = ({
  isOpen,
  isCurrentlyLocked,
  onClose,
  onSavePin,
}) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentlyLocked) {
      // Unlocking room
      onSavePin(null);
      onClose();
      return;
    }

    if (pin.length < 4) {
      setErrorMsg("El código PIN debe ser de 4 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg("Los códigos PIN no coinciden.");
      return;
    }

    onSavePin(pin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#00E676]" />
            <h3 className="font-bold text-sm tracking-tight">
              {isCurrentlyLocked ? "Desbloquear Chat Protegido" : "Proteger Chat con PIN"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCurrentlyLocked ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-300">
              Este chat actualmente requiere un código PIN para abrirse. ¿Deseas eliminar la protección por PIN?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 font-bold text-xs text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onSavePin(null);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-500 transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Quitar Protección</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-slate-400">
              Crea un código PIN de 4 dígitos para proteger el acceso a esta conversación.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Ingresa PIN de 4 dígitos:</label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setErrorMsg("");
                }}
                placeholder="****"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-center text-lg font-mono font-bold text-slate-100 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Confirma el PIN:</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ""));
                  setErrorMsg("");
                }}
                placeholder="****"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-center text-lg font-mono font-bold text-slate-100 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 font-bold text-xs text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-[#00E676] text-slate-950 font-extrabold text-xs hover:bg-[#00E676]/90 transition shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Bloquear Chat</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
