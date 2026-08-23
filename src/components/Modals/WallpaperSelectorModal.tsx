import React, { useState, useRef } from "react";
import { Image, X, Check, Upload, Sparkles, RefreshCw, Palette, Layers } from "lucide-react";

interface WallpaperSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper?: string;
  onSelectWallpaper: (presetOrUrl: string) => void;
}

export const CURATED_WALLPAPERS = [
  // Presets - Gradients & Patterns
  {
    id: "default",
    name: "Oscuro Clásico",
    category: "minimal",
    bgClass: "bg-[#050505]",
    thumbnail: "",
  },
  {
    id: "gradient_cyber",
    name: "Cyber Neon",
    category: "gradient",
    bgClass: "bg-gradient-to-b from-[#0B0F19] via-slate-950 to-indigo-950",
    thumbnail: "",
  },
  {
    id: "neon_grid",
    name: "Rejilla Neón Matrix",
    category: "pattern",
    bgClass: "bg-[#0B0F19] bg-[radial-gradient(#00E676_1.5px,transparent_1.5px)] [background-size:18px_18px]",
    thumbnail: "",
  },
  {
    id: "emerald_night",
    name: "Noche Esmeralda",
    category: "gradient",
    bgClass: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950",
    thumbnail: "",
  },
  {
    id: "violet_galaxy",
    name: "Galaxia Violeta",
    category: "gradient",
    bgClass: "bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950",
    thumbnail: "",
  },
  {
    id: "sunset_glow",
    name: "Atardecer Ciber",
    category: "gradient",
    bgClass: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950",
    thumbnail: "",
  },
  {
    id: "minimal_dots",
    name: "Puntos Cian",
    category: "pattern",
    bgClass: "bg-[#050505] bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px]",
    thumbnail: "",
  },
  {
    id: "deep_ocean",
    name: "Océano Profundo",
    category: "gradient",
    bgClass: "bg-gradient-to-tr from-cyan-950 via-blue-950 to-slate-950",
    thumbnail: "",
  },
  // Curated High-Res Dark Theme Background Images
  {
    id: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80",
    name: "Circuito Cyber",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    name: "Nebulosa Cósmica",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80",
    name: "Montañas Estrelladas",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80",
    name: "Geometría Neón",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    name: "Aurora Boreal",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1600&auto=format&fit=crop&q=80",
    name: "Gradiente Holográfico",
    category: "image",
    bgClass: "bg-cover bg-center",
    thumbnail: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=400&auto=format&fit=crop&q=80",
  },
];

export const WallpaperSelectorModal: React.FC<WallpaperSelectorModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper = "default",
  onSelectWallpaper,
}) => {
  const [selectedTab, setSelectedTab] = useState<"all" | "gradient" | "pattern" | "image">("all");
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

  const filteredPresets = CURATED_WALLPAPERS.filter(
    (p) => selectedTab === "all" || p.category === selectedTab || (selectedTab === "gradient" && p.category === "minimal")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676]">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                Fondo de Pantalla del Chat
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  Por Sala
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza la estética visual de este chat con fondos e imágenes de alta definición.
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

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Upload Custom & Paste URL Section */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#00E676]" />
              <span>Usar foto propia o enlace web</span>
            </label>
            {currentWallpaper !== "default" && (
              <button
                onClick={() => {
                  onSelectWallpaper("default");
                  onClose();
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-[#00E676] flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restablecer fondo</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-[#00E676] text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-[#00E676]" />
              <span>Subir Archivo Local</span>
            </button>

            <form onSubmit={handleApplyCustomUrl} className="flex-1 flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#00E676] text-black font-black text-xs rounded-xl hover:bg-[#00E676]/90 transition shrink-0 shadow-[0_0_12px_rgba(0,230,118,0.3)]"
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
          {[
            { id: "all", label: "Colección Completa", icon: Layers },
            { id: "gradient", label: "Degradados", icon: Palette },
            { id: "pattern", label: "Patrones Cyber", icon: Sparkles },
            { id: "image", label: "Fotografías HD", icon: Image },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  selectedTab === tab.id
                    ? "bg-[#00E676] text-black shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Curated Presets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-1">
          {filteredPresets.map((p) => {
            const isSelected = currentWallpaper === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelectWallpaper(p.id);
                  onClose();
                }}
                style={p.thumbnail || p.id.startsWith("http") ? { backgroundImage: `url("${p.thumbnail || p.id}")` } : undefined}
                className={`group relative h-28 rounded-2xl border-2 p-2.5 flex flex-col justify-end transition overflow-hidden bg-cover bg-center ${
                  p.bgClass
                } ${
                  isSelected
                    ? "border-[#00E676] ring-2 ring-[#00E676]/40 shadow-lg shadow-[#00E676]/25"
                    : "border-slate-800 hover:border-slate-600 hover:scale-[1.02]"
                }`}
              >
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                <span className="relative z-10 text-[11px] font-bold text-white drop-shadow truncate">
                  {p.name}
                </span>

                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 p-1 rounded-full bg-[#00E676] text-black shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

