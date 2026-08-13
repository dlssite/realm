import { API_BASE } from '@/lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  Users, Shield, Users2, Building2, Plus, Mail, Bot,
  Copy, Check, Trash2, ChevronDown, Clock, X, AlertTriangle,
} from 'lucide-react';
import AiSettingsTab from '../components/AiSettingsTab';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  members: Array<{ user: { id: string; name: string } }>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'] as const;

const roleBadgeClass: Record<string, string> = {
  OWNER:   'bg-[#2d1f3d] text-[#a78bfa] border border-[#4c2889]',
  ADMIN:   'bg-[#1e2d3d] text-[#60a5fa] border border-[#1e4d7d]',
  MANAGER: 'bg-[#1e3028] text-[#34d399] border border-[#1a5040]',
  MEMBER:  'bg-[#1f1f23] text-[#e4e4e7] border border-[#2a2a2e]',
  GUEST:   'bg-[#2a2010] text-[#fbbf24] border border-[#4a3a1a]',
};

// ─── Small utility components ──────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleBadgeClass[role] ?? roleBadgeClass['MEMBER']}`}>
      <Shield className="w-2.5 h-2.5" />
      <span>{role}</span>
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy link"
      className="flex items-center space-x-1 text-xs text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied!' : 'Copy link'}</span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { workspace, user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'teams' | 'ai'>('general');

  // Members state
  const [members, setMembers]         = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Teams state
  const [teams, setTeams]               = useState<Team[]>([]);
  const [teamName, setTeamName]         = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('MEMBER');
  const [inviteLink, setInviteLink]   = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Confirm-remove dialog
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);

  // Per-row loading states
  const [updatingRoleFor, setUpdatingRoleFor]     = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId]   = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId]   = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Determine if the current user can manage members (OWNER or ADMIN)
  const myRole = workspace?.role ?? '';
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    if (!workspace || !token) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMembers(await res.json());
  }, [workspace, token]);

  const fetchInvitations = useCallback(async () => {
    if (!workspace || !token || !canManage) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setInvitations(await res.json());
  }, [workspace, token, canManage]);

  const fetchTeams = useCallback(async () => {
    if (!workspace || !token) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setTeams(await res.json());
  }, [workspace, token]);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
      fetchInvitations();
    } else if (activeTab === 'teams') {
      fetchTeams();
    }
  }, [activeTab, fetchMembers, fetchInvitations, fetchTeams]);

  // ── Invite ────────────────────────────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    setInviteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create invitation');
      const link = `${window.location.origin}/invite?token=${data.token}`;
      setInviteLink(link);
      setInviteEmail('');
      // Optimistically add to pending list
      setInvitations((prev) => [data, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Revoke invitation ─────────────────────────────────────────────────────

  const handleRevokeInvitation = async (invitationId: string) => {
    setRevokingInviteId(invitationId);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/invitations/${invitationId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to revoke invitation');
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevokingInviteId(null);
    }
  };

  // ── Change member role ────────────────────────────────────────────────────

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    setUpdatingRoleFor(memberId);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/members/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: newRole }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update role');
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  // ── Remove member ─────────────────────────────────────────────────────────

  const handleRemoveMember = async (memberId: string, userId: string) => {
    setRemovingMemberId(memberId);
    setConfirmRemoveMemberId(null);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/members/${userId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to remove member');
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  // ── Create team ───────────────────────────────────────────────────────────

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: teamName, description: teamDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create team');
      setTeams((prev) => [...prev, { ...data, members: [] }]);
      setTeamName('');
      setTeamDescription('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Tab helpers ───────────────────────────────────────────────────────────

  const tabClass = (tab: string) =>
    `pb-3 font-medium text-sm transition-colors ${
      activeTab === tab
        ? 'border-b-2 border-[#7c3aed] text-[#fafafa]'
        : 'text-[#a1a1aa] hover:text-[#fafafa]'
    }`;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">

      {/* Page Header */}
      <div className="flex items-center space-x-3 pb-4 sm:pb-6 border-b border-[#1f1f23]">
        <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#7c3aed] flex-shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Workspace Settings</h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa] mt-0.5 sm:mt-1">Manage workspace members, teams, and access permissions</p>
        </div>
      </div>

      {/* Tab Navigation — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex border-b border-[#1f1f23] space-x-4 sm:space-x-6 min-w-max sm:min-w-0">
          <button onClick={() => setActiveTab('general')} className={tabClass('general')}>General</button>
          <button onClick={() => setActiveTab('members')} className={tabClass('members')}>
            Members{members.length > 0 ? ` (${members.length})` : ''}
          </button>
          <button onClick={() => setActiveTab('teams')} className={tabClass('teams')}>
            Teams{teams.length > 0 ? ` (${teams.length})` : ''}
          </button>
          <button onClick={() => setActiveTab('ai')} className={`${tabClass('ai')} flex items-center space-x-1.5`}>
            <Bot className="w-4 h-4 text-[#7c3aed]" />
            <span>AI Provider</span>
          </button>
        </div>
      </div>

      {/* Global error banner */}
      {error && (
        <div className="flex items-start space-x-2 bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* ── General Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'ai' && <AiSettingsTab />}

      {activeTab === 'general' && (
        <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-4">
          <h2 className="text-lg font-bold">Workspace Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
            <div>
              <span className="block text-[#a1a1aa] text-xs font-semibold mb-1 uppercase tracking-wider">Workspace Name</span>
              <span className="text-[#fafafa] font-medium">{workspace?.name}</span>
            </div>
            <div>
              <span className="block text-[#a1a1aa] text-xs font-semibold mb-1 uppercase tracking-wider">URL Slug</span>
              <span className="font-mono text-[#a1a1aa] bg-[#1f1f23] px-2 py-0.5 rounded text-[11px]">
                {workspace?.slug}
              </span>
            </div>
            <div>
              <span className="block text-[#a1a1aa] text-xs font-semibold mb-1 uppercase tracking-wider">Your Role</span>
              <RoleBadge role={myRole} />
            </div>
          </div>
        </div>
      )}

      {/* ── Members Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-6">

          {/* Invite Form — OWNER/ADMIN only */}
          {canManage && (
            <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#7c3aed]" />
                <span>Invite Member</span>
              </h2>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="colleague@company.com"
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                  />
                </div>
                <div className="flex gap-3 sm:gap-3 sm:items-end">
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full sm:w-32 bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white px-2.5 sm:px-4 py-2 rounded text-sm font-medium flex items-center space-x-1.5 transition-colors self-end flex-shrink-0"
                    title="Send Invite"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{inviteLoading ? 'Sending…' : 'Send Invite'}</span>
                  </button>
                </div>
              </form>

              {/* Invite link result with copy button */}
              {inviteLink && (
                <div className="bg-[#0f1a10] border border-[#1a4a20] rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#34d399]">Invitation created</span>
                    <CopyButton text={inviteLink} />
                  </div>
                  <p className="text-[10px] text-[#a1a1aa] font-mono break-all leading-relaxed">{inviteLink}</p>
                  <p className="text-[10px] text-[#52525b]">Send this link to the invitee. It expires in 7 days.</p>
                </div>
              )}
            </div>
          )}

          {/* Pending Invitations — OWNER/ADMIN only */}
          {canManage && invitations.length > 0 && (
            <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-3">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#fbbf24]" />
                <span>Pending Invitations</span>
                <span className="text-xs font-normal text-[#a1a1aa] ml-1">({invitations.length})</span>
              </h2>
              <div className="divide-y divide-[#1f1f23]">
                {invitations.map((inv) => {
                  const expiresDate = new Date(inv.expiresAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  });
                  return (
                    <div key={inv.id} className="py-3 flex items-center justify-between text-sm gap-3">
                      <div className="min-w-0">
                        <span className="font-medium block truncate">{inv.email}</span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <RoleBadge role={inv.role} />
                          <span className="text-[#52525b] text-[10px]">expires {expiresDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <CopyButton text={`${window.location.origin}/invite?token=${inv.token}`} />
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          disabled={revokingInviteId === inv.id}
                          title="Revoke invitation"
                          className="flex items-center space-x-1 text-xs text-[#f87171] hover:text-[#fca5a5] disabled:opacity-40 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{revokingInviteId === inv.id ? 'Revoking…' : 'Revoke'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-3">
            <h2 className="text-base font-bold flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#a1a1aa]" />
              <span>Workspace Members</span>
              <span className="text-xs font-normal text-[#a1a1aa] ml-1">({members.length})</span>
            </h2>

            {members.length === 0 ? (
              <p className="text-sm text-[#a1a1aa]">No members found.</p>
            ) : (
              <div className="divide-y divide-[#1f1f23]">
                {members.map((member) => {
                  const isCurrentUser = member.user.id === user?.id;
                  const isOwner = member.role === 'OWNER';
                  const canEditThis = canManage && !isOwner && !isCurrentUser;
                  const initials = (member.user.name || member.user.email)
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div key={member.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                      {/* Avatar + name/email */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-xs text-[#a1a1aa] shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm block truncate">
                            {member.user.name}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-[#52525b] font-normal">(you)</span>
                            )}
                          </span>
                          <span className="text-[#a1a1aa] text-xs block truncate">{member.user.email}</span>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center space-x-2 shrink-0 pl-11 sm:pl-0">

                        {/* Role control — dropdown for editable, badge for fixed */}
                        {canEditThis ? (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, member.user.id, e.target.value)}
                              disabled={updatingRoleFor === member.id}
                              className="appearance-none bg-[#1f1f23] border border-[#2a2a2e] text-[#e4e4e7] text-xs font-medium px-2.5 py-1 pr-6 rounded-full focus:outline-none focus:border-[#7c3aed] disabled:opacity-50 cursor-pointer transition-colors hover:border-[#7c3aed]"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-[#a1a1aa] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}

                        {/* Remove button */}
                        {canEditThis && (
                          <>
                            {confirmRemoveMemberId === member.id ? (
                              <div className="flex items-center space-x-1.5 bg-[#27171a] border border-[#7f1d1d] rounded px-2 py-1">
                                <span className="text-[10px] text-[#f87171]">Remove?</span>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.user.id)}
                                  disabled={removingMemberId === member.id}
                                  className="text-[10px] font-semibold text-[#f87171] hover:text-white disabled:opacity-50 transition-colors"
                                >
                                  {removingMemberId === member.id ? '…' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveMemberId(null)}
                                  className="text-[10px] text-[#a1a1aa] hover:text-white transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRemoveMemberId(member.id)}
                                title="Remove member from workspace"
                                className="p-1 text-[#52525b] hover:text-[#f87171] transition-colors rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Teams Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {canManage && (
            <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#7c3aed]" />
                <span>Create New Team</span>
              </h2>
              <form onSubmit={handleCreateTeam} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      placeholder="e.g. Engineering"
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">Description</label>
                    <input
                      type="text"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Brief scope / objective of the team"
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-2.5 sm:px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1.5 flex-shrink-0"
                  title="Create Team"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Team</span>
                </button>
              </form>
            </div>
          )}

          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-6 space-y-3">
            <h2 className="text-base font-bold flex items-center space-x-2">
              <Users2 className="w-4 h-4 text-[#a1a1aa]" />
              <span>Workspace Teams</span>
              {teams.length > 0 && <span className="text-xs font-normal text-[#a1a1aa] ml-1">({teams.length})</span>}
            </h2>
            {teams.length === 0 ? (
              <p className="text-sm text-[#a1a1aa]">No teams configured yet.</p>
            ) : (
              <div className="divide-y divide-[#1f1f23]">
                {teams.map((team) => (
                  <div key={team.id} className="py-4 text-sm space-y-1">
                    <span className="font-semibold block">{team.name}</span>
                    <span className="text-[#a1a1aa] text-xs block">{team.description || 'No description.'}</span>
                    <span className="text-xs text-[#7c3aed] font-medium">
                      {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { SettingsPage };
