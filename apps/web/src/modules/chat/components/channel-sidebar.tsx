import React, { useState } from 'react';
import { Hash, Users2, FolderKanban, Plus, Search, MessageSquare, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { ChannelDto } from '@realm/types';
import { useChatStore } from '../../../app/stores/use-chat.store';

interface ChannelSidebarProps {
  channels: ChannelDto[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenCreateModal: () => void;
  isAdminOrOwner: boolean;
}

export function ChannelSidebar({
  channels,
  activeChannelId,
  onSelectChannel,
  onOpenCreateModal,
  isAdminOrOwner,
}: ChannelSidebarProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const isConnected = useChatStore((state) => state.isConnected);
  const isConnecting = useChatStore((state) => state.isConnecting);

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const generalChannels = filteredChannels.filter((c) => c.type === 'GENERAL' || c.type === 'CUSTOM');
  const teamChannels = filteredChannels.filter((c) => c.type === 'TEAM');
  const projectChannels = filteredChannels.filter((c) => c.type === 'PROJECT');

  return (
    <div className="w-64 bg-[#09090b] border-r border-[#1f1f23] flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f23] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-[#7c3aed]" />
          <h2 className="text-sm font-bold tracking-tight text-[#fafafa]">Workspace Chat</h2>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={onOpenCreateModal}
            title="Create Custom Channel"
            className="p-1 rounded bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#52525b]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search channels..."
            className="w-full bg-[#0c0c0e] border border-[#1f1f23] rounded px-8 py-1.5 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
        </div>
      </div>

      {/* Channel Groups List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
        {/* General & Custom Channels */}
        <div>
          <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
            <span>Channels</span>
            <span className="font-mono text-[9px] text-[#52525b]">{generalChannels.length}</span>
          </div>
          <div className="space-y-0.5">
            {generalChannels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? 'bg-[#7c3aed]/20 text-[#a78bfa] font-semibold border border-[#7c3aed]/30'
                      : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#a78bfa]' : 'text-[#52525b]'}`} />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  {channel.unreadCount && channel.unreadCount > 0 ? (
                    <span className="bg-[#7c3aed] text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                      {channel.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Channels */}
        {teamChannels.length > 0 && (
          <div>
            <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
              <span className="flex items-center space-x-1">
                <Users2 className="w-3 h-3 text-[#a78bfa]" />
                <span>Team Chats</span>
              </span>
              <span className="font-mono text-[9px] text-[#52525b]">{teamChannels.length}</span>
            </div>
            <div className="space-y-0.5">
              {teamChannels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#7c3aed]/20 text-[#a78bfa] font-semibold border border-[#7c3aed]/30'
                        : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Users2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#a78bfa]' : 'text-[#71717a]'}`} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Channels */}
        {projectChannels.length > 0 && (
          <div>
            <div className="px-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
              <span className="flex items-center space-x-1">
                <FolderKanban className="w-3 h-3 text-[#60a5fa]" />
                <span>Project Chats</span>
              </span>
              <span className="font-mono text-[9px] text-[#52525b]">{projectChannels.length}</span>
            </div>
            <div className="space-y-0.5">
              {projectChannels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#7c3aed]/20 text-[#a78bfa] font-semibold border border-[#7c3aed]/30'
                        : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#a78bfa]' : 'text-[#60a5fa]'}`} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Connection Status */}
      <div className="p-3 border-t border-[#1f1f23] bg-[#0c0c0e] flex items-center justify-between text-xs text-[#71717a]">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[11px] text-[#22c55e] font-medium">Realtime Active</span>
            </>
          ) : isConnecting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#eab308] animate-ping" />
              <span className="text-[11px] text-[#eab308]">Connecting WS...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-[11px] text-[#ef4444]">Disconnected</span>
            </>
          )}
        </div>
        {isAdminOrOwner && (
          <span className="text-[9px] bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30 px-1.5 py-0.5 rounded font-mono flex items-center space-x-0.5">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>Admin</span>
          </span>
        )}
      </div>
    </div>
  );
}
