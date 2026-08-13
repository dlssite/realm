import React, { useRef, useEffect, useState } from 'react';
import {
  Hash, Users2, FolderKanban, Pin, Menu, Settings2,
  ShieldCheck, Crown, Wifi, WifiOff
} from 'lucide-react';
import { ChannelDto, ChatMessageDto, ChannelRole } from '@realm/types';
import { ChatMessageItem } from './chat-message-item';
import { ChatInput } from './chat-input';
import { PinnedMessagesDrawer } from './pinned-messages-drawer';
import { ChatManagePanel } from './chat-manage-panel';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useChatStore } from '../../../app/stores/use-chat.store';

interface ChatCanvasProps {
  channel: ChannelDto | null;
  messages: ChatMessageDto[];
  typingUsers: { userId: string; userName: string }[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  onDeleteMessage: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenSidebar?: () => void;
}

// ── helpers ────────────────────────────────────────────────────────────────

function todayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ── typing indicator ───────────────────────────────────────────────────────

function TypingIndicator({ users }: { users: { userId: string; userName: string }[] }) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0]!.userName
      : users.length === 2
      ? `${users[0]!.userName} and ${users[1]!.userName}`
      : `${users[0]!.userName} and ${users.length - 1} others`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 select-none">
      {/* Animated dots */}
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
      <span className="text-[11px] text-[#71717a] italic">
        <span className="text-[#a78bfa] font-medium not-italic">{names}</span>
        {' '}{users.length === 1 ? 'is' : 'are'} typing…
      </span>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export function ChatCanvas({
  channel,
  messages,
  typingUsers,
  onSendMessage,
  onDeleteMessage,
  onTogglePin,
  onToggleReaction,
  onOpenSidebar,
}: ChatCanvasProps) {
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const isConnected = useChatStore(s => s.isConnected);
  const currentUserId = user?.id ?? '';

  // Resolve the current user's effective role for this channel
  const currentUserRole: ChannelRole =
    channel?.currentUserRole ?? 'MEMBER';

  const isAdmin = currentUserRole === 'ADMIN';
  const isLeader = currentUserRole === 'LEADER';
  const canManage = isAdmin || isLeader;

  // Auto-scroll to bottom on new messages / typing changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#060608] text-[#52525b]">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden mb-6 flex items-center gap-2 px-4 py-2 rounded-lg
              bg-[#141417] border border-[#1f1f23] text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span>Browse Channels</span>
          </button>
        )}
        <Hash className="w-12 h-12 mb-3 text-[#1f1f23]" />
        <p className="text-sm font-medium">Select a channel to start chatting</p>
      </div>
    );
  }

  const pinnedCount = messages.filter(m => m.isPinned).length;

  // ── Build display list: compute grouping and date dividers ──────────────
  const displayItems: Array<{
    message: ChatMessageDto;
    isGrouped: boolean;
    dateDivider: string | null;
    /** The role of this message's sender for badge display — derived from channel role */
    senderRole: ChannelRole;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    const prev = messages[i - 1];

    // Date divider
    let dateDivider: string | null = null;
    if (!prev) {
      dateDivider = todayLabel(msg.createdAt);
    } else {
      const prevDate = new Date(prev.createdAt).toDateString();
      const curDate = new Date(msg.createdAt).toDateString();
      if (prevDate !== curDate) {
        dateDivider = todayLabel(msg.createdAt);
      }
    }

    // Grouping: same sender, within threshold, no date divider break
    const isGrouped =
      !dateDivider &&
      !!prev &&
      prev.senderId === msg.senderId &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_THRESHOLD_MS;

    // Sender role: if this message is from the current user, use their known role;
    // otherwise fall back to MEMBER (backend doesn't send per-sender roles in message DTOs).
    const senderRole: ChannelRole =
      msg.senderId === currentUserId ? currentUserRole : 'MEMBER';

    displayItems.push({ message: msg, isGrouped, dateDivider, senderRole });
  }

  // ── Channel type icon ────────────────────────────────────────────────────
  const ChannelIcon =
    channel.type === 'TEAM'
      ? Users2
      : channel.type === 'PROJECT'
      ? FolderKanban
      : Hash;

  const iconColor =
    channel.type === 'PROJECT' ? 'text-[#60a5fa]' : 'text-[#a78bfa]';

  return (
    <div className="flex-1 flex h-full min-h-0 bg-[#060608] relative overflow-hidden">
      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* ── Channel header ──────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3 border-b border-[#1f1f23] bg-[#09090b]
          flex items-center justify-between z-10 select-none gap-3">

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile sidebar toggle */}
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="md:hidden p-1.5 rounded-md text-[#a1a1aa] hover:text-[#fafafa]
                  hover:bg-[#141417] transition-colors flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <ChannelIcon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-[#fafafa] truncate">{channel.name}</h2>

                {channel.team && (
                  <span className="text-[10px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/30
                    px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                    {channel.team.name}
                  </span>
                )}
                {channel.project && (
                  <span className="text-[10px] bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30
                    px-1.5 py-0.5 rounded font-mono font-semibold flex-shrink-0">
                    {channel.project.identifier}
                  </span>
                )}

                {/* Current user's channel role badge */}
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5
                    rounded bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/25 flex-shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
                {isLeader && !isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5
                    rounded bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/25 flex-shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    Leader
                  </span>
                )}
              </div>

              {channel.description && (
                <p className="text-xs text-[#52525b] mt-0.5 truncate max-w-[180px] sm:max-w-md">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          {/* Header right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* WS status dot */}
            <span
              title={isConnected ? 'Realtime connected' : 'Disconnected'}
              className={`w-2 h-2 rounded-full flex-shrink-0
                ${isConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'}`}
            />

            {/* Pinned messages */}
            <button
              onClick={() => setShowPinnedDrawer(true)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors
                ${pinnedCount > 0
                  ? 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 hover:bg-[#fbbf24]/20'
                  : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#141417] border border-transparent'
                }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="font-medium hidden sm:inline">Pinned</span>
              {pinnedCount > 0 && (
                <span className="font-mono text-[10px]">({pinnedCount})</span>
              )}
            </button>

            {/* Manage button — admins and leaders only */}
            {canManage && (
              <button
                onClick={() => setShowManagePanel(v => !v)}
                className={`p-1.5 rounded-md transition-colors
                  ${showManagePanel
                    ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30'
                    : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#141417] border border-transparent'
                  }`}
                title="Manage channel"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Messages scroll area ─────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#71717a] py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#141417] border border-[#1f1f23]
                flex items-center justify-center mb-4 text-[#a78bfa]">
                <ChannelIcon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#fafafa] mb-1">
                Welcome to #{channel.name}!
              </h3>
              <p className="text-xs text-[#52525b] max-w-sm leading-relaxed">
                {channel.description ?? 'This is the beginning of the channel. Start the conversation!'}
              </p>
            </div>
          ) : (
            <>
              {displayItems.map(({ message, isGrouped, dateDivider, senderRole }) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  isGrouped={isGrouped}
                  dateDivider={dateDivider}
                  onDelete={onDeleteMessage}
                  onTogglePin={onTogglePin}
                  onToggleReaction={onToggleReaction}
                />
              ))}
            </>
          )}

          {/* Typing indicator */}
          <TypingIndicator users={typingUsers} />

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <ChatInput channelName={channel.name} onSendMessage={onSendMessage} />
      </div>

      {/* ── Pinned messages drawer (slide-over) ─────────────────────────── */}
      <PinnedMessagesDrawer
        isOpen={showPinnedDrawer}
        onClose={() => setShowPinnedDrawer(false)}
        messages={messages}
      />

      {/* ── Channel manage panel (slide-over) ───────────────────────────── */}
      {canManage && (
        <ChatManagePanel
          isOpen={showManagePanel}
          onClose={() => setShowManagePanel(false)}
          channel={channel}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
