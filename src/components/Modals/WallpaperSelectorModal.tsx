import React, { useState, useRef } from "react";
import { Image, X, Check, Upload, Link as LinkIcon } from "lucide-react";

interface WallpaperSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper?: string;
  onSelectWallpaper: (presetOrUrl: string) => void;
}

export const WallpaperSelectorModal: React.FC<WallpaperSelectorModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper = "default",
  onSelectWallpaper,
}) => {
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const presets = [
    { id: "default", name: "Oscuro Clásico", bgClass: "bg-[#0B0F19]" },
    { id: "gradient_cyber", name: "Degradado Cyber", bgClass: "bg-gradient-to-b from-[#0B0F19] via-slate-950 to-indigo-950" },
    { id: "neon_grid", name: "Rejilla Neón", bgClass: "bg-[#0B0F19] bg-[radial-gradient(#00E676_1px,transparent_1px)] [background-size:12px_12px]" },
    { id: "emerald_night", name: "Noche Esmeralda", bgClass: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950" },
    { id: "violet_galaxy", name: "Galaxia Violeta", bgClass: "bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950" },
    { id: "sunset_glow", name: "Atardecer Ciber", bgClass: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950" },
    { id: "minimal_dots", name: "Puntos Ciber", bgClass: "bg-[#050505] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSelectWallpaper(event.target.result as string);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectWallpaper(customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
            <Image className="w-5 h-5 text-[#00E676]" />
            <span>Fondo de Pantalla Personalizado</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Custom Image Upload & URL input */}
        <div className="space-y-2 border-b border-slate-800 pb-4">
          <label className="text-xs font-bold text-slate-300">Subir tu propia foto / imagen</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[#00E676] text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-[#00E676]" />
              <span>Elegir Imagen de Dispositivo</span>
            </button>
          </div>

          <form onSubmit={handleApplyCustomUrl} className="flex gap-2 pt-1">
            <input
              type="url"
              placeholder="o pega enlace URL de imagen (https://...)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-[#00E676] text-slate-950 font-bold text-xs rounded-2xl hover:bg-[#00E676]/90 transition shrink-0"
            >
              Aplicar
            </button>
          </form>
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Estilos y Degradados Prediseñados</label>
          <div className="grid grid-cols-3 gap-2.5">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectWallpaper(p.id);
                  onClose();
                }}
                className={`relative h-24 rounded-2xl border-2 p-2 flex flex-col justify-end transition overflow-hidden ${
                  p.bgClass
                } ${
                  currentWallpaper === p.id
                    ? "border-[#00E676] shadow-lg shadow-[#00E676]/20"
                    : "border-slate-800 hover:border-slate-600"
                }`}
              >
                <span className="text-[10px] font-bold text-slate-200 z-10 drop-shadow">{p.name}</span>
                {currentWallpaper === p.id && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-[#00E676] text-slate-950">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
