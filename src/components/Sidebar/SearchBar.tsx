import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClear,
  placeholder = "Buscar chats...",
}) => {
  return (
    <div className="p-4">
      <div className="relative group">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          id="global-search-input"
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-8 text-sm text-slate-100 focus:outline-none focus:border-[#00E676]/50 transition-all placeholder:text-slate-500"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-[#00E676] transition-colors pointer-events-none" />
        {searchTerm && (
          <button
            onClick={onClear}
            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
