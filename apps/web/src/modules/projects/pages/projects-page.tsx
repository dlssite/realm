import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { Plus, FolderKanban, MoreHorizontal, Calendar, CheckSquare, Users2, Hash } from 'lucide-react';


interface Team {
  id: string;
  name: string;
}

interface Project {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
  status: string;
  teamId: string | null;
  team: Team | null;
  createdAt: string;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  _count: { tasks: number; milestones: number };
}

const STATUS_STYLES: Record<string, string> = {
  PLANNED:   'bg-[#1c1917] text-[#a8a29e] border border-[#292524]',
  ACTIVE:    'bg-[#0f2a1d] text-[#4ade80] border border-[#14532d]',
  PAUSED:    'bg-[#1c1917] text-[#fb923c] border border-[#431407]',
  COMPLETED: 'bg-[#0c1a2e] text-[#60a5fa] border border-[#1e3a5f]',
  CANCELLED: 'bg-[#1a0a0a] text-[#f87171] border border-[#7f1d1d]',
};

/** Team pill shown on each project row */
function TeamBadge({ team }: { team: Team | null }) {
  if (!team) {
    return (
      <span className="text-[10px] font-medium text-[#52525b] bg-[#141417] border border-[#1f1f23] px-2 py-0.5 rounded">
        Workspace
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-[#a78bfa] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
      <Users2 className="w-2.5 h-2.5" />
      <span>{team.name}</span>
    </span>
  );
}

export default function ProjectsPage() {
  const { workspace, token } = useAuthStore();
  const { enableProjectChannel } = useChatStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [newEnableChannel, setNewEnableChannel] = useState(false);

  useEffect(() => {
    if (!workspace || !token) return;
    fetchProjects();
    fetchTeams();
  }, [workspace, token]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProjects(data);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTeams(await res.json());
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: newName,
        description: newDesc || undefined,
        teamId: newTeamId || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      // Optionally enable project channel
      if (newEnableChannel && data.id) {
        const channel = await enableProjectChannel(data.id);
        if (channel) navigate('/chat');
      }
      setNewName('');
      setNewDesc('');
      setNewTeamId('');
      setNewEnableChannel(false);
      setShowCreate(false);
      fetchProjects();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6 text-[#7c3aed] flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5 hidden sm:block">Manage strategic goals and initiatives</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center space-x-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-2.5 sm:px-4 py-2 rounded text-sm font-medium transition-colors flex-shrink-0"
          title="New Project"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      {/* Create form inline */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#0c0c0e] border border-[#7c3aed] rounded-md p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold">Create New Project</h2>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Project name..."
            className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa] resize-none"
          />
          {/* Team assignment */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">ASSIGN TO TEAM (optional)</label>
            <select
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
            >
              <option value="">No Team — Workspace-wide project</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {newTeamId && (
              <p className="text-[10px] text-[#a1a1aa] mt-1 flex items-center space-x-1">
                <Users2 className="w-3 h-3 text-[#7c3aed]" />
                <span>Only members of the selected team will see and be assignable to tasks in this project.</span>
              </p>
            )}
          </div>
          {/* Enable project channel toggle */}
          <div
            onClick={() => setNewEnableChannel(!newEnableChannel)}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${
              newEnableChannel
                ? 'border-[#10b981]/50 bg-[#10b981]/10'
                : 'border-[#1f1f23] bg-[#09090b] hover:border-[#27272a]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Hash className={`w-4 h-4 ${newEnableChannel ? 'text-[#10b981]' : 'text-[#71717a]'}`} />
              <div>
                <p className={`text-xs font-semibold ${newEnableChannel ? 'text-[#fafafa]' : 'text-[#a1a1aa]'}`}>
                  Enable Project Channel
                </p>
                <p className="text-[11px] text-[#71717a]">Auto-create a dedicated chat channel and open it</p>
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-all flex-shrink-0 relative ${newEnableChannel ? 'bg-[#10b981]' : 'bg-[#27272a]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${newEnableChannel ? 'left-4' : 'left-0.5'}`} />
            </div>
          </div>

          <div className="flex space-x-2">
            <button type="submit" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-1.5 rounded text-sm font-medium">
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[#a1a1aa] hover:text-[#fafafa] px-4 py-1.5 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Projects Table — desktop */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f23] text-[#a1a1aa] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Project</th>
                <th className="text-left px-4 py-3 font-semibold">Team</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Tasks</th>
                <th className="text-left px-4 py-3 font-semibold">Milestones</th>
                <th className="text-left px-4 py-3 font-semibold">Created By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23]">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#a1a1aa] text-xs">Loading projects...</td></tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FolderKanban className="w-10 h-10 text-[#27272a] mx-auto mb-3" />
                    <p className="text-sm text-[#a1a1aa]">No projects yet. Create your first project to get started.</p>
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-[#0f0f11] group transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="flex flex-col hover:text-[#7c3aed] transition-colors">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[#a1a1aa] text-xs">{project.identifier}</span>
                          <span className="font-semibold text-[#fafafa]">{project.name}</span>
                        </div>
                        {project.description && (
                          <span className="text-xs text-[#71717a] mt-0.5 truncate max-w-xs">{project.description}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><TeamBadge team={project.team} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${STATUS_STYLES[project.status] || ''}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1 text-[#a1a1aa]">
                        <CheckSquare className="w-3.5 h-3.5" /><span>{project._count.tasks}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1 text-[#a1a1aa]">
                        <Calendar className="w-3.5 h-3.5" /><span>{project._count.milestones}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 text-[#a1a1aa]">
                        <div className="w-5 h-5 rounded-full bg-[#27272a] flex items-center justify-center text-[10px] font-bold">
                          {project.createdBy.name[0]}
                        </div>
                        <span className="text-xs">{project.createdBy.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="opacity-0 group-hover:opacity-100 text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-[#1f1f23]">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-[#a1a1aa] text-xs">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <FolderKanban className="w-10 h-10 text-[#27272a] mx-auto mb-3" />
              <p className="text-sm text-[#a1a1aa]">No projects yet. Create your first project to get started.</p>
            </div>
          ) : projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block px-4 py-3 hover:bg-[#0f0f11] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[#a1a1aa] text-[10px]">{project.identifier}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded ${STATUS_STYLES[project.status] || ''}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#fafafa] mt-0.5">{project.name}</p>
                  {project.description && (
                    <p className="text-xs text-[#71717a] mt-0.5 line-clamp-1">{project.description}</p>
                  )}
                </div>
                <TeamBadge team={project.team} />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#a1a1aa]">
                <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{project._count.tasks} tasks</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{project._count.milestones} milestones</span>
                <span className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#27272a] flex items-center justify-center text-[9px] font-bold">{project.createdBy.name[0]}</div>
                  {project.createdBy.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
export { ProjectsPage };
