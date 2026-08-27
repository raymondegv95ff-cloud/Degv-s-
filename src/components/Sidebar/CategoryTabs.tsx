import React, { useState } from "react";
import { MessageSquare, Bot, Users, Radio, Archive, Clock, FolderPlus, Folder, Phone } from "lucide-react";

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  unreadTotal: number;
  customFolders?: string[];
  onAddFolder?: (folderName: string) => void;
}

interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
  highlight?: boolean;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  unreadTotal,
  customFolders = ["Trabajo", "Personal", "Familia"],
  onAddFolder,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const baseTabs: TabItem[] = [
    { id: "all", label: "Todos", icon: MessageSquare },
    { id: "calls", label: "Llamadas", icon: Phone },
    { id: "status", label: "Estados", icon: Clock },
    { id: "unread", label: "No leídos", badge: unreadTotal > 0 ? unreadTotal : null },
    { id: "ai", label: "Degv's AI", icon: Bot, highlight: true },
    { id: "groups", label: "Grupos", icon: Users },
    { id: "channels", label: "Canales", icon: Radio },
  ];


  const folderTabs: TabItem[] = customFolders.map((f) => ({
    id: `folder_${f}`,
    label: f,
    icon: Folder,
  }));

  const allTabs: TabItem[] = [...baseTabs, ...folderTabs, { id: "archived", label: "Archivados", icon: Archive }];

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onAddFolder) {
      onAddFolder(newFolderName.trim());
      onCategoryChange(`folder_${newFolderName.trim()}`);
      setNewFolderName("");
      setShowAddModal(false);
    }
  };

  return (
    <div className="px-4 pb-2 border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-1.5 select-none relative">
      {allTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeCategory === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
              isActive
                ? "bg-[#00E676] text-black font-bold shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                : tab.highlight
                ? "bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 hover:bg-[#00E676]/20"
                : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-black text-[#00E676]" : "bg-[#00E676] text-black"}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Add Custom Folder Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/20 hover:bg-[#00E676]/20 transition whitespace-nowrap"
        title="Crear nueva carpeta de chat"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span>+ Carpeta</span>
      </button>

      {/* Add Folder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-xs space-y-4 text-slate-100 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#00E676]" />
              <span>Nueva Carpeta de Chats</span>
            </h3>
            <p className="text-xs text-slate-400">Organiza tus chats (p. ej., Trabajo, Familia, Proyectos).</p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta..."
              autoFocus
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-1.5 rounded-xl bg-[#00E676] text-black font-bold"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
