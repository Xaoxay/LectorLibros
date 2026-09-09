import React from 'react';
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
  };

  handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard?.writeText(String(this.state.error?.stack || this.state.error?.message || this.state.error));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-black tracking-tight text-white mb-2">
              Lector Libros
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              Ocurrió una interrupción inesperada al renderizar la aplicación. Puedes reiniciar o reintentar sin perder tus libros guardados.
            </p>

            {this.state.error && (
              <div className="w-full mb-6 p-3 rounded-xl bg-slate-950/80 border border-white/5 text-left overflow-hidden">
                <p className="text-[11px] font-mono text-rose-300 break-words line-clamp-3">
                  {this.state.error?.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="w-full space-y-2.5">
              <button
                onClick={this.handleReload}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reiniciar Aplicación</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Reintentar
                </button>
                <button
                  onClick={this.handleCopy}
                  className="px-3.5 h-10 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-[0.98] text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/5"
                  title="Copiar error para soporte"
                >
                  {this.state.copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{this.state.copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
