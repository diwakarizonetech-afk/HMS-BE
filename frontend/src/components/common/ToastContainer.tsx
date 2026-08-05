import React from 'react';
import { useHMS } from '../../context/HMSContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useHMS();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-900/20'
              : toast.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/40 text-white shadow-rose-900/20'
              : toast.type === 'warning'
              ? 'bg-slate-900/95 border-amber-500/40 text-white shadow-amber-900/20'
              : 'bg-slate-900/95 border-purple-500/40 text-white shadow-purple-900/20'
          }`}
        >
          <div className="mt-0.5 shrink-0 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-purple-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">{toast.title}</h4>
            <p className="text-xs mt-0.5 text-slate-400 leading-relaxed font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
