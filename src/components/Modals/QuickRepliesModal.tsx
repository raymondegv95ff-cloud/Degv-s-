import React, { useState, useEffect } from "react";
import { QuickReplyItem } from "../../types";
import { storageService } from "../../services/storageService";
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Tag,
} from "lucide-react";

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuickReply?: (text: string) => void;
}

export const QuickRepliesModal: React.FC<QuickRepliesModalProps> = ({
  isOpen,
  onClose,
  onSelectQuickReply,
}) => {
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form State for creating/editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shortcutInput, setShortcutInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<"general" | "trabajo" | "personal" | "urgente">("general");
  const [formError, setFormError] = useState("");

  const loadReplies = () => {
    setQuickReplies(storageService.getQuickReplies());
  };

  useEffect(() => {
    if (isOpen) {
      loadReplies();
      setIsFormOpen(false);
      setEditingId(null);
      setShortcutInput("");
      setTextInput("");
      setFormError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcutInput.trim()) {
      setFormError("El atajo es requerido (ej: /gracias)");
      return;
    }
    if (!textInput.trim()) {
      setFormError("El texto de la respuesta no puede estar vacío");
      return;
    }

    if (editingId) {
      storageService.updateQuickReply({
        id: editingId,
        shortcut: shortcutInput,
        text: textInput,
        category: categoryInput,
      });
    } else {
      storageService.addQuickReply({
        shortcut: shortcutInput,
        text: textInput,
        category: categoryInput,
      });
    }

    loadReplies();
    setIsFormOpen(false);
    setEditingId(null);
    setShortcutInput("");
    setTextInput("");
    setFormError("");
  };

  const handleEdit = (item: QuickReplyItem) => {
    setEditingId(item.id);
    setShortcutInput(item.shortcut);
    setTextInput(item.text);
    setCategoryInput(item.category || "general");
    setIsFormOpen(true);
    setFormError("");
  };

  const handleDelete = (id: string) => {
    storageService.deleteQuickReply(id);
    loadReplies();
  };

  const handleRestoreDefaults = () => {
    localStorage.removeItem("degvs_messenger_quick_replies");
    loadReplies();
  };

  const filteredReplies = quickReplies.filter((q) => {
    const matchesSearch =
      q.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || q.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case "urgente":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "trabajo":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "personal":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>Respuestas Rápidas Personalizables</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] font-mono font-bold">
                  {quickReplies.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escribe <span className="font-mono text-[#00E676]">/</span> en el chat o toca un atajo para enviar con un toque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por atajo o texto..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676]"
            />
          </div>

          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setEditingId(null);
              setShortcutInput("");
              setTextInput("");
              setFormError("");
            }}
            className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00E676] hover:opacity-90 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shrink-0"
          >
            {isFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isFormOpen ? "Cancelar" : "Nuevo Atajo"}</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: "all", label: "Todos" },
            { id: "general", label: "General" },
            { id: "trabajo", label: "Trabajo" },
            { id: "personal", label: "Personal" },
            { id: "urgente", label: "Urgente" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-lg border font-bold transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-[#00E676] text-slate-950 border-[#00E676]"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Create / Edit Form Drawer */}
        {isFormOpen && (
          <form
            onSubmit={handleSave}
            className="p-4 rounded-2xl bg-slate-950 border border-[#00E676]/40 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#00E676] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{editingId ? "Editar Respuesta Rápida" : "Crear Nueva Respuesta Rápida"}</span>
              </h3>
              <span className="text-[10px] text-slate-500">Usa / prefijo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Atajo (Comando)
                </label>
                <input
                  type="text"
                  value={shortcutInput}
                  onChange={(e) => setShortcutInput(e.target.value)}
                  placeholder="/ejemplo"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00E676]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Categoría
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as any)}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#00E676]"
                >
                  <option value="general">General</option>
                  <option value="trabajo">Trabajo</option>
                  <option value="personal">Personal</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Texto de respuesta frecuente
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe el mensaje completo que se enviará o insertará..."
                rows={2}
                className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#00E676] resize-none"
              />
            </div>

            {formError && (
              <p className="text-xs text-rose-400 font-semibold">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-bold hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 rounded-xl bg-[#00E676] text-slate-950 text-xs font-black hover:opacity-90 active:scale-95 shadow-md flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingId ? "Guardar Cambios" : "Agregar Atajo"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Quick Replies List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {filteredReplies.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
              <p className="text-xs font-medium">No se encontraron respuestas rápidas.</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="text-xs text-[#00E676] font-bold underline"
              >
                Crear tu primer atajo
              </button>
            </div>
          ) : (
            filteredReplies.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex items-start justify-between gap-3 group"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (onSelectQuickReply) {
                      onSelectQuickReply(item.text);
                      onClose();
                    }
                  }}
                  title="Haz clic para seleccionar o insertar este atajo"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-black text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-md border border-[#00E676]/30">
                      {item.shortcut}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-bold ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category || "general"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed break-words">
                    {item.text}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                  {onSelectQuickReply && (
                    <button
                      onClick={() => {
                        onSelectQuickReply(item.text);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-[#00E676]/20 hover:bg-[#00E676]/30 text-[#00E676] text-xs font-bold"
                      title="Usar este atajo"
                    >
                      Enviar &gt;
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 font-medium transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer atajos sugeridos</span>
          </button>

          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
