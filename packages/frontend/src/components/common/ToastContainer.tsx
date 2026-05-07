import { useToastStore, type ToastType } from '../../stores/toast.store';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const icons: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  error: 'bg-red-950 border-red-500/50 text-red-100',
  success: 'bg-green-950 border-green-500/50 text-green-100',
  warning: 'bg-yellow-950 border-yellow-500/50 text-yellow-100',
  info: 'bg-blue-950 border-blue-500/50 text-blue-100',
};

const iconStyles: Record<ToastType, string> = {
  error: 'text-red-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border rounded-xl p-4 shadow-2xl animate-[slideIn_0.3s_ease-out] ${styles[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[toast.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm mt-1 opacity-80">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
