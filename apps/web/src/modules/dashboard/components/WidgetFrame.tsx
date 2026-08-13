import React from 'react';
import { AlertCircle, RefreshCw, LucideIcon } from 'lucide-react';

interface WidgetFrameProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function WidgetFrame({
  title,
  description,
  icon: Icon,
  headerAction,
  isLoading = false,
  error = null,
  onRetry,
  children,
  className = '',
}: WidgetFrameProps) {
  return (
    <div
      className={`border border-[#1f1f23] bg-[#0c0c0e] hover:border-[#27272a] transition duration-200 rounded-xl p-5 shadow-sm overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#18181b]">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a78bfa] flex-shrink-0">
            <Icon className="w-4 h-4 text-[#7c3aed]" />
          </div>
          <div className="truncate">
            <h3 className="text-sm font-semibold text-[#fafafa] tracking-tight truncate">{title}</h3>
            {description && (
              <p className="text-[11px] text-[#71717a] truncate font-normal">{description}</p>
            )}
          </div>
        </div>

        {headerAction && <div className="flex items-center space-x-2 flex-shrink-0 ml-2">{headerAction}</div>}
      </div>

      {/* Widget Content Body */}
      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-4 bg-[#18181b] rounded w-3/4" />
            <div className="h-4 bg-[#18181b] rounded w-1/2" />
            <div className="h-4 bg-[#18181b] rounded w-5/6" />
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-[#f87171] mx-auto" />
            <p className="text-xs text-[#a1a1aa]">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-1.5 text-xs text-[#a78bfa] hover:text-white bg-[#7c3aed]/10 px-2.5 py-1 rounded-md transition border border-[#7c3aed]/20"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
