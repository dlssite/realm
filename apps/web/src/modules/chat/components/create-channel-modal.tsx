import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { X, Hash, Users2, FolderKanban, Layers, ChevronRight } from 'lucide-react';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { useAuthStore } from '../../../app/stores/auth.store';

type Scope = 'custom' | 'team' | 'project';

interface Team { id: string; name: string; description: string | null; }
interface Project { id: string; name: string; identifier: string; team: { name: string } | null; }

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCOPES: { value: Scope; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'custom',
    label: 'Custom Channel',
    description: 'A workspace-wide channel for any topic',
    icon: <Hash className="w-4 h-4" />,
    color: 'text-[#7c3aed] bg-[#7c3aed]/10 border-[#7c3aed]/30',
  },
  {
    value: 'team',
    label: 'Team Channel',
    description: 'Enable a dedicated channel for a team',
    icon: <Users2 className="w-4 h-4" />,
    color: 'text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/30',
  },
  {
    value: 'project',
    label: 'Project Channel',
    description: 'Enable a dedicated channel for a project',
    icon: <FolderKanban className="w-4 h-4" />,
    color: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30',
  },
];

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const { workspace, token } = useAuthStore();

  const [scope, setScope] = useState<Scope>('custom');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createCustomChannel, enableTeamChannel, enableProjectChannel } = useChatStore();

  useEffect(() => {
    if (!isOpen || !workspace || !token) return;
    const fetchScopeData = async () => {
      setIsLoadingData(true);
      try {
        const [tRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/teams`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (tRes.ok) setTeams(await tRes.json());
        if (pRes.ok) setProjects(await pRes.json());
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchScopeData();
  }, [isOpen, workspace?.id]);

  if (!isOpen) return null;

  const resetState = () => {
    setScope('custom');
    setName('');
    setDescription('');
    setSelectedTeamId('');
    setSelectedProjectId('');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let channel = null;

      if (scope === 'custom') {
        if (!name.trim()) { setError('Channel name is required.'); return; }
        channel = await createCustomChannel(name.trim(), description.trim() || undefined);
      } else if (scope === 'team') {
        if (!selectedTeamId) { setError('Please select a team.'); return; }
        channel = await enableTeamChannel(selectedTeamId);
      } else if (scope === 'project') {
        if (!selectedProjectId) { setError('Please select a project.'); return; }
        channel = await enableProjectChannel(selectedProjectId);
      }

      if (channel) {
        handleClose();
      } else {
        setError('Failed to create channel. It may already exist.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedScopeInfo = SCOPES.find(s => s.value === scope)!;
  const isValid =
    (scope === 'custom' && name.trim().length > 0) ||
    (scope === 'team' && !!selectedTeamId) ||
    (scope === 'project' && !!selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0c0c0e] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f23] bg-[#09090b]">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${selectedScopeInfo.color}`}>
              {selectedScopeInfo.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#fafafa]">Create Channel</h2>
              <p className="text-[11px] text-[#71717a]">{selectedScopeInfo.description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider mb-2">Channel Type</p>
          <div className="grid grid-cols-3 gap-2">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setScope(s.value); setError(null); }}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                  scope === s.value
                    ? `${s.color} border-opacity-100`
                    : 'border-[#1f1f23] text-[#71717a] hover:border-[#27272a] hover:text-[#a1a1aa] bg-transparent'
                }`}
              >
                <span className={scope === s.value ? '' : 'opacity-60'}>{s.icon}</span>
                <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-3 space-y-4">

          {/* Custom channel fields */}
          {scope === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1 uppercase tracking-wider">
                  Channel Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#52525b] font-mono text-sm">#</span>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. design-feedback"
                    required
                    className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg pl-8 pr-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#52525b] mt-1">Only lowercase letters, numbers, and hyphens.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1 uppercase tracking-wider">
                  Topic / Description <span className="text-[#52525b] font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  rows={2}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] resize-none transition-colors"
                />
              </div>
            </>
          )}

          {/* Team channel selector */}
          {scope === 'team' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1 uppercase tracking-wider">
                Select Team <span className="text-red-500">*</span>
              </label>
              {isLoadingData ? (
                <div className="text-xs text-[#71717a] py-2">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="text-xs text-[#71717a] bg-[#09090b] border border-[#1f1f23] rounded-lg p-3">
                  No teams found. Create a team first.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                        selectedTeamId === t.id
                          ? 'border-[#0ea5e9]/50 bg-[#0ea5e9]/10 text-[#fafafa]'
                          : 'border-[#1f1f23] bg-[#09090b] text-[#a1a1aa] hover:border-[#27272a] hover:text-[#fafafa]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          selectedTeamId === t.id ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'bg-[#1f1f23] text-[#71717a]'
                        }`}>
                          {t.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">{t.name}</p>
                          {t.description && (
                            <p className="text-[11px] text-[#71717a] mt-0.5 truncate max-w-[260px]">{t.description}</p>
                          )}
                        </div>
                      </div>
                      {selectedTeamId === t.id && <ChevronRight className="w-3.5 h-3.5 text-[#0ea5e9] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-[#52525b] mt-1.5">
                Creates a <span className="text-[#0ea5e9]">#team-{teams.find(t => t.id === selectedTeamId)?.name?.toLowerCase() || 'channel'}</span> accessible to all team members.
              </p>
            </div>
          )}

          {/* Project channel selector */}
          {scope === 'project' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1 uppercase tracking-wider">
                Select Project <span className="text-red-500">*</span>
              </label>
              {isLoadingData ? (
                <div className="text-xs text-[#71717a] py-2">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="text-xs text-[#71717a] bg-[#09090b] border border-[#1f1f23] rounded-lg p-3">
                  No projects found. Create a project first.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                        selectedProjectId === p.id
                          ? 'border-[#10b981]/50 bg-[#10b981]/10 text-[#fafafa]'
                          : 'border-[#1f1f23] bg-[#09090b] text-[#a1a1aa] hover:border-[#27272a] hover:text-[#fafafa]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                          selectedProjectId === p.id ? 'bg-[#10b981]/20' : 'bg-[#1f1f23]'
                        }`}>
                          <FolderKanban className={`w-3.5 h-3.5 ${selectedProjectId === p.id ? 'text-[#10b981]' : 'text-[#71717a]'}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono text-[#71717a]">{p.identifier}</span>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          {p.team && (
                            <p className="text-[11px] text-[#71717a] mt-0.5">
                              <Users2 className="w-2.5 h-2.5 inline mr-0.5" />{p.team.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedProjectId === p.id && <ChevronRight className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-[#52525b] mt-1.5">
                Only project members and team admins can access this channel.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-[#27171a] border border-[#7f1d1d] text-[#f87171] text-xs p-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#141417] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`flex items-center space-x-1.5 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                scope === 'team'
                  ? 'bg-[#0ea5e9] hover:bg-[#0284c7]'
                  : scope === 'project'
                  ? 'bg-[#10b981] hover:bg-[#059669]'
                  : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Channel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
