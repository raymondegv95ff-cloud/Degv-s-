import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Check, Wand2, RefreshCw } from "lucide-react";

interface ImageFilterModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onApply: (filteredDataUrl: string) => void;
}

export type FilterType = "normal" | "cyberpunk" | "cartoon" | "sketch" | "neon" | "retro";

export const ImageFilterModal: React.FC<ImageFilterModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onApply,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("cyberpunk");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filteredUrl, setFilteredUrl] = useState<string>(imageUrl);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && imageUrl) {
      applyFilterToImage(selectedFilter);
    }
  }, [isOpen, imageUrl, selectedFilter]);

  const applyFilterToImage = (filter: FilterType) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Constrain canvas dimensions for performance
      const maxDim = 1024;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      if (filter === "normal") {
        setFilteredUrl(canvas.toDataURL("image/jpeg", 0.9));
        setIsProcessing(false);
        return;
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const len = data.length;

      if (filter === "cyberpunk") {
        // High contrast, magenta-cyan shift
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Contrast boost
          r = Math.min(255, Math.max(0, (r - 128) * 1.3 + 128));
          g = Math.min(255, Math.max(0, (g - 128) * 1.1 + 128));
          b = Math.min(255, Math.max(0, (b - 128) * 1.4 + 128));

          // Cyberpunk color shift
          data[i] = Math.min(255, r * 1.1 + 30); // boost red/magenta
          data[i + 1] = Math.max(0, g * 0.85); // reduce green
          data[i + 2] = Math.min(255, b * 1.3 + 40); // boost blue/cyan
        }
        ctx.putImageData(imageData, 0, 0);

        // Add subtle cyan glow overlay
        ctx.fillStyle = "rgba(0, 240, 255, 0.1)";
        ctx.fillRect(0, 0, width, height);
      } else if (filter === "cartoon") {
        // Posterization + Edge detection
        const posterizeLevel = 64;
        for (let i = 0; i < len; i += 4) {
          data[i] = Math.floor(data[i] / posterizeLevel) * posterizeLevel + posterizeLevel / 2;
          data[i + 1] = Math.floor(data[i + 1] / posterizeLevel) * posterizeLevel + posterizeLevel / 2;
          data[i + 2] = Math.floor(data[i + 2] / posterizeLevel) * posterizeLevel + posterizeLevel / 2;
          // Saturation boost
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = Math.min(255, data[i] + (data[i] - avg) * 0.5);
          data[i + 1] = Math.min(255, data[i + 1] + (data[i + 1] - avg) * 0.5);
          data[i + 2] = Math.min(255, data[i + 2] + (data[i + 2] - avg) * 0.5);
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (filter === "sketch") {
        // Grayscale + High contrast pencil lines
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const inverted = 255 - gray;
          // High contrast thresholding for sketch lines
          const line = inverted > 140 ? 20 : 240;
          data[i] = line;
          data[i + 1] = line;
          data[i + 2] = line;
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (filter === "neon") {
        // Neon Glow Inversion
        for (let i = 0; i < len; i += 4) {
          let r = 255 - data[i];
          let g = 255 - data[i + 1];
          let b = 255 - data[i + 2];

          // Make neon vivid
          data[i] = r < 100 ? 0 : Math.min(255, r * 1.5);
          data[i + 1] = g < 100 ? 230 : Math.min(255, g * 1.8);
          data[i + 2] = b < 100 ? 118 : Math.min(255, b * 1.8);
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (filter === "retro") {
        // Retro VHS scanlines & chromatic aberration
        for (let i = 0; i < len; i += 4) {
          data[i] = Math.min(255, data[i] * 1.2 + 20); // Amber tint
          data[i + 1] = Math.min(255, data[i + 1] * 0.9 + 10);
          data[i + 2] = Math.min(255, data[i + 2] * 0.8);
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw scanlines
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 2);
        }
      }

      setFilteredUrl(canvas.toDataURL("image/jpeg", 0.9));
      setIsProcessing(false);
    };
  };

  if (!isOpen) return null;

  const filtersList: { id: FilterType; label: string; icon: string; desc: string }[] = [
    { id: "normal", label: "Original", icon: "📷", desc: "Sin filtro" },
    { id: "cyberpunk", label: "Cyberpunk", icon: "⚡", desc: "Cian y Neón" },
    { id: "cartoon", label: "Cartoon AI", icon: "🎨", desc: "Historieta" },
    { id: "sketch", label: "Sketch Lápiz", icon: "✏️", desc: "Dibujo a mano" },
    { id: "neon", label: "Neon Glow", icon: "🌌", desc: "Resplandor Ciber" },
    { id: "retro", label: "Retro VHS", icon: "📼", desc: "Efecto Vintage" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00E676]" />
            <h3 className="font-bold text-sm tracking-tight">Filtros de Procesamiento IA</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Canvas */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-64 flex items-center justify-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-xs text-[#00E676]">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Procesando Filtro IA...</span>
            </div>
          ) : (
            <img src={filteredUrl} alt="Filtered preview" className="h-full w-full object-contain" />
          )}
        </div>

        {/* Filter Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Selecciona el Estilo IA:</label>
          <div className="grid grid-cols-3 gap-2">
            {filtersList.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between h-16 ${
                  selectedFilter === f.id
                    ? "bg-[#00E676]/10 border-[#00E676] text-[#00E676] shadow-lg shadow-[#00E676]/20"
                    : "bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{f.icon}</span>
                  {selectedFilter === f.id && <Check className="w-3.5 h-3.5 text-[#00E676]" />}
                </div>
                <div>
                  <span className="text-xs font-bold block leading-tight">{f.label}</span>
                  <span className="text-[9px] text-slate-400 block">{f.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 font-bold text-xs text-slate-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onApply(filteredUrl);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-[#00E676] text-slate-950 font-extrabold text-xs hover:bg-[#00E676]/90 transition shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-1.5"
          >
            <Wand2 className="w-4 h-4" />
            <span>Enviar Foto Filtrada</span>
          </button>
        </div>
      </div>
    </div>
  );
};
