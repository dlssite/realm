import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { useToast } from '../../../shared/hooks/use-toast';
import {
  Users2, Plus, Shield, Crown, UserPlus, Trash2, X, FolderKanban, Check, ChevronRight, Building2, MessageSquare, Hash, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserSelect {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  user: UserSelect;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader: UserSelect | null;
  members: TeamMember[];
  _count: { members: number; projects: number };
}

interface WorkspaceMember {
  id: string;
  role: string;
  user: UserSelect;
}

export default function TeamsPage() {
  const { workspace, token } = useAuthStore();
  const { enableTeamChannel } = useChatStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamLeaderId, setNewTeamLeaderId] = useState('');
  const [newTeamEnableChannel, setNewTeamEnableChannel] = useState(false);
  const [enablingChannel, setEnablingChannel] = useState<string | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Team detail drawer state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  useEffect(() => {
    if (!workspace || !token) return;
    fetchTeams();
    fetchWorkspaceMembers();
  }, [workspace, token]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (selectedTeam) {
          const updatedSelected = data.find((t: Team) => t.id === selectedTeam.id);
          if (updatedSelected) setSelectedTeam(updatedSelected);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setWorkspaceMembers(await res.json());
    } catch (err: any) {
      console.error('Failed to fetch workspace members:', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreatingTeam(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDesc || undefined,
          leaderId: newTeamLeaderId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create team');

      if (newTeamEnableChannel && data.id) {
        await enableTeamChannel(data.id);
      }

      toast.success('Team created', newTeamName);
      setNewTeamName('');
      setNewTeamDesc('');
      setNewTeamLeaderId('');
      setNewTeamEnableChannel(false);
      setShowCreateModal(false);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create team', err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleEnableTeamChannel = async (teamId: string) => {
    setEnablingChannel(teamId);
    try {
      const channel = await enableTeamChannel(teamId);
      if (channel) navigate('/chat');
    } finally {
      setEnablingChannel(null);
    }
  };

  const handleSetLeader = async (teamId: string, leaderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaderId: leaderId || null }),
      });
      if (res.ok) fetchTeams();
    } catch (err: any) {
      console.error('Failed to set team leader:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !addMemberUserId) return;
    setIsAddingMember(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: addMemberUserId }),
      });
      if (res.ok) {
        toast.success('Member added');
        setAddMemberUserId('');
        fetchTeams();
      } else {
        toast.error('Failed to add member');
      }
    } catch (err: any) {
      toast.error('Failed to add member', err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.info('Member removed');
        fetchTeams();
      } else {
        toast.error('Failed to remove member');
      }
    } catch (err: any) {
      toast.error('Failed to remove member', err.message);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.info('Team deleted');
        setSelectedTeam(null);
        fetchTeams();
      } else {
        toast.error('Failed to delete team');
      }
    } catch (err: any) {
      toast.error('Failed to delete team', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#7c3aed] flex-shrink-0">
            <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Teams</h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5 hidden sm:block">Organize members into functional groups and project teams</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-2.5 sm:px-4 py-2 rounded text-sm font-medium transition-colors flex-shrink-0"
          title="New Team"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Team</span>
        </button>
      </div>

      {error && (
        <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-3 rounded">
          {error}
        </div>
      )}

      {/* Teams Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-[#a1a1aa] text-xs">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-12 text-center">
          <Users2 className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#fafafa] mb-1">No Teams Created</h3>
          <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto mb-4">
            Create teams to assign projects and restrict task assignees to team members.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#7c3aed] text-white px-4 py-2 rounded text-xs font-medium"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className="bg-[#0c0c0e] border border-[#1f1f23] hover:border-[#7c3aed]/50 rounded-lg p-5 cursor-pointer transition-all space-y-4 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-base text-[#fafafa] group-hover:text-[#a78bfa] transition-colors">
                    {team.name}
                  </h3>
                  <span className="text-[10px] font-mono bg-[#141417] text-[#a1a1aa] border border-[#27272a] px-2 py-0.5 rounded">
                    {team._count.projects} projects
                  </span>
                </div>
                <p className="text-xs text-[#a1a1aa] line-clamp-2 min-h-[32px]">
                  {team.description || 'No description provided.'}
                </p>
              </div>

              {/* Team Leader & Roster Footer */}
              <div className="pt-3 border-t border-[#1f1f23] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#71717a]">Team Leader:</span>
                  {team.leader ? (
                    <div className="flex items-center space-x-1.5 bg-[#141417] px-2 py-0.5 rounded border border-[#27272a]">
                      <Crown className="w-3 h-3 text-[#f59e0b]" />
                      <span className="font-medium text-[#fafafa]">{team.leader.name}</span>
                    </div>
                  ) : (
                    <span className="text-[#52525b] italic">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {team.members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        title={m.user.name}
                        className="w-6 h-6 rounded-full bg-[#27272a] border border-[#0c0c0e] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      >
                        {m.user.name[0]}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="w-6 h-6 rounded-full bg-[#18181b] border border-[#0c0c0e] flex items-center justify-center text-[9px] text-[#a1a1aa] shrink-0 font-mono">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[#a1a1aa] font-mono">{team.members.length} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
              <h2 className="text-base font-bold text-[#fafafa]">Create Workspace Team</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#a1a1aa] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">TEAM NAME *</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Core Engineering, Mobile Frontend"
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Brief summary of responsibilities..."
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">ASSIGN TEAM LEADER</label>
                <select
                  value={newTeamLeaderId}
                  onChange={(e) => setNewTeamLeaderId(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                >
                  <option value="">No Team Leader (Unassigned)</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Enable Channel toggle */}
              <div
                onClick={() => setNewTeamEnableChannel(!newTeamEnableChannel)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${
                  newTeamEnableChannel
                    ? 'border-[#7c3aed]/50 bg-[#7c3aed]/10'
                    : 'border-[#1f1f23] bg-[#09090b] hover:border-[#27272a]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Hash className={`w-4 h-4 ${newTeamEnableChannel ? 'text-[#a78bfa]' : 'text-[#71717a]'}`} />
                  <div>
                    <p className={`text-xs font-semibold ${newTeamEnableChannel ? 'text-[#fafafa]' : 'text-[#a1a1aa]'}`}>
                      Enable Team Channel
                    </p>
                    <p className="text-[11px] text-[#71717a]">Auto-create a dedicated chat channel for this team</p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-all flex-shrink-0 relative ${newTeamEnableChannel ? 'bg-[#7c3aed]' : 'bg-[#27272a]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${newTeamEnableChannel ? 'left-4' : 'left-0.5'}`} />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  disabled={isCreatingTeam}
                >
                  {isCreatingTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isCreatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM DETAIL DRAWER */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop tap-to-close on mobile */}
          <div className="absolute inset-0 md:hidden" onClick={() => setSelectedTeam(null)} />
          <div className="relative w-full max-w-lg bg-[#09090b] border-l border-[#1f1f23] text-[#fafafa] flex flex-col h-full shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center text-[#a78bfa] font-bold text-xs flex-shrink-0">
                  {selectedTeam.name[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm sm:text-base text-[#fafafa] truncate">{selectedTeam.name}</h2>
                  <p className="text-xs text-[#a1a1aa]">{selectedTeam.members.length} members · {selectedTeam._count.projects} projects</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-1 rounded hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-white transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Description */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Description</h3>
                <p className="text-xs text-[#fafafa] bg-[#0c0c0e] p-3 rounded border border-[#1f1f23]">
                  {selectedTeam.description || 'No description set.'}
                </p>
              </div>

              {/* Team Leader */}
              <div className="space-y-2 border-t border-[#1f1f23] pt-4">
                <div className="flex items-center space-x-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Team Leader</h3>
                </div>
                <select
                  value={selectedTeam.leaderId ?? ''}
                  onChange={(e) => handleSetLeader(selectedTeam.id, e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-[#1f1f23] rounded px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed]"
                >
                  <option value="">No Team Leader</option>
                  {selectedTeam.members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>
                  ))}
                </select>
              </div>

              {/* Add Member */}
              <div className="space-y-2 border-t border-[#1f1f23] pt-4">
                <div className="flex items-center space-x-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Add Member</h3>
                </div>
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <select
                    value={addMemberUserId}
                    onChange={(e) => setAddMemberUserId(e.target.value)}
                    className="flex-1 min-w-0 bg-[#0c0c0e] border border-[#1f1f23] rounded px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed]"
                  >
                    <option value="">Select workspace member...</option>
                    {workspaceMembers
                      .filter((wm) => !selectedTeam.members.some((tm) => tm.userId === wm.user.id))
                      .map((wm) => (
                        <option key={wm.user.id} value={wm.user.id}>{wm.user.name} ({wm.user.email})</option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!addMemberUserId || isAddingMember}
                    className="bg-[#7c3aed] disabled:opacity-50 hover:bg-[#6d28d9] text-white px-3 py-2 rounded text-xs font-medium flex-shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    {isAddingMember && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isAddingMember ? 'Adding...' : 'Add'}
                  </button>
                </form>
              </div>

              {/* Member Roster */}
              <div className="space-y-3 border-t border-[#1f1f23] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  Team Members ({selectedTeam.members.length})
                </h3>
                <div className="divide-y divide-[#1f1f23] bg-[#0c0c0e] border border-[#1f1f23] rounded-md overflow-hidden">
                  {selectedTeam.members.map((m) => {
                    const isLeader = selectedTeam.leaderId === m.user.id;
                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0">
                            {m.user.name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-semibold text-[#fafafa] truncate">{m.user.name}</span>
                              {isLeader && (
                                <span className="bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 text-[9px] px-1.5 py-0.2 rounded flex items-center space-x-1 font-bold flex-shrink-0">
                                  <Crown className="w-2.5 h-2.5" /><span>LEADER</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[#a1a1aa] text-[11px] block truncate">{m.user.email}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(selectedTeam.id, m.userId)}
                          title="Remove from team"
                          className="text-[#71717a] hover:text-[#f87171] p-1 rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team Channel */}
              <div className="space-y-2 border-t border-[#1f1f23] pt-4">
                <div className="flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Team Channel</h3>
                </div>
                <button
                  onClick={() => handleEnableTeamChannel(selectedTeam.id)}
                  disabled={enablingChannel === selectedTeam.id}
                  className="w-full flex items-center justify-center space-x-2 bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30 hover:border-[#7c3aed]/50 py-2 rounded text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>{enablingChannel === selectedTeam.id ? 'Enabling...' : 'Enable / Open Team Channel'}</span>
                </button>
                <p className="text-[11px] text-[#52525b]">Creates a team channel and opens it in Chat.</p>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-[#1f1f23] pt-6">
                <button
                  onClick={() => handleDeleteTeam(selectedTeam.id)}
                  className="w-full bg-[#27171a] hover:bg-[#3f1d22] text-[#f87171] border border-[#7f1d1d] py-2 rounded text-xs font-semibold transition-colors"
                >
                  Delete Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export { TeamsPage };
