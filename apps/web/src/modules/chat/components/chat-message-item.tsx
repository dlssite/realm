import React, { useRef, useState } from 'react';
import { Pin, Trash2, Smile, ShieldCheck, Crown, Paperclip } from 'lucide-react';
import { ChatMessageDto } from '@realm/types';
import { UserProfileCardTrigger } from '@/shared/components/user-profile-card-trigger';

interface ChatMessageItemProps {
  message: ChatMessageDto;
  currentUserId: string;
  /** The current user's effective role in this channel */
  currentUserRole: 'ADMIN' | 'LEADER' | 'MEMBER';
  /** Whether this message immediately follows one from the same sender (compact layout) */
  isGrouped?: boolean;
  /** Date label to show above this message, or null */
  dateDivider?: string | null;
  onDelete: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉', '😂', '💯'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── @mention rendering ─────────────────────────────────────────────────────
/**
 * Splits message text on @Word tokens and returns an array of React nodes.
 * Tokens that start with @ and consist of word characters are rendered as
 * highlighted mention chips.
 *
 * We intentionally keep this simple — a mention is any @-prefixed word
 * that contains no spaces. Names with spaces were collapsed to @FirstLast
 * at insert time in ChatInput.
 */
function renderMessageContent(text: string, currentUserId: string, senderName?: string): React.ReactNode[] {
  // Regex: matches @Word (word = letters, digits, underscores, hyphens)
  const MENTION_RE = /(@[\w-]+)/g;
  const parts = text.split(MENTION_RE);

  return parts.map((part, i) => {
    if (MENTION_RE.test(part)) {
      // Reset lastIndex after test() consumed it
      MENTION_RE.lastIndex = 0;

      const handle = part.slice(1).toLowerCase(); // strip @

      // "everyone" / "here" special keywords
      const isSpecial = handle === 'everyone' || handle === 'here';

      // Check if this mention matches the current user's name (collapsed form)
      const normalizedCurrentName = senderName?.toLowerCase().replace(/\s+/g, '') ?? '';
      const isSelf = !isSpecial && normalizedCurrentName === handle;

      return (
        <span
          key={i}
          className={`inline-flex items-center rounded px-1 py-0 font-semibold text-[12px] leading-snug
            ${isSpecial
              ? 'bg-[#f59e0b]/15 text-[#fbbf24] ring-1 ring-[#f59e0b]/30'
              : isSelf
              ? 'bg-[#7c3aed]/25 text-[#c4b5fd] ring-1 ring-[#7c3aed]/50'
              : 'bg-[#7c3aed]/10 text-[#a78bfa] hover:bg-[#7c3aed]/20 transition-colors cursor-default'
            }`}
        >
          {part}
        </span>
      );
    }
    // Plain text — preserve whitespace/newlines
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ── component ──────────────────────────────────────────────────────────────

export function ChatMessageItem({
  message,
  currentUserId,
  currentUserRole,
  isGrouped = false,
  dateDivider = null,
  onDelete,
  onTogglePin,
  onToggleReaction,
}: ChatMessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isAuthor = message.senderId === currentUserId;
  const isAdmin  = currentUserRole === 'ADMIN';
  const isLeader = currentUserRole === 'LEADER';
  const canDelete = isAuthor || isAdmin || isLeader;
  const canPin    = isAuthor || isAdmin || isLeader;

  // Group reactions by emoji
  const reactionGroups: Record<
    string,
    { emoji: string; count: number; users: string[]; hasReacted: boolean }
  > = {};
  if (message.reactions) {
    for (const r of message.reactions) {
      const g = reactionGroups[r.emoji] ?? {
        emoji: r.emoji, count: 0, users: [], hasReacted: false,
      };
      g.count += 1;
      if (r.userName) g.users.push(r.userName);
      if (r.userId === currentUserId) g.hasReacted = true;
      reactionGroups[r.emoji] = g;
    }
  }

  const senderInitial = message.sender.name?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* ── Date Divider ───────────────────────────────────────────────── */}
      {dateDivider && (
        <div className="flex items-center gap-3 px-4 py-2 select-none">
          <div className="flex-1 h-px bg-[#1f1f23]" />
          <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest px-2">
            {dateDivider}
          </span>
          <div className="flex-1 h-px bg-[#1f1f23]" />
        </div>
      )}

      {/* ── Message row ────────────────────────────────────────────────── */}
      <div
        className={`group relative flex items-start gap-3 px-4 transition-colors duration-100 rounded-lg
          ${isGrouped ? 'py-0.5' : 'pt-3 pb-1'}
          ${message.isPinned
            ? 'bg-[#fbbf24]/[0.04] border-l-2 border-[#fbbf24]/60'
            : 'hover:bg-white/[0.02]'
          }`}
      >
        {/* ── Left: avatar or compact-time spacer ─────────────────────── */}
        <div className="w-9 flex-shrink-0 flex justify-center">
          {isGrouped ? (
            <span className="hidden group-hover:block text-[9px] text-[#3f3f46] font-mono
              leading-none mt-1 select-none">
              {formatTime(message.createdAt)}
            </span>
          ) : (
            <UserProfileCardTrigger userId={message.sender.id}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#27272a] to-[#18181b]
                border border-[#2e2e32] flex items-center justify-center text-sm font-bold
                text-[#a1a1aa] overflow-hidden flex-shrink-0 select-none cursor-pointer
                hover:ring-2 hover:ring-[#7c3aed]/50 transition-all">
                {message.sender.avatarUrl ? (
                  <img
                    src={message.sender.avatarUrl}
                    alt={message.sender.name}
                    className="w-full h-full object-cover"
                  />
                ) : senderInitial}
              </div>
            </UserProfileCardTrigger>
          )}
        </div>

        {/* ── Right: content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Header — only on the first message of a group */}
          {!isGrouped && (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
              <UserProfileCardTrigger userId={message.sender.id}>
                <span className="text-[13px] font-semibold text-[#fafafa] leading-none
                  hover:text-[#a78bfa] hover:underline underline-offset-2 transition-colors cursor-pointer">
                  {message.sender.name}
                </span>
              </UserProfileCardTrigger>

              {isAdmin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                  px-1.5 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24]
                  border border-[#fbbf24]/25 leading-none">
                  <ShieldCheck className="w-2.5 h-2.5" />Admin
                </span>
              )}
              {isLeader && !isAdmin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                  px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#a78bfa]
                  border border-[#7c3aed]/25 leading-none">
                  <Crown className="w-2.5 h-2.5" />Leader
                </span>
              )}

              <span
                className="text-[10px] text-[#52525b] font-mono leading-none"
                title={formatFullDate(message.createdAt)}
              >
                {formatTime(message.createdAt)}
              </span>

              {message.isEdited && (
                <span className="text-[9px] text-[#52525b] italic leading-none">(edited)</span>
              )}
              {message.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                  px-1.5 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24]
                  border border-[#fbbf24]/20 leading-none">
                  <Pin className="w-2.5 h-2.5" />Pinned
                </span>
              )}
            </div>
          )}

          {/* ── Message body with @mention highlighting ─────────────── */}
          <p className="text-[13px] text-[#d4d4d8] leading-relaxed whitespace-pre-wrap break-words">
            {renderMessageContent(message.content, currentUserId, message.sender.name)}
          </p>

          {/* Inline badges for grouped messages */}
          {isGrouped && (message.isPinned || message.isEdited) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {message.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold
                  px-1.5 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24]
                  border border-[#fbbf24]/20 leading-none">
                  <Pin className="w-2.5 h-2.5" />Pinned
                </span>
              )}
              {message.isEdited && (
                <span className="text-[9px] text-[#52525b] italic leading-none">(edited)</span>
              )}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#0f0f12] border border-[#1f1f23]
                    hover:border-[#7c3aed]/50 text-xs text-[#a78bfa] px-2.5 py-1.5 rounded-md
                    transition-colors max-w-xs"
                >
                  <Paperclip className="w-3 h-3 text-[#71717a] flex-shrink-0" />
                  <span className="truncate">{att.filename}</span>
                </a>
              ))}
            </div>
          )}

          {/* Reaction pills */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {Object.values(reactionGroups).map(rg => (
                <button
                  key={rg.emoji}
                  onClick={() => onToggleReaction(message.id, rg.emoji)}
                  title={rg.users.join(', ')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                    font-medium transition-all
                    ${rg.hasReacted
                      ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40 scale-105'
                      : 'bg-[#141417] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46] hover:text-[#fafafa]'
                    }`}
                >
                  <span className="text-sm leading-none">{rg.emoji}</span>
                  <span className="font-mono text-[10px]">{rg.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Hover action bar ─────────────────────────────────────────── */}
        <div className="absolute right-3 top-1.5 hidden group-hover:flex items-center gap-0.5
          bg-[#0c0c0e] border border-[#27272a] rounded-lg px-1 py-1
          shadow-xl shadow-black/40 z-20">

          {/* Emoji picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              className="p-1.5 text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23]
                rounded-md transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute right-0 bottom-full mb-1.5 bg-[#0c0c0e] border border-[#27272a]
                rounded-xl p-1.5 flex items-center gap-0.5 shadow-2xl shadow-black/60 z-30
                animate-in fade-in zoom-in-95 duration-100">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 rounded-md text-base hover:bg-[#1f1f23]
                      transition-all hover:scale-125 leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pin */}
          {canPin && (
            <button
              onClick={() => onTogglePin(message.id)}
              className={`p-1.5 rounded-md transition-colors
                ${message.isPinned
                  ? 'text-[#fbbf24] bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20'
                  : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23]'
                }`}
              title={message.isPinned ? 'Unpin' : 'Pin message'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1.5 text-[#71717a] hover:text-[#ef4444]
                hover:bg-[#ef4444]/10 rounded-md transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
