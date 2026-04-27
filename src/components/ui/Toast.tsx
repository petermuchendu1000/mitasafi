/**
 * Toast Notification Component
 * 
 * Clean, minimal notifications for action confirmations.
 * Position: top-center for visibility without obstruction.
 * Design: white background, subtle shadow, minimal color (icon only).
 */

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, X, AlertCircle, Info } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? 3500;

    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const success = useCallback((title: string, message?: string) => {
    showToast({ type: "success", title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: "error", title, message, duration: 6000 });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: "warning", title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: "info", title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// TOAST CONTAINER - Top center position
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// =============================================================================
// TOAST ITEM - Clean, minimal design
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, { icon: typeof Check; color: string }> = {
  success: { icon: Check, color: "text-brand-600" },
  error: { icon: X, color: "text-red-600" },
  warning: { icon: AlertCircle, color: "text-amber-600" },
  info: { icon: Info, color: "text-gray-500" },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { icon: Icon, color } = TOAST_ICONS[toast.type];

  return (
    <div
      className={cn(
        "pointer-events-auto bg-white rounded-md shadow-lg border border-gray-200",
        "px-4 py-2.5 flex items-center gap-2.5",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
      role="alert"
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
      <span className="text-sm text-gray-900">{toast.title}</span>
      {toast.message && (
        <span className="text-sm text-gray-500">{toast.message}</span>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export { ToastContext };
export type { Toast, ToastType };
