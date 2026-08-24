import React, { useState, useEffect, useRef } from "react";
import { Search, X, Clock, Trash2, ArrowUpRight } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

const SEARCH_HISTORY_KEY = "degvs_messenger_search_history";
const MAX_HISTORY_ITEMS = 8;

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClear,
  placeholder = "Buscar chats...",
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load search history", e);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const saveHistory = (items: string[]) => {
    setHistory(items);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save search history", e);
    }
  };

  const addTermToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    const filtered = history.filter((h) => h.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    saveHistory(updated);
  };

  const removeHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== term);
    saveHistory(updated);
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveHistory([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);

    // Debounced addition to history if user stops typing
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        addTermToHistory(val);
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      addTermToHistory(searchTerm);
      setIsFocused(false);
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const handleSelectHistoryItem = (term: string) => {
    onSearchChange(term);
    addTermToHistory(term);
    setIsFocused(false);
  };

  const showDropdown = isFocused && history.length > 0;

  return (
    <div className="p-4 relative" ref={containerRef}>
      <div className="relative group">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          id="global-search-input"
          autoComplete="off"
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-8 text-sm text-slate-100 focus:outline-none focus:border-[#00E676]/50 transition-all placeholder:text-slate-500"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-[#00E676] transition-colors pointer-events-none" />
        {searchTerm && (
          <button
            onClick={() => {
              onClear();
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            }}
            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-200 transition-colors"
            title="Borrar texto"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search History Dropdown */}
      {showDropdown && (
        <div className="absolute left-4 right-4 top-14 z-50 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-2 space-y-1 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800/80">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-[#00E676]" />
              <span>Búsquedas recientes</span>
            </span>
            <button
              onClick={clearAllHistory}
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar todo</span>
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 pt-1">
            {history.map((term) => (
              <div
                key={term}
                onClick={() => handleSelectHistoryItem(term)}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-900 cursor-pointer transition"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Clock className="w-3 h-3 text-slate-500 group-hover:text-[#00E676] shrink-0" />
                  <span className="truncate">{term}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => removeHistoryItem(term, e)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition"
                    title="Eliminar del historial"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
