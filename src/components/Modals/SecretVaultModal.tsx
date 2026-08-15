import React, { useState, useEffect } from "react";
import {
  Lock,
  Fingerprint,
  ShieldAlert,
  KeyRound,
  X,
  CheckCircle2,
  ScanFace,
  Sparkles,
  Loader2,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { webAuthnService } from "../../services/webAuthnService";
import { soundService } from "../../services/soundService";

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
  const [unlockMode, setUnlockMode] = useState<"biometric" | "pin">("biometric");
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(!savedPin);
  const [isBioSupported, setIsBioSupported] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setPinInput("");
      setIsSettingPin(!savedPin);
      const supported = webAuthnService.isWebAuthnSupported();
      const enrolled = webAuthnService.isBiometricEnrolled();
      setIsBioSupported(supported);
      setIsEnrolled(enrolled);

      // Default to biometric if supported, otherwise fallback to PIN
      if (supported && (enrolled || !savedPin || webAuthnService.isBiometricPreferred())) {
        setUnlockMode("biometric");
      } else {
        setUnlockMode("pin");
      }
    }
  }, [isOpen, savedPin]);

  if (!isOpen) return null;

  const handlePinSubmit = () => {
    if (pinInput.length !== 4) {
      setErrorMsg("El PIN debe contener exactamente 4 dígitos");
      return;
    }

    if (isSettingPin) {
      onSavePin(pinInput);
      setIsSettingPin(false);
      soundService.playReceiveSound();
      onUnlockSuccess();
      onClose();
    } else {
      if (pinInput === savedPin) {
        soundService.playReceiveSound();
        onUnlockSuccess();
        onClose();
      } else {
        setErrorMsg("PIN incorrecto. Intenta nuevamente.");
      }
    }
  };

  const handleBiometricUnlock = async () => {
    setIsAuthenticatingBio(true);
    setErrorMsg("");
    setSuccessMsg("Iniciando sensor biométrico WebAuthn (Huella / Face ID)...");

    try {
      const result = await webAuthnService.authenticateWithBiometrics();
      if (result.success) {
        setSuccessMsg(result.message || "¡Huella / Face ID autenticado con éxito!");
        soundService.playReceiveSound();
        setTimeout(() => {
          setIsAuthenticatingBio(false);
          onUnlockSuccess();
          onClose();
        }, 500);
      } else {
        setIsAuthenticatingBio(false);
        setSuccessMsg("");
        setErrorMsg(result.message || "Fallo en la autenticación biométrica.");
      }
    } catch (err: any) {
      setIsAuthenticatingBio(false);
      setSuccessMsg("");
      setErrorMsg("No se pudo completar la verificación biométrica.");
    }
  };

  const handleRegisterBiometrics = async () => {
    setIsAuthenticatingBio(true);
    setErrorMsg("");
    setSuccessMsg("Vinculando sensor biométrico WebAuthn a este dispositivo...");

    try {
      const res = await webAuthnService.registerBiometricCredential("user_vault_primary", "Usuario Bóveda Secreta");
      setIsAuthenticatingBio(false);
      if (res.success) {
        setIsEnrolled(true);
        setSuccessMsg(res.message || "¡Biometría vinculada con éxito!");
        soundService.playReceiveSound();
        setTimeout(() => {
          setSuccessMsg("");
          onUnlockSuccess();
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.message || "No se pudo registrar la biometría.");
      }
    } catch (e: any) {
      setIsAuthenticatingBio(false);
      setErrorMsg("Error al vincular el sensor biométrico.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Selector Tabs (Biometría WebAuthn vs PIN) */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setUnlockMode("biometric");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              unlockMode === "biometric"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Huella / Face ID</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUnlockMode("pin");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              unlockMode === "pin"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Código PIN</span>
          </button>
        </div>

        {/* Main Biometric View */}
        {unlockMode === "biometric" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Biometric Pulse Icon */}
            <div className="relative w-20 h-20 mx-auto cursor-pointer" onClick={handleBiometricUnlock}>
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 hover:scale-105 transition-transform">
                {isAuthenticatingBio ? (
                  <Fingerprint className="w-10 h-10 text-emerald-300 animate-pulse" />
                ) : (
                  <Fingerprint className="w-10 h-10 text-emerald-400" />
                )}
              </div>
              {isAuthenticatingBio && (
                <span className="absolute -inset-2 rounded-3xl border-2 border-emerald-400/80 animate-ping" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-emerald-300">
                Desbloqueo Biométrico WebAuthn
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Usa tu huella dactilar, Face ID o Windows Hello registrado en este dispositivo.
              </p>
            </div>

            {errorMsg && <p className="text-xs font-semibold text-red-400 animate-in fade-in">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isAuthenticatingBio}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isAuthenticatingBio ? (
                  <>
                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>Verificando Sensor...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Escanear Huella / Rostro Ahora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRegisterBiometrics}
                disabled={isAuthenticatingBio}
                className="w-full py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition"
              >
                <ScanFace className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vincular / Registrar nueva credencial WebAuthn</span>
              </button>
            </div>
          </div>
        )}

        {/* PIN View (Backup / Setup) */}
        {unlockMode === "pin" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isSettingPin ? "Configurar PIN de Respaldo" : "Desbloquear con PIN"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isSettingPin
                  ? "Crea un código PIN de 4 dígitos como respaldo seguro."
                  : "Introduce tu PIN de 4 dígitos."}
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
                  setSuccessMsg("");
                  setPinInput(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="• • • •"
                className="w-40 mx-auto text-center tracking-[1em] text-2xl font-mono py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400 focus:outline-none focus:border-amber-400"
              />

              {errorMsg && <p className="text-xs font-semibold text-red-400 animate-in fade-in">{errorMsg}</p>}
              {successMsg && (
                <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </p>
              )}

              <button
                onClick={handlePinSubmit}
                className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSettingPin ? "Guardar y Desbloquear" : "Desbloquear con PIN"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Security badge footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protegido con Web Authentication API (FIDO2 / Biometría Nativa)</span>
        </div>
      </div>
    </div>
  );
};
