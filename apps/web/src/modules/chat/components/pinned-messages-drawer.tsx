import React from 'react';
import { Pin, X } from 'lucide-react';
import { ChatMessageDto } from '@realm/types';

interface PinnedMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessageDto[];
}

export function PinnedMessagesDrawer({ isOpen, onClose, messages }: PinnedMessagesDrawerProps) {
  if (!isOpen) return null;

  const pinnedMsgs = messages.filter((m) => m.isPinned);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-[#0c0c0e] border-l border-[#1f1f23] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23] bg-[#09090b]">
        <div className="flex items-center space-x-2 text-[#fbbf24]">
          <Pin className="w-4 h-4" />
          <h3 className="text-sm font-semibold text-[#fafafa]">Pinned Messages</h3>
          <span className="text-xs font-mono text-[#a1a1aa]">({pinnedMsgs.length})</span>
        </div>
        <button onClick={onClose} className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#1f1f23]">
        {pinnedMsgs.length === 0 ? (
          <div className="text-center py-10 text-[#71717a] text-xs">
            <Pin className="w-8 h-8 text-[#27272a] mx-auto mb-2 opacity-50" />
            No pinned messages in this channel yet.
          </div>
        ) : (
          pinnedMsgs.map((msg) => (
            <div key={msg.id} className="pt-3 first:pt-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#a78bfa]">{msg.sender.name}</span>
                <span className="text-[10px] text-[#71717a] font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-[#e4e4e7] bg-[#141417] p-2.5 rounded border border-[#1f1f23] whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
