import React, { useState } from 'react';
import { Pin, Trash2, Smile, ShieldCheck, Crown, Paperclip } from 'lucide-react';
import { ChatMessageDto } from '@realm/types';

interface ChatMessageItemProps {
  message: ChatMessageDto;
  currentUserId: string;
  isLeader: boolean;
  isAdmin: boolean;
  onDelete: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉'];

export function ChatMessageItem({
  message,
  currentUserId,
  isLeader,
  isAdmin,
  onDelete,
  onTogglePin,
  onToggleReaction,
}: ChatMessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isAuthor = message.senderId === currentUserId;
  const canDelete = isAuthor || isLeader || isAdmin;
  const canPin = isAuthor || isLeader || isAdmin;

  // Group reactions by emoji
  const reactionGroups: Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }> = {};
  if (message.reactions) {
    message.reactions.forEach((r) => {
      const group = reactionGroups[r.emoji] || { emoji: r.emoji, count: 0, users: [], hasReacted: false };
      group.count += 1;
      if (r.userName) group.users.push(r.userName);
      if (r.userId === currentUserId) group.hasReacted = true;
      reactionGroups[r.emoji] = group;
    });
  }

  return (
    <div className={`group relative flex space-x-3 px-4 py-2 hover:bg-[#141417]/60 rounded-lg transition-colors ${message.isPinned ? 'bg-[#fbbf24]/5 border-l-2 border-[#fbbf24]' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-xs font-bold text-[#fafafa] shrink-0 overflow-hidden">
        {message.sender.avatarUrl ? (
          <img src={message.sender.avatarUrl} alt={message.sender.name} className="w-full h-full object-cover" />
        ) : (
          message.sender.name[0]?.toUpperCase()
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-xs text-[#fafafa]">{message.sender.name}</span>

          {/* Role Badges */}
          {isAdmin && (
            <span className="text-[9px] bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 px-1 py-0.2 rounded font-medium flex items-center space-x-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Admin</span>
            </span>
          )}
          {isLeader && !isAdmin && (
            <span className="text-[9px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/30 px-1 py-0.2 rounded font-medium flex items-center space-x-0.5">
              <Crown className="w-2.5 h-2.5" />
              <span>Leader</span>
            </span>
          )}

          <span className="text-[10px] text-[#71717a] font-mono">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {message.isPinned && (
            <span className="flex items-center space-x-0.5 text-[9px] text-[#fbbf24] bg-[#fbbf24]/10 px-1.5 py-0.2 rounded">
              <Pin className="w-2.5 h-2.5" />
              <span>Pinned</span>
            </span>
          )}
        </div>

        {/* Message Text */}
        <p className="text-xs text-[#e4e4e7] mt-1 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 bg-[#09090b] border border-[#1f1f23] hover:border-[#7c3aed] text-xs text-[#a78bfa] px-2.5 py-1.5 rounded transition-colors"
              >
                <Paperclip className="w-3 h-3 text-[#71717a]" />
                <span className="truncate max-w-xs">{att.filename}</span>
              </a>
            ))}
          </div>
        )}

        {/* Reaction Pills */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Object.values(reactionGroups).map((rg) => (
            <button
              key={rg.emoji}
              onClick={() => onToggleReaction(message.id, rg.emoji)}
              title={rg.users.join(', ')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                rg.hasReacted
                  ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40'
                  : 'bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46]'
              }`}
            >
              <span>{rg.emoji}</span>
              <span className="font-mono text-[10px]">{rg.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hover Action Bar */}
      <div className="absolute right-4 top-2 hidden group-hover:flex items-center space-x-1 bg-[#09090b] border border-[#27272a] rounded-md p-1 shadow-lg z-10">
        {/* Reaction trigger */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#1f1f23] rounded transition-colors"
            title="Add Reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute right-0 top-7 bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-1.5 flex items-center space-x-1 shadow-xl z-20">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="hover:bg-[#1f1f23] p-1 rounded text-sm transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {canPin && (
          <button
            onClick={() => onTogglePin(message.id)}
            className={`p-1 rounded transition-colors ${
              message.isPinned ? 'text-[#fbbf24] bg-[#fbbf24]/10' : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#1f1f23]'
            }`}
            title={message.isPinned ? 'Unpin message' : 'Pin message'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
