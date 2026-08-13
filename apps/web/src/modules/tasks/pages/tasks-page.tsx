import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  Plus, CheckSquare, List, Columns, Filter, Calendar as CalendarIcon,
  Clock, AlertCircle, CircleCheck, Circle, Ban, Inbox, Search, ChevronRight, ChevronDown, Tag, Link2
} from 'lucide-react';
import { TaskDetailDrawer } from '../components/task-detail-drawer';
import { TimelineView } from '../components/timeline-view';

interface Task {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  labels: { label: { id: string; name: string; color: string } }[];
  subtasks: { id: string; identifier: string; title: string; status: string }[];
  blockedBy?: { blockingTaskId: string }[];
  _count: { subtasks: number; comments: number };
}

interface Project {
  id: string;
  name: string;
  identifier: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

const KANBAN_COLUMNS = [
  { key: 'BACKLOG', label: 'Backlog', icon: Inbox, color: '#71717a' },
  { key: 'TODO', label: 'To Do', icon: Circle, color: '#a1a1aa' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: '#f59e0b' },
  { key: 'IN_REVIEW', label: 'In Review', icon: AlertCircle, color: '#818cf8' },
  { key: 'DONE', label: 'Done', icon: CircleCheck, color: '#4ade80' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, color: '#f87171' },
];

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'text-[#f87171]',
  HIGH: 'text-[#fb923c]',
  MEDIUM: 'text-[#facc15]',
  LOW: 'text-[#a1a1aa]',
  NONE: 'text-[#52525b]',
};

type ViewMode = 'list' | 'kanban' | 'timeline';

export default function TasksPage() {
  const { workspace, token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Selected task drawer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Drag & drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Collapsible subtasks state
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const [workspaceMembers, setWorkspaceMembers] = useState<{ userId: string; user: { id: string; name: string } }[]>([]);

  useEffect(() => {
    if (!workspace || !token) return;
    fetchTasks();
    fetchProjects();
    fetchLabels();
    fetchMembers();
  }, [workspace, token, searchQuery, filterProject, filterStatus, filterPriority, filterLabel, filterAssignee]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterProject) params.append('projectId', filterProject);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterLabel) params.append('labelId', filterLabel);
      if (filterAssignee) params.append('assigneeId', filterAssignee);

      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTasks(data);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProjects(await res.json());
  };

  const fetchLabels = async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/labels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLabels(await res.json());
  };

  const fetchMembers = async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setWorkspaceMembers(await res.json());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: newTitle,
        projectId: selectedProjectId || undefined,
      }),
    });
    if (res.ok) {
      setNewTitle('');
      setShowCreate(false);
      fetchTasks();
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    }
  };

  const handleDragStart = (taskId: string) => setDraggingId(taskId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggingId) {
      handleStatusUpdate(draggingId, targetStatus);
      setDraggingId(null);
    }
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[#7c3aed] flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5 hidden sm:block">{tasks.length} tasks in workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-[#0c0c0e] border border-[#1f1f23] rounded p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
                viewMode === 'list' ? 'bg-[#27272a] text-[#fafafa] font-semibold' : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-[#27272a] text-[#fafafa] font-semibold' : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
                viewMode === 'timeline' ? 'bg-[#27272a] text-[#fafafa] font-semibold' : 'text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`flex items-center space-x-1.5 border border-[#1f1f23] px-2 sm:px-3 py-1.5 rounded text-xs transition-colors ${
              showFilterBar ? 'bg-[#7c3aed]/20 border-[#7c3aed] text-white' : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
            title="Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center space-x-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-2.5 sm:px-4 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0"
            title="New Task"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilterBar && (
        <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 flex-shrink-0 animate-in fade-in duration-150">
          <div className="relative flex items-center sm:col-span-2 lg:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#71717a]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#09090b] border border-[#1f1f23] rounded pl-8 pr-3 py-1.5 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#a1a1aa] focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.identifier} — {p.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#a1a1aa] focus:outline-none"
          >
            <option value="">All Statuses</option>
            {KANBAN_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#a1a1aa] focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="NONE">None</option>
          </select>

          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#a1a1aa] focus:outline-none"
          >
            <option value="">All Labels</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="bg-[#09090b] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#a1a1aa] focus:outline-none"
          >
            <option value="">All Assignees</option>
            {workspaceMembers.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Quick create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#0c0c0e] border border-[#7c3aed] rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0"
        >
          <Circle className="w-4 h-4 text-[#a1a1aa] flex-shrink-0 hidden sm:block" />
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            placeholder="Task title..."
            className="flex-1 bg-transparent border border-[#27272a] sm:border-none rounded sm:rounded-none px-3 sm:px-0 py-1.5 sm:py-0 text-xs focus:outline-none text-[#fafafa] placeholder-[#52525b]"
          />
          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 sm:flex-none bg-[#141417] border border-[#27272a] text-xs text-[#a1a1aa] rounded px-2 py-1 focus:outline-none"
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button type="submit" className="bg-[#7c3aed] text-white px-3 py-1 rounded text-xs font-medium">
              Save
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-[#71717a] hover:text-[#fafafa] text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md overflow-hidden flex-1">

          {/* ── Desktop table ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f23] text-[#a1a1aa] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Task</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Status</th>
                  <th className="text-left px-4 py-3 font-semibold w-24">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold w-32">Assignee</th>
                  <th className="text-left px-4 py-3 font-semibold w-28">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#a1a1aa] text-xs">Loading tasks...</td></tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <CheckSquare className="w-10 h-10 text-[#27272a] mx-auto mb-3" />
                      <p className="text-sm text-[#a1a1aa]">No tasks match your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const col = KANBAN_COLUMNS.find((c) => c.key === task.status);
                    const Icon = col?.icon || Circle;
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                    const isExpanded = expandedTasks[task.id];
                    const isBlocked = task.blockedBy && task.blockedBy.length > 0;
                    return (
                      <React.Fragment key={task.id}>
                        <tr onClick={() => setSelectedTaskId(task.id)} className="hover:bg-[#0f0f11] group cursor-pointer transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              {hasSubtasks ? (
                                <button onClick={(e) => toggleExpand(task.id, e)} className="text-[#a1a1aa] hover:text-white">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                              ) : <span className="w-3.5" />}
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: col?.color }} />
                              <span className="font-mono text-[#52525b] text-xs">{task.identifier}</span>
                              <span className="text-[#e4e4e7] font-medium">{task.title}</span>
                              {isBlocked && <span className="bg-[#431407] text-[#fb923c] text-[9px] px-1.5 py-0.5 rounded font-bold">BLOCKED</span>}
                              {task.labels.map((l) => (
                                <span key={l.label.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: l.label.color }}>{l.label.name}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <select value={task.status} onChange={(e) => handleStatusUpdate(task.id, e.target.value)} className="bg-[#1f1f23] border-none text-xs text-[#a1a1aa] rounded px-2 py-1 focus:outline-none cursor-pointer">
                              {KANBAN_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3"><span className={`text-xs font-semibold ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span></td>
                          <td className="px-4 py-3">
                            {task.assignee ? (
                              <div className="flex items-center space-x-1.5">
                                <div className="w-5 h-5 rounded-full bg-[#27272a] flex items-center justify-center text-[10px] font-bold text-white">{task.assignee.name[0]}</div>
                                <span className="text-xs text-[#a1a1aa]">{task.assignee.name}</span>
                              </div>
                            ) : <span className="text-xs text-[#52525b]">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-[#a1a1aa]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                          </td>
                        </tr>
                        {hasSubtasks && isExpanded && task.subtasks.map((sub) => (
                          <tr key={sub.id} className="bg-[#08080a] hover:bg-[#0c0c0e] transition-colors border-b border-[#141417]">
                            <td className="px-4 py-2 pl-12" colSpan={5}>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="font-mono text-[#52525b] text-[10px]">{sub.identifier}</span>
                                <span className="text-[#a1a1aa]">{sub.title}</span>
                                <span className="text-[10px] text-[#52525b] uppercase font-mono">({sub.status})</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ── */}
          <div className="sm:hidden divide-y divide-[#1f1f23]">
            {isLoading ? (
              <div className="px-4 py-10 text-center text-[#a1a1aa] text-xs">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <CheckSquare className="w-10 h-10 text-[#27272a] mx-auto mb-3" />
                <p className="text-sm text-[#a1a1aa]">No tasks match your criteria.</p>
              </div>
            ) : tasks.map((task) => {
              const col = KANBAN_COLUMNS.find((c) => c.key === task.status);
              const Icon = col?.icon || Circle;
              const isBlocked = task.blockedBy && task.blockedBy.length > 0;
              return (
                <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="px-4 py-3 hover:bg-[#0f0f11] cursor-pointer transition-colors">
                  <div className="flex items-start gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: col?.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-mono text-[#52525b] text-[10px]">{task.identifier}</span>
                        {isBlocked && <span className="bg-[#431407] text-[#fb923c] text-[9px] px-1.5 py-0.5 rounded font-bold">BLOCKED</span>}
                        {task.labels.map((l) => (
                          <span key={l.label.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: l.label.color }}>{l.label.name}</span>
                        ))}
                      </div>
                      <p className="text-sm text-[#e4e4e7] font-medium leading-snug">{task.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pl-5">
                    <span onClick={(e) => e.stopPropagation()}>
                      <select value={task.status} onChange={(e) => handleStatusUpdate(task.id, e.target.value)} className="bg-[#1f1f23] border-none text-[10px] text-[#a1a1aa] rounded px-2 py-0.5 focus:outline-none cursor-pointer">
                        {KANBAN_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </span>
                    <span className={`text-[10px] font-semibold ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-[#27272a] flex items-center justify-center text-[9px] font-bold text-white">{task.assignee.name[0]}</div>
                        <span className="text-[10px] text-[#a1a1aa]">{task.assignee.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] text-[#a1a1aa]">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex space-x-3 overflow-x-auto pb-4 flex-1">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key);
            const Icon = col.icon;
            return (
              <div
                key={col.key}
                className="flex-shrink-0 w-72 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="flex items-center justify-between px-3 py-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                    <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{col.label}</span>
                    <span className="bg-[#1f1f23] text-[#71717a] text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-3 cursor-pointer hover:border-[#27272a] transition-colors group ${
                        draggingId === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-[#e4e4e7] mb-2 leading-snug group-hover:text-[#7c3aed] transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[#52525b] text-[10px]">{task.identifier}</span>
                        <div className="flex items-center space-x-1.5">
                          {task.labels.map((l) => (
                            <span
                              key={l.label.id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: l.label.color }}
                              title={l.label.name}
                            />
                          ))}
                          {task.assignee && (
                            <div className="w-4 h-4 rounded-full bg-[#27272a] flex items-center justify-center text-[9px] font-bold text-white">
                              {task.assignee.name[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TIMELINE GANTT VIEW */}
      {viewMode === 'timeline' && (
        <TimelineView
          tasks={tasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
        />
      )}

      {/* Task Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
}
export { TasksPage };
