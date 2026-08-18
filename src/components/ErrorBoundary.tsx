import React from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Degv's ErrorBoundary] Uncaught React exception:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem("degvs_temp_state");
    } catch (e) {}
    window.location.reload();
  };

  private handleCleanRestart = () => {
    try {
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#050505] text-slate-100 flex items-center justify-center p-4 selection:bg-[#00E676]/30">
          <div className="max-w-md w-full bg-[#0d131f] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00E676]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                Degv's Messenger
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                El sistema detectó una excepción inesperada pero protegió tus datos. Puedes reiniciar la vista de forma segura.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800/80 text-left font-mono text-[11px] text-emerald-400/90 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-error-reload"
                onClick={this.handleReset}
                className="py-3 px-4 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_20px_rgba(0,230,118,0.3)] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar</span>
              </button>

              <button
                id="btn-error-home"
                onClick={this.handleCleanRestart}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
              >
                <Home className="w-4 h-4" />
                <span>Inicio Limpio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
