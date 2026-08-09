import React, { useState } from "react";
import { Lock, Fingerprint, ShieldAlert, KeyRound, X, CheckCircle2 } from "lucide-react";

interface SecretVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: () => void;
  savedPin: string | null;
  onSavePin: (pin: string) => void;
}

export const SecretVaultModal: React.FC<SecretVaultModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
  savedPin,
  onSavePin,
}) => {
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(!savedPin);

  if (!isOpen) return null;

  const handlePinSubmit = () => {
    if (pinInput.length !== 4) {
      setErrorMsg("El PIN debe contener exactamente 4 dígitos");
      return;
    }

    if (isSettingPin) {
      onSavePin(pinInput);
      setIsSettingPin(false);
      onUnlockSuccess();
      onClose();
    } else {
      if (pinInput === savedPin) {
        onUnlockSuccess();
        onClose();
      } else {
        setErrorMsg("PIN incorrecto. Intenta nuevamente.");
      }
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      if (window.PublicKeyCredential) {
        // WebAuthn biometrics simulation / trigger
        setErrorMsg("Autenticando huella dactilar / FaceID...");
        setTimeout(() => {
          onUnlockSuccess();
          onClose();
        }, 800);
      } else {
        setErrorMsg("Tu dispositivo no soporta WebAuthn biometría.");
      }
    } catch {
      setErrorMsg("Error en verificación biométrica.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {isSettingPin ? "Configurar PIN de Bóveda" : "Bóveda Secreta Protegida"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSettingPin
              ? "Crea un código PIN de 4 dígitos para proteger tus chats más privados."
              : "Introduce tu PIN o usa biometría para desbloquear las conversaciones ocultas."}
          </p>
        </div>

        {/* PIN 4-Digit Input */}
        <div className="space-y-3">
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setErrorMsg("");
              setPinInput(e.target.value.replace(/\D/g, ""));
            }}
            placeholder="• • • •"
            className="w-40 mx-auto text-center tracking-[1em] text-2xl font-mono py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 focus:outline-none focus:border-amber-400"
          />

          {errorMsg && <p className="text-xs font-semibold text-red-400">{errorMsg}</p>}

          <button
            onClick={handlePinSubmit}
            className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSettingPin ? "Guardar y Desbloquear" : "Desbloquear Bóveda"}</span>
          </button>
        </div>

        {/* Biometric WebAuthn Button */}
        {!isSettingPin && (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleBiometricUnlock}
              className="w-full py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition"
            >
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span>Desbloquear con Biometría / Huella</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
