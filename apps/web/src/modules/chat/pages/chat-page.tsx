import React, { useEffect, useState } from 'react';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { useAuthStore } from '../../../app/stores/auth.store';
import { ChannelSidebar } from '../components/channel-sidebar';
import { ChatCanvas } from '../components/chat-canvas';
import { CreateChannelModal } from '../components/create-channel-modal';

export default function ChatPage() {
  const { workspace } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // On mobile the channel sidebar is hidden by default; user opens it with the menu button
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const {
    channels,
    activeChannelId,
    messages,
    typingUsers,
    connectWs,
    disconnectWs,
    fetchChannels,
    setActiveChannelId,
    sendMessage,
    deleteMessage,
    togglePin,
    toggleReaction,
  } = useChatStore();

  useEffect(() => {
    fetchChannels();
    connectWs();
    return () => { disconnectWs(); };
  }, [workspace?.id]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;
  const activeMessages = activeChannelId ? messages[activeChannelId] || [] : [];
  const activeTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  const isAdminOrOwner = true;

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    // Auto-close mobile sidebar after selecting a channel
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-[#060608] overflow-hidden relative">

      {/* ── Mobile sidebar overlay backdrop ── */}
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Channel Sidebar ──
           Desktop: always visible (w-64 static)
           Mobile:  slide-over from left, hidden by default */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-40
          transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          h-full flex-shrink-0
        `}
      >
        <ChannelSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          isAdminOrOwner={isAdminOrOwner}
        />
      </div>

      {/* ── Main Chat Canvas ── */}
      <ChatCanvas
        channel={activeChannel}
        messages={activeMessages}
        typingUsers={activeTyping}
        onSendMessage={sendMessage}
        onDeleteMessage={deleteMessage}
        onTogglePin={togglePin}
        onToggleReaction={toggleReaction}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Create Custom Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export { ChatPage };
