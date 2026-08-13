import React from 'react';
import { X, History, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';

type VersionItem = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeSummary?: string | null;
  createdById?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  versions: VersionItem[];
  isLoading: boolean;
  onRestoreVersion: (versionId: string) => void;
};

export function VersionHistoryDrawer({ isOpen, onClose, versions, isLoading, onRestoreVersion }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md bg-[#0c0c0e] border-l border-[#1f1f23] shadow-2xl transition-transform transform duration-200">
      <div className="flex flex-col w-full h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f23] bg-[#09090b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#fafafa]">Version History</h2>
              <p className="text-xs text-[#a1a1aa]">Snapshot telemetry & restore points</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-[#a1a1aa]">
              <Clock className="w-4 h-4 animate-spin mr-2 text-[#7c3aed]" />
              Loading history snapshots...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#a1a1aa]">
              No version history snapshots recorded yet.
            </div>
          ) : (
            versions.map((version, index) => {
              const isCurrent = index === 0;
              return (
                <div
                  key={version.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isCurrent
                      ? 'bg-[#121216] border-[#7c3aed]/40'
                      : 'bg-[#0f0f11] border-[#1f1f23] hover:border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#7c3aed]/15 text-[#a78bfa] text-xs font-semibold">
                        v{version.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="flex items-center text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </span>
                      )}
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => onRestoreVersion(version.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#7c3aed] text-white text-xs font-medium transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-[#a1a1aa] flex items-center space-x-1.5 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(version.createdAt).toLocaleString()}</span>
                  </div>
                  {version.changeSummary && (
                    <div className="text-xs text-[#cbd5e1] mt-2 bg-[#09090b] p-2 rounded border border-[#1f1f23]">
                      {version.changeSummary}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryDrawer;
