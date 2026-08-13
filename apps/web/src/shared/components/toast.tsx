/**
 * Toast notification system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Page created');
 *   toast.error('Something went wrong');
 *   toast.info('Copied to clipboard');
 *   toast.warning('Unsaved changes');
 */

import React, { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id:       string;
  variant:  ToastVariant;
  title:    string;
  body?:    string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ToastStore {
  toasts: ToastItem[];
  add:    (item: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add(item) {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    return id;
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

// ── Config ────────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, {
  Icon:       React.ElementType;
  iconColor:  string;
  iconBg:     string;
  border:     string;
  bar:        string;
  duration:   number;
}> = {
  success: {
    Icon:      CheckCircle2,
    iconColor: 'text-[#34d399]',
    iconBg:    'bg-[#34d399]/10',
    border:    'border-[#34d399]/20',
    bar:       'bg-[#34d399]',
    duration:  3500,
  },
  error: {
    Icon:      XCircle,
    iconColor: 'text-[#f87171]',
    iconBg:    'bg-[#f87171]/10',
    border:    'border-[#f87171]/20',
    bar:       'bg-[#f87171]',
    duration:  5000,
  },
  info: {
    Icon:      Info,
    iconColor: 'text-[#60a5fa]',
    iconBg:    'bg-[#60a5fa]/10',
    border:    'border-[#60a5fa]/20',
    bar:       'bg-[#60a5fa]',
    duration:  3500,
  },
  warning: {
    Icon:      AlertTriangle,
    iconColor: 'text-[#facc15]',
    iconBg:    'bg-[#facc15]/10',
    border:    'border-[#facc15]/20',
    bar:       'bg-[#facc15]',
    duration:  4000,
  },
};

// ── Single Toast ──────────────────────────────────────────────────────────────

function Toast({ item }: { item: ToastItem }) {
  const remove  = useToastStore((s) => s.remove);
  const cfg     = VARIANT_CONFIG[item.variant];

  useEffect(() => {
    const timer = setTimeout(() => remove(item.id), cfg.duration);
    return () => clearTimeout(timer);
  }, [item.id, cfg.duration, remove]);

  return (
    <div
      className={`
        relative flex items-start gap-3 w-full max-w-sm
        bg-[#111113] border ${cfg.border} rounded-xl
        shadow-2xl shadow-black/40 px-4 py-3.5
        animate-in slide-in-from-right-5 fade-in duration-300
        overflow-hidden
      `}
      role="alert"
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] ${cfg.bar} opacity-60 rounded-full`}
        style={{
          animation: `shrink ${cfg.duration}ms linear forwards`,
        }}
      />

      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center mt-0.5`}>
        <cfg.Icon className={`w-4 h-4 ${cfg.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-[#fafafa] leading-snug">{item.title}</p>
        {item.body && (
          <p className="text-xs text-[#71717a] mt-0.5 leading-relaxed">{item.body}</p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => remove(item.id)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-[#27272a] transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-[#52525b] hover:text-[#a1a1aa]" />
      </button>
    </div>
  );
}

// ── Provider (render this once in App.tsx) ────────────────────────────────────

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <Toast item={t} />
          </div>
        ))}
      </div>
    </>
  );
}
