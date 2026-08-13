import React, { useEffect, useState } from 'react';
import {
  X, ShieldCheck, Crown, Users2, ShieldPlus, ShieldMinus,
  Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { ChannelDto, ChannelMemberDto, ChannelRole } from '@realm/types';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { useAuthStore } from '../../../app/stores/auth.store';

interface ChatManagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelDto;
  currentUserRole: ChannelRole;
}

// ── helpers ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5
        rounded bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/25 leading-none flex-shrink-0">
        <ShieldCheck className="w-2.5 h-2.5" />
        Admin
      </span>
    );
  }
  if (role === 'LEADER') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5
        rounded bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/25 leading-none flex-shrink-0">
        <Crown className="w-2.5 h-2.5" />
        Leader
      </span>
    );
  }
  return null;
}

function MemberAvatar({ member }: { member: ChannelMemberDto }) {
  const initial = member.user.name?.[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#27272a] to-[#18181b]
      border border-[#2e2e32] flex items-center justify-center text-xs font-bold
      text-[#a1a1aa] overflow-hidden flex-shrink-0 select-none">
      {member.user.avatarUrl ? (
        <img src={member.user.avatarUrl} alt={member.user.name} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export function ChatManagePanel({
  isOpen,
  onClose,
  channel,
  currentUserRole,
}: ChatManagePanelProps) {
  const { user } = useAuthStore();
  const {
    channelMembers,
    isLoadingMembers,
    fetchChannelMembers,
    grantChannelAdmin,
    revokeChannelAdmin,
  } = useChatStore();

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members: ChannelMemberDto[] = channelMembers[channel.id] ?? [];
  const currentUserId = user?.id ?? '';
  const isAdmin = currentUserRole === 'ADMIN';

  // Load members whenever the panel opens (or channel changes)
  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchChannelMembers(channel.id);
    }
  }, [isOpen, channel.id]);

  const handleGrant = async (targetUserId: string) => {
    setError(null);
    setPendingUserId(targetUserId);
    const ok = await grantChannelAdmin(channel.id, targetUserId);
    setPendingUserId(null);
    if (!ok) setError('Failed to grant admin role. You may not have permission.');
  };

  const handleRevoke = async (targetUserId: string) => {
    setError(null);
    setPendingUserId(targetUserId);
    const ok = await revokeChannelAdmin(channel.id, targetUserId);
    setPendingUserId(null);
    if (!ok) setError('Failed to revoke admin role. The user may be a workspace-level admin.');
  };

  // Sort: ADMIN → LEADER → MEMBER; then alphabetically within each group
  const roleOrder: Record<string, number> = { ADMIN: 0, LEADER: 1, MEMBER: 2 };
  const sorted = [...members].sort((a, b) => {
    const ra = roleOrder[a.role.toUpperCase()] ?? 3;
    const rb = roleOrder[b.role.toUpperCase()] ?? 3;
    if (ra !== rb) return ra - rb;
    return a.user.name.localeCompare(b.user.name);
  });

  const adminCount  = members.filter(m => m.role.toUpperCase() === 'ADMIN').length;
  const leaderCount = members.filter(m => m.role.toUpperCase() === 'LEADER').length;
  const memberCount = members.filter(m => m.role.toUpperCase() === 'MEMBER').length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 bottom-0 z-30 w-80 flex flex-col
          bg-[#09090b] border-l border-[#1f1f23] shadow-2xl shadow-black/60
          animate-in slide-in-from-right duration-200"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users2 className="w-4 h-4 text-[#a78bfa] flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#fafafa] truncate">
                Manage Channel
              </h3>
              <p className="text-[10px] text-[#52525b] truncate">#{channel.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Channel info strip ───────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-[#1f1f23] flex-shrink-0 space-y-1">
          {channel.description && (
            <p className="text-xs text-[#71717a] leading-relaxed">{channel.description}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-[#52525b] font-mono">
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {adminCount  > 0 && <span>{adminCount} admin{adminCount  !== 1 ? 's' : ''}</span>}
            {leaderCount > 0 && <span>{leaderCount} leader{leaderCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* ── Permission note ──────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-[#1f1f23] flex-shrink-0">
          <div className="bg-[#141417] border border-[#1f1f23] rounded-lg px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Admin Rules</p>
            <ul className="space-y-1 text-[10px] text-[#52525b] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-2.5 h-2.5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                Workspace Owner &amp; Admin are channel admins everywhere
              </li>
              <li className="flex items-start gap-1.5">
                <Crown className="w-2.5 h-2.5 text-[#a78bfa] flex-shrink-0 mt-0.5" />
                Team Leader is admin in their team's channel
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldPlus className="w-2.5 h-2.5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                Admins can promote/demote other members
              </li>
            </ul>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="mx-4 mt-3 flex items-start gap-2 bg-[#ef4444]/10 border border-[#ef4444]/30
            rounded-lg px-3 py-2.5 text-[11px] text-[#fca5a5] flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* ── Members list ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingMembers && members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-[#52525b]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading members…</span>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-[#52525b]">
              <Users2 className="w-6 h-6" />
              <span className="text-xs">No members found</span>
              <button
                onClick={() => fetchChannelMembers(channel.id)}
                className="text-[10px] text-[#7c3aed] hover:text-[#a78bfa] transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : (
            <div className="py-2">
              {sorted.map(member => {
                const role = member.role.toUpperCase() as 'ADMIN' | 'LEADER' | 'MEMBER';
                const isMe = member.userId === currentUserId;
                const isPending = pendingUserId === member.userId;

                // Can we act on this member?
                // - Can't act on yourself
                // - Can't demote workspace-level admins (server will reject, but hide UI too)
                // - Leaders in TEAM channels can't be demoted here
                const isTeamLeader = role === 'LEADER' && channel.type === 'TEAM';
                const canActOnMember = isAdmin && !isMe && !isTeamLeader;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f0f12] transition-colors
                      ${isMe ? 'bg-[#7c3aed]/5' : ''}`}
                  >
                    <MemberAvatar member={member} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold truncate ${isMe ? 'text-[#a78bfa]' : 'text-[#e4e4e7]'}`}>
                          {member.user.name}
                          {isMe && <span className="ml-1 text-[10px] text-[#52525b] font-normal">(you)</span>}
                        </span>
                        <RoleBadge role={role} />
                      </div>
                      <p className="text-[10px] text-[#52525b] truncate">{member.user.email}</p>
                    </div>

                    {/* Action buttons */}
                    {canActOnMember && (
                      <div className="flex-shrink-0">
                        {isPending ? (
                          <Loader2 className="w-4 h-4 text-[#71717a] animate-spin" />
                        ) : role === 'ADMIN' ? (
                          <button
                            onClick={() => handleRevoke(member.userId)}
                            title="Revoke admin"
                            className="p-1.5 rounded-md text-[#71717a] hover:text-[#ef4444]
                              hover:bg-[#ef4444]/10 transition-colors"
                          >
                            <ShieldMinus className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrant(member.userId)}
                            title="Make admin"
                            className="p-1.5 rounded-md text-[#71717a] hover:text-[#22c55e]
                              hover:bg-[#22c55e]/10 transition-colors"
                          >
                            <ShieldPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-[#1f1f23] flex-shrink-0">
          <button
            onClick={() => fetchChannelMembers(channel.id)}
            disabled={isLoadingMembers}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-[#71717a]
              hover:text-[#fafafa] py-1.5 rounded-md hover:bg-[#141417] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingMembers ? 'animate-spin' : ''}`} />
            Refresh members
          </button>
        </div>
      </div>
    </>
  );
}
