import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import {
  FolderKanban, ArrowLeft, Plus, CheckSquare, Flag, Target,
  Calendar as CalendarIcon, Users, Clock, CircleCheck, AlertCircle, Circle, Inbox, Ban, Users2, Loader2
} from 'lucide-react';
import { TaskDetailDrawer } from '../../tasks/components/task-detail-drawer';
import { TimelineView } from '../../tasks/components/timeline-view';

interface Milestone {
  id: string;
  name: string;
  dueDate: string | null;
  isCompleted: boolean;
}

interface Goal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
}

interface Task {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
}

interface ProjectDetail {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  teamId: string | null;
  team: { id: string; name: string; leaderId: string | null } | null;
  milestones: Milestone[];
  goals: Goal[];
  tasks: Task[];
  _count: { tasks: number; milestones: number };
}

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-[#1c1917] text-[#a8a29e] border-[#292524]',
  ACTIVE: 'bg-[#0f2a1d] text-[#4ade80] border-[#14532d]',
  PAUSED: 'bg-[#1c1917] text-[#fb923c] border-[#431407]',
  COMPLETED: 'bg-[#0c1a2e] text-[#60a5fa] border-[#1e3a5f]',
  CANCELLED: 'bg-[#1a0a0a] text-[#f87171] border-[#7f1d1d]',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { workspace, token } = useAuthStore();
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline'>('overview');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState(100);
  const [isMilestoneSaving, setIsMilestoneSaving] = useState(false);
  const [isGoalSaving, setIsGoalSaving] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !workspace || !token) return;
    fetchProjectDetails();
  }, [projectId, workspace, token]);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProject(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success('Status updated', newStatus.toLowerCase());
      fetchProjectDetails();
    } else {
      toast.error('Failed to update status');
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneName.trim()) return;
    setIsMilestoneSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: milestoneName, dueDate: milestoneDate ? new Date(milestoneDate).toISOString() : undefined }),
      });
      if (res.ok) {
        toast.success('Milestone created');
        setMilestoneName('');
        setMilestoneDate('');
        setShowAddMilestone(false);
        fetchProjectDetails();
      } else {
        toast.error('Failed to create milestone');
      }
    } finally {
      setIsMilestoneSaving(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
    await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isCompleted: !isCompleted }),
    });
    fetchProjectDetails();
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;
    setIsGoalSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects/${projectId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: goalName, targetValue: Number(goalTarget), currentValue: 0 }),
      });
      if (res.ok) {
        toast.success('Goal created');
        setGoalName('');
        setShowAddGoal(false);
        fetchProjectDetails();
      } else {
        toast.error('Failed to create goal');
      }
    } finally {
      setIsGoalSaving(false);
    }
  };

  if (isLoading || !project) {
    return <div className="p-8 text-sm text-[#a1a1aa]">Loading project workspace...</div>;
  }

  const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
  const totalTasks = project.tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4 flex flex-col h-full">

      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <Link to="/projects" className="flex items-center space-x-2 text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors min-w-0">
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Back to Projects</span>
        </Link>
        <select
          value={project.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`text-xs font-semibold uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded border ${STATUS_STYLES[project.status]} cursor-pointer focus:outline-none flex-shrink-0`}
        >
          <option value="PLANNED" className="bg-[#09090b]">PLANNED</option>
          <option value="ACTIVE" className="bg-[#09090b]">ACTIVE</option>
          <option value="PAUSED" className="bg-[#09090b]">PAUSED</option>
          <option value="COMPLETED" className="bg-[#09090b]">COMPLETED</option>
          <option value="CANCELLED" className="bg-[#09090b]">CANCELLED</option>
        </select>
      </div>

      {/* Project Header Card */}
      <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-4 sm:p-6 space-y-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#7c3aed] flex-shrink-0">
              <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <span className="font-mono text-xs text-[#a1a1aa]">{project.identifier}</span>
                <h1 className="text-lg sm:text-xl font-bold text-[#fafafa]">{project.name}</h1>
              </div>
              <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl">{project.description || 'No description provided.'}</p>
              {project.team ? (
                <div className="flex items-center space-x-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-[#a78bfa] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-2 py-0.5 rounded flex items-center space-x-1">
                    <Users2 className="w-2.5 h-2.5" /><span>{project.team.name} team project</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 mt-2">
                  <span className="text-[10px] text-[#52525b] bg-[#141417] border border-[#1f1f23] px-2 py-0.5 rounded">Workspace-wide project</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-[#a1a1aa] flex-shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-[10px] text-white">
              {project.createdBy.name[0]}
            </div>
            <span className="hidden sm:inline">{project.createdBy.name}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-[#a1a1aa]">
            <span>Task Completion</span>
            <span className="font-mono">{completedTasks}/{totalTasks} ({taskProgress}%)</span>
          </div>
          <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
            <div className="bg-[#7c3aed] h-full transition-all duration-300" style={{ width: `${taskProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs — scrollable on mobile */}
      <div className="flex-shrink-0 overflow-x-auto">
        <div className="flex items-center space-x-1 border-b border-[#1f1f23] text-sm min-w-max">
          {(['overview', 'tasks', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[#7c3aed] text-[#fafafa]'
                  : 'border-transparent text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              {tab === 'tasks' ? `Tasks (${totalTasks})` : tab === 'timeline' ? 'Timeline & Milestones' : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1">

          {/* Milestones Checklist Card */}
          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flag className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Milestones</h3>
              </div>
              <button onClick={() => setShowAddMilestone(!showAddMilestone)} className="text-xs text-[#7c3aed] hover:underline flex items-center space-x-1 font-medium">
                <Plus className="w-3.5 h-3.5" /><span>Add</span>
              </button>
            </div>

            {showAddMilestone && (
              <form onSubmit={handleCreateMilestone} className="bg-[#141417] p-3 rounded-md space-y-2 border border-[#27272a]">
                <input type="text" placeholder="Milestone title..." value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#fafafa] focus:outline-none" />
                <input type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#fafafa] focus:outline-none" />
                <div className="flex space-x-2 pt-1">
                  <button type="submit" disabled={isMilestoneSaving} className="flex items-center gap-1.5 bg-[#7c3aed] disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition-colors">
                    {isMilestoneSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isMilestoneSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowAddMilestone(false)} className="text-[#a1a1aa] text-xs">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {project.milestones.length === 0 ? (
                <p className="text-xs text-[#52525b]">No milestones created yet.</p>
              ) : project.milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-[#141417] border border-[#1f1f23] rounded px-3 py-2 text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <button onClick={() => handleToggleMilestone(m.id, m.isCompleted)} className="flex-shrink-0">
                      <Flag className={`w-4 h-4 ${m.isCompleted ? 'text-[#4ade80]' : 'text-[#a1a1aa]'}`} />
                    </button>
                    <span className={`truncate ${m.isCompleted ? 'line-through text-[#71717a]' : 'text-[#fafafa] font-medium'}`}>{m.name}</span>
                  </div>
                  {m.dueDate && <span className="text-[10px] text-[#a1a1aa] flex-shrink-0 ml-2">{new Date(m.dueDate).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Goals Card */}
          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#818cf8]" />
                <h3 className="text-sm font-semibold text-[#fafafa]">Strategic Goals</h3>
              </div>
              <button onClick={() => setShowAddGoal(!showAddGoal)} className="text-xs text-[#7c3aed] hover:underline flex items-center space-x-1 font-medium">
                <Plus className="w-3.5 h-3.5" /><span>Add</span>
              </button>
            </div>

            {showAddGoal && (
              <form onSubmit={handleCreateGoal} className="bg-[#141417] p-3 rounded-md space-y-2 border border-[#27272a]">
                <input type="text" placeholder="Goal metric name..." value={goalName} onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#fafafa] focus:outline-none" />
                <input type="number" placeholder="Target Value..." value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#fafafa] focus:outline-none" />
                <div className="flex space-x-2 pt-1">
                  <button type="submit" disabled={isGoalSaving} className="flex items-center gap-1.5 bg-[#7c3aed] disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition-colors">
                    {isGoalSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isGoalSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowAddGoal(false)} className="text-[#a1a1aa] text-xs">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {project.goals.length === 0 ? (
                <p className="text-xs text-[#52525b]">No strategic goals set for this project.</p>
              ) : project.goals.map((g) => {
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                return (
                  <div key={g.id} className="bg-[#141417] border border-[#1f1f23] rounded p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium flex-wrap gap-1">
                      <span className="text-[#fafafa]">{g.name}</span>
                      <span className="font-mono text-[#a1a1aa]">{g.currentValue}/{g.targetValue} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#09090b] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#818cf8] h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md overflow-hidden h-full">

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto h-full overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f23] text-[#a1a1aa] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Task</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Priority</th>
                    <th className="text-left px-4 py-3 font-semibold">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]">
                  {project.tasks.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-[#a1a1aa]">No tasks in this project yet.</td></tr>
                  ) : project.tasks.map((t) => (
                    <tr key={t.id} onClick={() => setSelectedTaskId(t.id)} className="hover:bg-[#0f0f11] cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-[#52525b]">{t.identifier}</span>
                          <span className="font-medium text-[#fafafa]">{t.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-[#a1a1aa]">{t.status}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-[#a1a1aa]">{t.priority}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-[#a1a1aa]">{t.assignee?.name || 'Unassigned'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-[#1f1f23] overflow-y-auto">
              {project.tasks.length === 0 ? (
                <div className="px-4 py-10 text-center text-xs text-[#a1a1aa]">No tasks in this project yet.</div>
              ) : project.tasks.map((t) => (
                <div key={t.id} onClick={() => setSelectedTaskId(t.id)} className="px-4 py-3 hover:bg-[#0f0f11] cursor-pointer transition-colors">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="font-mono text-[10px] text-[#52525b]">{t.identifier}</span>
                    <span className="text-[10px] font-semibold uppercase text-[#a1a1aa] bg-[#1f1f23] px-1.5 py-0.5 rounded">{t.status}</span>
                    <span className="text-[10px] text-[#71717a]">{t.priority}</span>
                  </div>
                  <p className="text-sm font-medium text-[#fafafa]">{t.title}</p>
                  {t.assignee && <p className="text-[10px] text-[#71717a] mt-0.5">{t.assignee.name}</p>}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <TimelineView
          tasks={project.tasks}
          milestones={project.milestones}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
        />
      )}

      {/* Task Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={fetchProjectDetails}
      />
    </div>
  );
}
export { ProjectDetailPage };
