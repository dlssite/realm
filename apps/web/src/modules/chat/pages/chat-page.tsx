import React, { useEffect, useState } from 'react';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { useAuthStore } from '../../../app/stores/auth.store';
import { ChannelSidebar } from '../components/channel-sidebar';
import { ChatCanvas } from '../components/chat-canvas';
import { CreateChannelModal } from '../components/create-channel-modal';

export default function ChatPage() {
  const { workspace, user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null;
  const activeMessages = activeChannelId ? (messages[activeChannelId] ?? []) : [];
  const activeTyping   = activeChannelId ? (typingUsers[activeChannelId] ?? []) : [];

  // Derive real isAdminOrOwner from the workspace-level role stored in auth
  const wsRole = workspace?.role;
  const isAdminOrOwner = wsRole === 'OWNER' || wsRole === 'ADMIN';

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-[#060608] overflow-hidden relative">

      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Channel sidebar */}
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

      {/* Main canvas */}
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

      {/* Create channel modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export { ChatPage };
