import React, { useState } from 'react';
import {
  Hash, Users2, FolderKanban, Plus, Search,
  MessageSquare, ShieldCheck, Crown,
} from 'lucide-react';
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
  const isConnected  = useChatStore(s => s.isConnected);
  const isConnecting = useChatStore(s => s.isConnecting);

  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const generalChannels = filtered.filter(c => c.type === 'GENERAL' || c.type === 'CUSTOM');
  const teamChannels    = filtered.filter(c => c.type === 'TEAM');
  const projectChannels = filtered.filter(c => c.type === 'PROJECT');

  return (
    <div className="w-64 bg-[#09090b] border-r border-[#1f1f23] flex flex-col h-full select-none">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-[#1f1f23] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#7c3aed]" />
          <h2 className="text-sm font-bold tracking-tight text-[#fafafa]">Workspace Chat</h2>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={onOpenCreateModal}
            title="Create Custom Channel"
            className="p-1 rounded-md bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa]
              hover:bg-[#27272a] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Search channels…"
            className="w-full bg-[#0c0c0e] border border-[#1f1f23] rounded-md
              pl-8 pr-3 py-1.5 text-xs text-[#fafafa] placeholder-[#52525b]
              focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
        </div>
      </div>

      {/* ── Channel groups ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">

        {/* General & Custom */}
        <ChannelGroup
          label="Channels"
          count={generalChannels.length}
          channels={generalChannels}
          activeChannelId={activeChannelId}
          onSelect={onSelectChannel}
          renderIcon={ch => (
            <Hash className={`w-3.5 h-3.5 shrink-0 ${ch.id === activeChannelId ? 'text-[#a78bfa]' : 'text-[#52525b]'}`} />
          )}
          renderRoleBadge={ch => <ChannelRoleBadge role={ch.currentUserRole ?? undefined} />}
        />

        {/* Team channels */}
        {teamChannels.length > 0 && (
          <ChannelGroup
            label="Team Chats"
            labelIcon={<Users2 className="w-3 h-3 text-[#a78bfa]" />}
            count={teamChannels.length}
            channels={teamChannels}
            activeChannelId={activeChannelId}
            onSelect={onSelectChannel}
            renderIcon={ch => (
              <Users2 className={`w-3.5 h-3.5 shrink-0 ${ch.id === activeChannelId ? 'text-[#a78bfa]' : 'text-[#71717a]'}`} />
            )}
            renderRoleBadge={ch => <ChannelRoleBadge role={ch.currentUserRole ?? undefined} />}
          />
        )}

        {/* Project channels */}
        {projectChannels.length > 0 && (
          <ChannelGroup
            label="Project Chats"
            labelIcon={<FolderKanban className="w-3 h-3 text-[#60a5fa]" />}
            count={projectChannels.length}
            channels={projectChannels}
            activeChannelId={activeChannelId}
            onSelect={onSelectChannel}
            renderIcon={ch => (
              <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${ch.id === activeChannelId ? 'text-[#a78bfa]' : 'text-[#60a5fa]'}`} />
            )}
            renderRoleBadge={ch => <ChannelRoleBadge role={ch.currentUserRole ?? undefined} />}
          />
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-t border-[#1f1f23] bg-[#0c0c0e] flex items-center
        justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-[#22c55e] font-medium">Live</span>
            </>
          ) : isConnecting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#eab308] animate-ping flex-shrink-0" />
              <span className="text-[11px] text-[#eab308]">Connecting…</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0" />
              <span className="text-[11px] text-[#ef4444]">Offline</span>
            </>
          )}
        </div>

        {isAdminOrOwner && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5
            rounded bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/30 leading-none">
            <ShieldCheck className="w-2.5 h-2.5" />
            Admin
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ChannelRoleBadge({ role }: { role?: string | undefined }) {
  if (!role || role === 'MEMBER') return null;
  if (role === 'ADMIN') {
    return (
      <span title="Channel Admin" className="flex-shrink-0">
        <ShieldCheck className="w-2.5 h-2.5 text-[#fbbf24]" />
      </span>
    );
  }
  if (role === 'LEADER') {
    return (
      <span title="Team Leader" className="flex-shrink-0">
        <Crown className="w-2.5 h-2.5 text-[#a78bfa]" />
      </span>
    );
  }
  return null;
}

interface ChannelGroupProps {
  label: string;
  labelIcon?: React.ReactNode;
  count: number;
  channels: ChannelDto[];
  activeChannelId: string | null;
  onSelect: (id: string) => void;
  renderIcon: (ch: ChannelDto) => React.ReactNode;
  renderRoleBadge?: (ch: ChannelDto) => React.ReactNode;
}

function ChannelGroup({
  label,
  labelIcon,
  count,
  channels,
  activeChannelId,
  onSelect,
  renderIcon,
  renderRoleBadge,
}: ChannelGroupProps) {
  return (
    <div>
      {/* Group label */}
      <div className="px-2 mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
          {labelIcon}
          {label}
        </span>
        <span className="font-mono text-[9px] text-[#3f3f46]">{count}</span>
      </div>

      {/* Channel buttons */}
      <div className="space-y-0.5">
        {channels.map(ch => {
          const isActive = ch.id === activeChannelId;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md
                text-xs transition-colors group
                ${isActive
                  ? 'bg-[#7c3aed]/20 text-[#a78bfa] font-semibold border border-[#7c3aed]/30'
                  : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#141417] border border-transparent'
                }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                {renderIcon(ch)}
                <span className="truncate">{ch.name}</span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Role indicator (shield / crown) */}
                {renderRoleBadge?.(ch)}

                {/* Unread badge */}
                {ch.unreadCount && ch.unreadCount > 0 ? (
                  <span className="bg-[#7c3aed] text-white font-bold text-[9px]
                    px-1.5 py-0.5 rounded-full leading-none">
                    {ch.unreadCount > 99 ? '99+' : ch.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
