import React, { useState } from "react";
import { UserProfile } from "../../types";
import { User, Mail, Lock, ArrowRight, LogIn, UserPlus, ShieldCheck, Loader2, Image as ImageIcon, Sparkles, CheckCircle2 } from "lucide-react";
import { loginWithFirebase, registerWithFirebase, loginGuestWithFirebase } from "../../services/firebase";

interface PhoneAuthModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
}

const USERS_DB_KEY = "degvs_messenger_registered_users";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://api.dicebear.com/7.x/bottts/svg?seed=cyber_degv",
  "https://api.dicebear.com/7.x/bottts/svg?seed=neon_alex",
  "https://api.dicebear.com/7.x/bottts/svg?seed=matrix_ray",
];

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({ isOpen, onComplete }) => {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);

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

  const handleLogin = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      // 1. Try Real Firebase Auth SDK first
      const firebaseUser = await loginWithFirebase(identifier, password);
      saveRegisteredUser(firebaseUser);
      onComplete(firebaseUser);
    } catch (fbError: any) {
      console.warn("Firebase Auth attempt notice:", fbError?.message);

      // 2. Fallback check in local storage if offline or specific Firebase error
      const registeredUsers = getRegisteredUsers();
      const foundUser = registeredUsers.find(
        (u) =>
          u.username?.toLowerCase() === identifier ||
          u.email?.toLowerCase() === identifier
      );

      if (foundUser) {
        if (foundUser.password && foundUser.password !== password) {
          setError("Contraseña incorrecta. Intenta nuevamente.");
          setLoading(false);
          return;
        }
        onComplete(foundUser);
        setLoading(false);
        return;
      }

      if (fbError?.code === "auth/user-not-found" || fbError?.code === "auth/invalid-credential") {
        setError("Usuario o contraseña no encontrados. Si es tu primera vez, haz clic en 'Registrarse'.");
      } else {
        setError(fbError?.message || "Error al autenticar. Verifica tu conexión a internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanUsername;

    if (!cleanUsername) {
      setError("Por favor ingresa un nombre de usuario.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!password || password.length < 6) {
      setError("La contraseña de Firebase debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register in Firebase Auth & Firestore with full profile
      const newUser = await registerWithFirebase(
        cleanUsername,
        cleanEmail,
        password,
        cleanName,
        selectedAvatar
      );
      saveRegisteredUser(newUser);
      onComplete(newUser);
    } catch (fbError: any) {
      console.warn("Firebase Registration notice:", fbError?.message);
      if (fbError?.code === "auth/email-already-in-use") {
        setError("El correo electrónico ya está registrado. Inicia sesión con tus credenciales.");
      } else if (fbError?.code === "auth/weak-password") {
        setError("La contraseña es muy débil. Usa al menos 6 caracteres.");
      } else {
        // Fallback local registration if network/offline
        const fallbackUser: UserProfile = {
          id: `usr_${Date.now()}`,
          username: cleanUsername,
          email: cleanEmail,
          password,
          firstName: cleanName,
          lastName: "",
          avatarUrl: selectedAvatar,
          bio: "¡Hola! Estoy usando Degv's Messenger 🚀",
          status: "online",
        };
        saveRegisteredUser(fallbackUser);
        onComplete(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const guestUser = await loginGuestWithFirebase();
      saveRegisteredUser(guestUser);
      onComplete(guestUser);
    } catch (e: any) {
      const localGuest: UserProfile = {
        id: `guest_${Date.now()}`,
        username: `invitado_${Math.floor(Math.random() * 1000)}`,
        email: "invitado@degvs.app",
        firstName: "Invitado",
        lastName: "",
        avatarUrl: selectedAvatar,
        bio: "Usuario Invitado en Degv's Messenger",
        status: "online",
      };
      saveRegisteredUser(localGuest);
      onComplete(localGuest);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md my-auto bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,230,118,0.15)] space-y-5 text-slate-100 relative overflow-hidden">
        {/* Glow Top Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#00E676] shadow-[0_0_15px_#00E676]" />

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#00FF66] via-[#00F0FF] to-[#00B248] p-0.5 shadow-[0_0_25px_rgba(0,255,102,0.4)] flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="Degv's Icon"
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
              {mode === "register"
                ? "Crea tu cuenta individual y privada"
                : "Inicia sesión con tu cuenta"}
            </p>
          </div>
        </div>

        {/* Isolation Banner */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#00E676]" />
          <span>
            Cada inicio de sesión es 100% individual. Tu panel principal y tus mensajes son totalmente privados.
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            type="button"
            id="tab-auth-register"
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
          <button
            type="button"
            id="tab-auth-login"
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
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center animate-in zoom-in-95">
            {error}
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === "register" ? (
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Avatar Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>Elige tu Foto de Perfil</span>
                <span className="text-slate-500 text-[10px]">O sube una propia</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`relative w-10 h-10 rounded-full shrink-0 border-2 overflow-hidden transition-all ${
                      selectedAvatar === preset
                        ? "border-[#00E676] scale-105 shadow-[0_0_10px_rgba(0,230,118,0.4)]"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={preset} alt="avatar" className="w-full h-full object-cover" />
                    {selectedAvatar === preset && (
                      <div className="absolute inset-0 bg-[#00E676]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                      </div>
                    )}
                  </button>
                ))}
                <label className="w-10 h-10 rounded-full shrink-0 border border-dashed border-white/30 hover:border-[#00E676] flex items-center justify-center cursor-pointer text-slate-400 hover:text-white transition">
                  <ImageIcon className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Nombre completo
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    id="input-reg-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ej. Raymond Gonzalez"
                    className="w-full py-2.5 pl-9 pr-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                    required
                  />
                  <User className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Nombre de usuario
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    id="input-reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. raymond_degv"
                    className="w-full py-2.5 pl-9 pr-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                    required
                  />
                  <Sparkles className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  id="input-reg-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. raymondegv95ff@gmail.com"
                  className="w-full py-2.5 pl-9 pr-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                />
                <Mail className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Contraseña (mínimo 6 caracteres)
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  id="input-reg-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 pl-9 pr-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676] transition"
                  required
                  minLength={6}
                />
                <Lock className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-register"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-2xl bg-[#00E676] text-black font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Registrar Cuenta y Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Usuario o Correo electrónico
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  id="input-login-identifier"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="ej. raymond_degv o raymondegv95ff@gmail.com"
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
                  id="input-login-password"
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
              id="btn-submit-login"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#00E676] text-black font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Guest access option */}
        <div className="text-center pt-1">
          <button
            type="button"
            id="btn-guest-login"
            onClick={handleGuestLogin}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-[#00E676] transition underline underline-offset-4"
          >
            Acceso Rápido como Invitado Anónimo
          </button>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
          <span>Autenticación segura • Base de datos Firestore en tiempo real</span>
        </div>
      </div>
    </div>
  );
};
