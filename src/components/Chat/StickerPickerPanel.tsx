import React, { useState, useRef, useEffect } from "react";
import { StickerItem, StickerPack } from "../../types";
import { storageService } from "../../services/storageService";
import { Sparkles, Plus, Camera, Image as ImageIcon, Check, Trash2, X, Wand2 } from "lucide-react";

interface StickerPickerPanelProps {
  onSelectSticker: (stickerUrl: string) => void;
  onClose: () => void;
}

export const StickerPickerPanel: React.FC<StickerPickerPanelProps> = ({
  onSelectSticker,
  onClose,
}) => {
  const [activePackId, setActivePackId] = useState<string>("cats");
  const [customStickers, setCustomStickers] = useState<StickerItem[]>([]);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [newStickerImage, setNewStickerImage] = useState<string | null>(null);
  const [borderStyle, setBorderStyle] = useState<"neon" | "white" | "cyan" | "gold">("neon");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default Predefined Sticker Packs
  const defaultPacks: StickerPack[] = [
    {
      id: "cats",
      name: "Cyber Cats",
      icon: "🐱",
      stickers: [
        { id: "cat1", packId: "cats", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80", name: "Cyber Cat 1" },
        { id: "cat2", packId: "cats", url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&auto=format&fit=crop&q=80", name: "Cool Neon Cat" },
        { id: "cat3", packId: "cats", url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&auto=format&fit=crop&q=80", name: "Glasses Cat" },
        { id: "cat4", packId: "cats", url: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&auto=format&fit=crop&q=80", name: "Cute Kitten" },
        { id: "cat5", packId: "cats", url: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=200&auto=format&fit=crop&q=80", name: "Playful Cat" },
        { id: "cat6", packId: "cats", url: "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=200&auto=format&fit=crop&q=80", name: "Glow Cat" },
      ],
    },
    {
      id: "memes",
      name: "Cyber Moods",
      icon: "🔥",
      stickers: [
        { id: "m1", packId: "memes", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80", name: "Neon Wave" },
        { id: "m2", packId: "memes", url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80", name: "Retro Tech" },
        { id: "m3", packId: "memes", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80", name: "Matrix Code" },
        { id: "m4", packId: "memes", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80", name: "Chip Board" },
        { id: "m5", packId: "memes", url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80", name: "Hologram" },
      ],
    },
  ];

  useEffect(() => {
    loadCustomStickers();
  }, []);

  const loadCustomStickers = () => {
    const list = storageService.getCustomStickers();
    setCustomStickers(list);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewStickerImage(event.target?.result as string);
        setShowCreatorModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomSticker = () => {
    if (!newStickerImage) return;

    const newSticker: StickerItem = {
      id: `sticker_${Date.now()}`,
      packId: "custom",
      url: newStickerImage,
      name: `Mi Sticker #${customStickers.length + 1}`,
    };

    const updated = storageService.saveCustomSticker(newSticker);
    setCustomStickers(updated);
    setShowCreatorModal(false);
    setNewStickerImage(null);
    setActivePackId("custom");
  };

  const currentPack =
    activePackId === "custom"
      ? {
          id: "custom",
          name: "Mis Stickers",
          icon: "⭐",
          stickers: customStickers,
        }
      : defaultPacks.find((p) => p.id === activePackId) || defaultPacks[0];

  return (
    <div className="absolute bottom-20 left-4 bg-[#0a0a0a]/95 border border-white/10 rounded-3xl p-3 shadow-2xl z-50 w-80 md:w-96 backdrop-blur-2xl animate-in zoom-in-95 duration-150">
      {/* Header with Packs Tabs */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {defaultPacks.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setActivePackId(pack.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                activePackId === pack.id
                  ? "bg-[#00E676] text-slate-950 shadow-md shadow-[#00E676]/20"
                  : "bg-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{pack.icon}</span>
              <span className="hidden sm:inline">{pack.name}</span>
            </button>
          ))}

          {/* Custom Stickers Pack Tab */}
          <button
            onClick={() => setActivePackId("custom")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              activePackId === "custom"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "bg-white/5 text-indigo-300 hover:text-white"
            }`}
          >
            <span>⭐</span>
            <span>Mis Stickers ({customStickers.length})</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action to Create Custom Sticker */}
      <div className="mb-3">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-purple-500/20 hover:from-emerald-500/30 hover:to-purple-500/30 border border-[#00E676]/40 text-[#00E676] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition group"
        >
          <Camera className="w-4 h-4 text-[#00E676] group-hover:scale-110 transition-transform" />
          <span>+ Crear Sticker desde Cámara / Foto</span>
        </button>
      </div>

      {/* Sticker Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
        {currentPack.stickers.length > 0 ? (
          currentPack.stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => {
                onSelectSticker(sticker.url);
                onClose();
              }}
              className="group relative p-1.5 bg-slate-900/60 hover:bg-[#00E676]/10 border border-white/5 hover:border-[#00E676] rounded-2xl transition hover:scale-105 active:scale-95 flex flex-col items-center"
            >
              <img
                src={sticker.url}
                alt={sticker.name || "Sticker"}
                className="w-20 h-20 object-cover rounded-xl shadow-md ring-2 ring-transparent group-hover:ring-[#00E676]"
              />
              <span className="text-[10px] text-slate-400 group-hover:text-[#00E676] font-medium mt-1 truncate max-w-full">
                {sticker.name || "Sticker"}
              </span>
            </button>
          ))
        ) : (
          <div className="col-span-3 py-8 text-center text-slate-400 text-xs space-y-2">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
            <p className="font-bold text-slate-300">¡Aún no tienes stickers personalizados!</p>
            <p className="text-[11px] text-slate-500">
              Haz clic arriba en "+ Crear Sticker" para recortar una foto de tu cámara o galería.
            </p>
          </div>
        )}
      </div>

      {/* Sticker Creator Modal Preview */}
      {showCreatorModal && newStickerImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 w-full max-w-xs space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#00E676]" />
                <span>Nuevo Sticker Personalizado</span>
              </h3>
              <button
                onClick={() => setShowCreatorModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sticker Preview Box */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 relative">
              <div
                className={`p-1 rounded-2xl ${
                  borderStyle === "neon"
                    ? "ring-4 ring-[#00E676] shadow-[0_0_20px_#00E676]"
                    : borderStyle === "cyan"
                    ? "ring-4 ring-cyan-400 shadow-[0_0_20px_#00F0FF]"
                    : borderStyle === "gold"
                    ? "ring-4 ring-amber-400 shadow-[0_0_20px_#FFB300]"
                    : "ring-4 ring-white shadow-lg"
                }`}
              >
                <img
                  src={newStickerImage}
                  alt="Vista previa de sticker"
                  className="w-36 h-36 object-cover rounded-xl"
                />
              </div>
            </div>

            {/* Border Style Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">Estilo de Borde:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "neon", label: "Neón", color: "bg-[#00E676]" },
                  { id: "cyan", label: "Ciber", color: "bg-cyan-400" },
                  { id: "gold", label: "Dorado", color: "bg-amber-400" },
                  { id: "white", label: "Blanco", color: "bg-white" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setBorderStyle(st.id as any)}
                    className={`py-1 rounded-xl text-[10px] font-bold border transition flex items-center justify-center gap-1 ${
                      borderStyle === st.id
                        ? "border-[#00E676] bg-slate-800 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${st.color}`} />
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreatorModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomSticker}
                className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90 shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
