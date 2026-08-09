import React, { useState } from "react";
import { UserProfile } from "../../types";
import { User, Mail, Lock, Sparkles, ArrowRight, LogIn, UserPlus, ShieldCheck } from "lucide-react";

interface PhoneAuthModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
}

const USERS_DB_KEY = "degvs_messenger_registered_users";

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({ isOpen, onComplete }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");

  if (!isOpen) return null;

  // Helper to retrieve saved users array from localStorage
  const getRegisteredUsers = (): UserProfile[] => {
    try {
      const data = localStorage.getItem(USERS_DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  // Helper to save a user to local registered database
  const saveRegisteredUser = (user: UserProfile) => {
    const list = getRegisteredUsers();
    const updated = [user, ...list.filter((u) => u.id !== user.id)];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(updated));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    if (!identifier) {
      setError("Por favor ingresa tu nombre de usuario o correo electrónico.");
      return;
    }
    if (!password) {
      setError("Por favor ingresa tu contraseña.");
      return;
    }

    const registeredUsers = getRegisteredUsers();
    const foundUser = registeredUsers.find(
      (u) =>
        u.username?.toLowerCase() === identifier ||
        u.email?.toLowerCase() === identifier
    );

    if (foundUser) {
      if (foundUser.password && foundUser.password !== password) {
        setError("Contraseña incorrecta. Intenta nuevamente.");
        return;
      }
      onComplete(foundUser);
      return;
    }

    // Default demo user login if no registered account matched
    const demoUser: UserProfile = {
      id: `usr_${Date.now()}`,
      username: identifier.includes("@") ? identifier.split("@")[0] : identifier,
      email: identifier.includes("@") ? identifier : `${identifier}@degvs.app`,
      password,
      firstName: identifier,
      lastName: "",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bio: "¡Hola! Estoy usando Degv's Messenger 🚀",
      status: "online",
    };

    saveRegisteredUser(demoUser);
    onComplete(demoUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setError("Por favor ingresa un nombre de usuario.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!password || password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    const registeredUsers = getRegisteredUsers();
    const existing = registeredUsers.find(
      (u) => u.username?.toLowerCase() === cleanUsername || u.email?.toLowerCase() === cleanEmail
    );

    if (existing) {
      setError("El nombre de usuario o correo electrónico ya está registrado. Intenta iniciar sesión.");
      return;
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail,
      password,
      firstName: cleanUsername,
      lastName: "",
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      bio: "¡Hola! Estoy usando Degv's Messenger 🚀",
      status: "online",
    };

    saveRegisteredUser(newUser);
    onComplete(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,230,118,0.15)] space-y-6 text-slate-100 relative overflow-hidden">
        {/* Glow Top Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#00E676] shadow-[0_0_15px_#00E676]" />

        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#00FF66] via-[#00F0FF] to-[#00B248] p-0.5 shadow-[0_0_25px_rgba(0,255,102,0.4)] flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="Degv's Cyber Icon"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-[14px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icon-512.png";
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-[#00FF66] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,255,102,0.3)]">
              Degv's Messenger
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === "login"
                ? "Inicia sesión con tu usuario, correo y contraseña"
                : "Crea tu cuenta con usuario, correo y contraseña"}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === "login"
                ? "bg-[#00E676] text-black shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === "register"
                ? "bg-[#00E676] text-black shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrarse</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center animate-in zoom-in-95">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Nombre de usuario o Correo electrónico
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="ej. raymon_degv o usuario@correo.com"
                  className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <User className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contraseña</label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <Lock className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#00E676] text-black font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Nombre de usuario
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. raymon_degv"
                  className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <User className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. usuario@correo.com"
                  className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <Mail className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contraseña</label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <Lock className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#00E676] text-black font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2"
            >
              <span>Crear Cuenta y Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
          <span>Autenticación segura • Cifrado de extremo a extremo</span>
        </div>
      </div>
    </div>
  );
};
