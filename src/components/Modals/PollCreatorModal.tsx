import React, { useState } from "react";
import { BarChart2, X, Plus, Trash2 } from "lucide-react";

interface PollCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const PollCreatorModal: React.FC<PollCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Opción 1", "Opción 2"]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, `Opción ${options.length + 1}`]);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || options.some((o) => !o.trim())) return;
    onCreatePoll(question, options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <span>Crear Encuesta</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300">Pregunta</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Haz una pregunta..."
              className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 focus:outline-none focus:border-[#00E676]"
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-300">Opciones de respuesta</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Opción ${idx + 1}`}
                  className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-[#00E676]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-red-400 hover:bg-slate-800 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 font-bold text-indigo-300 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Opción</span>
              </button>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-[#00E676] text-slate-950 font-bold">
              Crear Encuesta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
