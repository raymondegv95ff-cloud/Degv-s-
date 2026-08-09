import React, { useState } from "react";
import { Lock, Fingerprint, KeyRound, X, AlertCircle } from "lucide-react";

interface RoomLockModalProps {
  isOpen: boolean;
  roomName: string;
  roomAvatar?: string;
  expectedPin?: string;
  onUnlockSuccess: () => void;
  onClose: () => void;
}

export const RoomLockModal: React.FC<RoomLockModalProps> = ({
  isOpen,
  roomName,
  roomAvatar,
  expectedPin,
  onUnlockSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [authenticatingBiometrics, setAuthenticatingBiometrics] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const next = pin + num;
      setPin(next);
      setError(false);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (inputPin: string) => {
    if (!expectedPin || inputPin === expectedPin) {
      onUnlockSuccess();
      setPin("");
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setPin(""), 600);
    }
  };

  const handleBiometricAuth = async () => {
    setAuthenticatingBiometrics(true);
    try {
      // Simulate WebAuthn / Device Biometrics check
      if (window.PublicKeyCredential) {
        // Mock biometric delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        onUnlockSuccess();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        onUnlockSuccess();
      }
    } catch {
      setError(true);
    } finally {
      setAuthenticatingBiometrics(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-3 pt-2">
          <div className="relative inline-block">
            <img
              src={roomAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={roomName}
              className="w-16 h-16 rounded-3xl mx-auto object-cover ring-2 ring-[#00E676]/60 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-[#00E676] text-slate-950 rounded-full shadow">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-slate-100">{roomName}</h3>
            <p className="text-xs text-slate-400">Chat Protegido con Código PIN</p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                error
                  ? "border-rose-500 bg-rose-500/30 animate-bounce"
                  : pin.length > idx
                  ? "border-[#00E676] bg-[#00E676] shadow-[0_0_8px_#00E676]"
                  : "border-slate-700 bg-slate-950"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Código PIN incorrecto
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3 bg-slate-950 hover:bg-slate-800 text-slate-100 font-extrabold text-lg rounded-2xl border border-slate-800/80 active:scale-95 transition"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBiometricAuth}
            disabled={authenticatingBiometrics}
            className="py-3 bg-slate-950 hover:bg-slate-800 text-[#00E676] font-bold text-xs rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition"
            title="Usar Biometría"
          >
            <Fingerprint className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="py-3 bg-slate-950 hover:bg-slate-800 text-slate-100 font-extrabold text-lg rounded-2xl border border-slate-800/80 active:scale-95 transition"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-2xl border border-slate-800/80 flex items-center justify-center active:scale-95 transition"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};
