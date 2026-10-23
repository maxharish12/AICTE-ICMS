import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    // Deduplicate identical title in recent toasts
    setToasts((prev) => {
      const isDuplicate = prev.some((t) => t.title === title && t.type === type);
      if (isDuplicate) return prev;
      return [...prev.slice(-3), { id, type, title, message, duration }]; // keep max 4 toasts
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => addToast('success', title, message, 3500), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast('error', title, message, 7000), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast('warning', title, message, 5000), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast('info', title, message, 4000), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showToast: addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Container: Non-intrusive, top-right, clean stacking */}
      <div 
        aria-live="polite" 
        className="fixed top-14 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-white border-[#23834B] text-gov-text shadow-gov-elevated',
            error: 'bg-white border-[#C62828] text-gov-text shadow-gov-elevated',
            warning: 'bg-white border-[#A96300] text-gov-text shadow-gov-elevated',
            info: 'bg-white border-[#E87524] text-gov-text shadow-gov-elevated',
          }[toast.type];

          const IconComponent = {
            success: <CheckCircle2 className="w-5 h-5 text-[#23834B] shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-[#C62828] shrink-0" />,
            warning: <AlertCircle className="w-5 h-5 text-[#A96300] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#E87524] shrink-0" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-md border-l-4 border flex items-start justify-between gap-3 transition-all animate-in fade-in duration-200 ${typeStyles}`}
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                {IconComponent}
                <div>
                  <h4 className="text-xs font-semibold leading-tight">{toast.title}</h4>
                  {toast.message && (
                    <p className="text-[11px] text-gov-muted mt-0.5 leading-snug">{toast.message}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-gov-muted hover:text-gov-text p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
