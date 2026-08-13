import React, { useRef, useEffect, useState } from 'react';
import { Hash, Users2, FolderKanban, Pin, Info, ShieldCheck, Crown, Menu } from 'lucide-react';
import { ChannelDto, ChatMessageDto } from '@realm/types';
import { ChatMessageItem } from './chat-message-item';
import { ChatInput } from './chat-input';
import { PinnedMessagesDrawer } from './pinned-messages-drawer';
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
  /** Called when the mobile "open sidebar" button is tapped */
  onOpenSidebar?: () => void;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const currentUserId = user?.id || '';
  const isAdmin = true; // In development / workspace scope, admins have elevated rights
  const isLeader = channel?.type === 'TEAM';

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#060608] text-[#52525b]">
        {/* Mobile — button to open sidebar when no channel selected */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden mb-6 flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141417] border border-[#1f1f23] text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
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

  const pinnedCount = messages.filter((m) => m.isPinned).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060608] relative overflow-hidden">
      {/* Channel Header */}
      <div className="px-3 sm:px-5 py-3 border-b border-[#1f1f23] bg-[#09090b] flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Mobile: hamburger to open sidebar */}
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="md:hidden p-1.5 rounded-md text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417] transition-colors flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          {channel.type === 'GENERAL' || channel.type === 'CUSTOM' ? (
            <Hash className="w-5 h-5 text-[#a78bfa] flex-shrink-0" />
          ) : channel.type === 'TEAM' ? (
            <Users2 className="w-5 h-5 text-[#a78bfa] flex-shrink-0" />
          ) : (
            <FolderKanban className="w-5 h-5 text-[#60a5fa] flex-shrink-0" />
          )}

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
              <h2 className="text-sm font-bold text-[#fafafa] truncate">{channel.name}</h2>
              {channel.team && (
                <span className="text-[10px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/30 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                  {channel.team.name}
                </span>
              )}
              {channel.project && (
                <span className="text-[10px] bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30 px-1.5 py-0.2 rounded font-mono font-semibold flex-shrink-0">
                  {channel.project.identifier}
                </span>
              )}
            </div>
            {channel.description && (
              <p className="text-xs text-[#71717a] mt-0.5 truncate max-w-[180px] sm:max-w-lg">{channel.description}</p>
            )}
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPinnedDrawer(true)}
            className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
              pinnedCount > 0
                ? 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 hover:bg-[#fbbf24]/20'
                : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417]'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span className="font-medium">Pinned</span>
            <span className="font-mono text-[10px]">({pinnedCount})</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#71717a] py-16">
            <div className="w-12 h-12 rounded-full bg-[#141417] border border-[#1f1f23] flex items-center justify-center mb-3 text-[#a78bfa]">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#fafafa]">Welcome to #{channel.name}!</h3>
            <p className="text-xs text-[#71717a] mt-1 max-w-sm">
              This is the beginning of the #{channel.name} channel. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              isLeader={isLeader}
              isAdmin={isAdmin}
              onDelete={onDeleteMessage}
              onTogglePin={onTogglePin}
              onToggleReaction={onToggleReaction}
            />
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-xs text-[#a78bfa] italic px-4 py-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
            <span>
              {typingUsers.map((u) => u.userName).join(', ')}{' '}
              {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <ChatInput channelName={channel.name} onSendMessage={onSendMessage} />

      {/* Slide-over Pinned Messages Drawer */}
      <PinnedMessagesDrawer
        isOpen={showPinnedDrawer}
        onClose={() => setShowPinnedDrawer(false)}
        messages={messages}
      />
    </div>
  );
}
