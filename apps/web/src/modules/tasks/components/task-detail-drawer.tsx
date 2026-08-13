import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  X, CheckSquare, Clock, AlertCircle, CircleCheck, Circle, Ban, Inbox,
  User as UserIcon, Calendar as CalendarIcon, Tag, Link2, MessageSquare, Send, Plus, Trash2, CheckCircle2
} from 'lucide-react';

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface Subtask {
  id: string;
  identifier: string;
  title: string;
  status: string;
  assignee: { id: string; name: string } | null;
}

interface TaskDependency {
  blockingTask?: { id: string; identifier: string; title: string; status: string };
  blockedTask?: { id: string; identifier: string; title: string; status: string };
}

interface TaskDetail {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  milestoneId: string | null;
  project: { id: string; name: string; identifier: string } | null;
  milestone: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  labels: { label: Label }[];
  subtasks: Subtask[];
  comments: TaskComment[];
  blockedBy: TaskDependency[];
  blocks: TaskDependency[];
}

const STATUS_OPTIONS = [
  { key: 'BACKLOG', label: 'Backlog', icon: Inbox, color: '#71717a' },
  { key: 'TODO', label: 'To Do', icon: Circle, color: '#a1a1aa' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: '#f59e0b' },
  { key: 'IN_REVIEW', label: 'In Review', icon: AlertCircle, color: '#818cf8' },
  { key: 'DONE', label: 'Done', icon: CircleCheck, color: '#4ade80' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, color: '#f87171' },
];

const PRIORITY_OPTIONS = [
  { key: 'URGENT', label: 'Urgent', color: '#f87171' },
  { key: 'HIGH', label: 'High', color: '#fb923c' },
  { key: 'MEDIUM', label: 'Medium', color: '#facc15' },
  { key: 'LOW', label: 'Low', color: '#a1a1aa' },
  { key: 'NONE', label: 'None', color: '#52525b' },
];

export function TaskDetailDrawer({ taskId, onClose, onTaskUpdated }: TaskDetailDrawerProps) {
  const { workspace, token } = useAuthStore();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [workspaceLabels, setWorkspaceLabels] = useState<Label[]>([]);
  const [workspaceTasks, setWorkspaceTasks] = useState<{ id: string; identifier: string; title: string }[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedBlocker, setSelectedBlocker] = useState('');

  useEffect(() => {
    if (!taskId || !workspace || !token) return;
    fetchTaskDetails();
    fetchWorkspaceLabels();
    fetchWorkspaceTasks();
  }, [taskId, workspace, token]);

  // Re-fetch valid assignees once task data is available (for team-scoped projects)
  useEffect(() => {
    if (!task || !workspace || !token) return;
    fetchAssignees(task.projectId);
  }, [task?.projectId]);

  const fetchTaskDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkspaceLabels = async () => {
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/labels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setWorkspaceLabels(await res.json());
  };

  const fetchWorkspaceTasks = async () => {
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const allTasks = await res.json();
      setWorkspaceTasks(allTasks.filter((t: any) => t.id !== taskId));
    }
  };

  /**
   * Fetch valid assignees for this task:
   * - If the project is team-scoped → use the project assignees endpoint
   *   which returns only the team's members.
   * - If workspace-wide (no projectId or no team) → fall back to all workspace members.
   */
  const fetchAssignees = async (projectId: string | null) => {
    if (projectId) {
      const res = await fetch(
        `http://localhost:4000/api/v1/workspaces/${workspace!.id}/projects/${projectId}/assignees`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        // /assignees returns plain user objects: { id, name, email, avatarUrl }
        const data: WorkspaceMember[] = await res.json();
        setWorkspaceMembers(data);
        return;
      }
    }
    // Fallback: all workspace members → normalize { userId, role, user } → flat user shape
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const raw: { userId: string; role: string; user: WorkspaceMember }[] = await res.json();
      setWorkspaceMembers(raw.map((m) => m.user));
    }
  };

  /** @deprecated use fetchAssignees */
  const fetchWorkspaceMembers = async () => fetchAssignees(null);

  const handleUpdate = async (fields: Partial<{ title: string; description: string; status: string; priority: string; dueDate: string | null; assigneeId: string | null }>) => {
    if (!taskId) return;
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      fetchTaskDetails();
      onTaskUpdated();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: newComment }),
    });
    if (res.ok) {
      setNewComment('');
      fetchTaskDetails();
      onTaskUpdated();
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !taskId) return;
    const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: newSubtaskTitle,
        parentId: taskId,
        projectId: task?.projectId,
      }),
    });
    if (res.ok) {
      setNewSubtaskTitle('');
      fetchTaskDetails();
      onTaskUpdated();
    }
  };

  const handleToggleSubtaskStatus = async (subtaskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchTaskDetails();
    onTaskUpdated();
  };

  const handleAddDependency = async () => {
    if (!selectedBlocker || !taskId) return;
    await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ blockingTaskId: selectedBlocker }),
    });
    setSelectedBlocker('');
    fetchTaskDetails();
    onTaskUpdated();
  };

  const handleRemoveDependency = async (blockingTaskId: string) => {
    if (!taskId) return;
    await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}/dependencies/${blockingTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTaskDetails();
    onTaskUpdated();
  };

  const handleToggleLabel = async (labelId: string, hasLabel: boolean) => {
    if (!taskId) return;
    if (hasLabel) {
      await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}/labels/${labelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await fetch(`http://localhost:4000/api/v1/workspaces/${workspace!.id}/tasks/${taskId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ labelId }),
      });
    }
    fetchTaskDetails();
    onTaskUpdated();
  };

  if (!taskId) return null;

  const currentStatusObj = (task ? STATUS_OPTIONS.find((s) => s.key === task.status) : undefined) ?? STATUS_OPTIONS[1]!;
  const StatusIcon = currentStatusObj.icon;
  const completedSubtasks = task?.subtasks.filter((s) => s.status === 'DONE').length ?? 0;
  const totalSubtasks = task?.subtasks.length ?? 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#09090b] border-l border-[#1f1f23] text-[#fafafa] flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs text-[#a1a1aa] font-semibold">{task?.identifier || 'TASK'}</span>
            {task?.project && (
              <span className="bg-[#1f1f23] text-[#a1a1aa] text-[10px] px-2 py-0.5 rounded font-mono">
                {task.project.identifier}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#a1a1aa]">
            Loading task details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Status Bar */}
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleUpdate({ title })}
                className="w-full text-xl font-bold bg-transparent border-b border-transparent hover:border-[#27272a] focus:border-[#7c3aed] focus:outline-none px-1 py-1 transition-colors"
              />

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Selector */}
                <div className="flex items-center space-x-2 bg-[#141417] border border-[#27272a] rounded px-3 py-1.5 text-xs">
                  <StatusIcon className="w-4 h-4" style={{ color: currentStatusObj.color }} />
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdate({ status: e.target.value })}
                    className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer font-medium"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.key} value={s.key} className="bg-[#09090b]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="flex items-center space-x-2 bg-[#141417] border border-[#27272a] rounded px-3 py-1.5 text-xs">
                  <span className="text-[#a1a1aa]">Priority:</span>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdate({ priority: e.target.value })}
                    className="bg-transparent font-semibold focus:outline-none cursor-pointer"
                    style={{ color: PRIORITY_OPTIONS.find((p) => p.key === task.priority)?.color }}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.key} value={p.key} className="bg-[#09090b]" style={{ color: p.color }}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className="flex items-center space-x-2 bg-[#141417] border border-[#27272a] rounded px-3 py-1.5 text-xs text-[#a1a1aa]">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="bg-transparent focus:outline-none cursor-pointer text-[#fafafa]"
                  />
                </div>

                {/* Assignee Picker */}
                <div className="flex items-center space-x-2 bg-[#141417] border border-[#27272a] rounded px-3 py-1.5 text-xs">
                  {task.assignee ? (
                    <div className="w-5 h-5 rounded-full bg-[#7c3aed] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {task.assignee.name[0]}
                    </div>
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  )}
                  <select
                    value={task.assignee?.id ?? ''}
                    onChange={(e) => handleUpdate({ assigneeId: e.target.value || null })}
                    className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer font-medium max-w-[120px] truncate"
                  >
                    <option value="" className="bg-[#09090b]">Unassigned</option>
                    {workspaceMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#09090b]">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-[#1f1f23] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Description</h3>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleUpdate({ description })}
                placeholder="Add a detailed description..."
                className="w-full bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-3 text-sm focus:outline-none focus:border-[#7c3aed] text-[#fafafa] placeholder-[#52525b] resize-y"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-3 border-t border-[#1f1f23] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-[#7c3aed]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Subtasks</h3>
                </div>
                {totalSubtasks > 0 && (
                  <span className="text-xs font-mono text-[#a1a1aa]">{completedSubtasks}/{totalSubtasks} ({subtaskProgress}%)</span>
                )}
              </div>

              {totalSubtasks > 0 && (
                <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-[#7c3aed] h-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }} />
                </div>
              )}

              <div className="space-y-1.5">
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between bg-[#0c0c0e] border border-[#1f1f23] rounded px-3 py-2 text-sm group hover:border-[#27272a] transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => handleToggleSubtaskStatus(sub.id, sub.status)}
                        className="text-[#a1a1aa] hover:text-[#4ade80] transition-colors"
                      >
                        {sub.status === 'DONE' ? <CheckCircle2 className="w-4 h-4 text-[#4ade80]" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <span className={`text-xs ${sub.status === 'DONE' ? 'line-through text-[#71717a]' : 'text-[#fafafa]'}`}>
                        {sub.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a new subtask..."
                  className="flex-1 bg-[#0c0c0e] border border-[#1f1f23] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                />
                <button type="submit" className="bg-[#1f1f23] hover:bg-[#27272a] text-[#fafafa] px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Task Dependencies (Blocking) */}
            <div className="space-y-3 border-t border-[#1f1f23] pt-4">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-[#fb923c]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Task Dependencies</h3>
              </div>

              {task.blockedBy.length > 0 ? (
                <div className="space-y-1.5">
                  {task.blockedBy.map((dep) => dep.blockingTask && (
                    <div key={dep.blockingTask.id} className="flex items-center justify-between bg-[#1a0f0a] border border-[#431407] rounded px-3 py-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[#fb923c] font-semibold">{dep.blockingTask.identifier}</span>
                        <span className="text-[#fafafa] font-medium">{dep.blockingTask.title}</span>
                      </div>
                      <button onClick={() => handleRemoveDependency(dep.blockingTask!.id)} className="text-[#a1a1aa] hover:text-[#f87171]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#52525b]">No tasks blocking this item.</p>
              )}

              <div className="flex items-center space-x-2">
                <select
                  value={selectedBlocker}
                  onChange={(e) => setSelectedBlocker(e.target.value)}
                  className="flex-1 bg-[#0c0c0e] border border-[#1f1f23] rounded px-3 py-1.5 text-xs text-[#fafafa] focus:outline-none"
                >
                  <option value="">Select a blocking task...</option>
                  {workspaceTasks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#09090b]">
                      {t.identifier} — {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddDependency}
                  disabled={!selectedBlocker}
                  className="bg-[#1f1f23] disabled:opacity-50 hover:bg-[#27272a] text-[#fafafa] px-3 py-1.5 rounded text-xs font-medium"
                >
                  Mark Blocker
                </button>
              </div>
            </div>

            {/* Labels & Tags */}
            <div className="space-y-3 border-t border-[#1f1f23] pt-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-[#818cf8]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Labels & Tags</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {workspaceLabels.map((lbl) => {
                  const hasLabel = task.labels.some((l) => l.label.id === lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      onClick={() => handleToggleLabel(lbl.id, hasLabel)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium flex items-center space-x-1.5 ${
                        hasLabel
                          ? 'border-transparent text-white font-semibold'
                          : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
                      }`}
                      style={{ backgroundColor: hasLabel ? lbl.color : undefined }}
                    >
                      <span>{lbl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments Thread */}
            <div className="space-y-4 border-t border-[#1f1f23] pt-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-[#7c3aed]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
                  Activity & Comments ({task.comments.length})
                </h3>
              </div>

              <div className="space-y-3">
                {task.comments.map((c) => (
                  <div key={c.id} className="bg-[#0c0c0e] border border-[#1f1f23] rounded-md p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-[10px]">
                          {c.author.name[0]}
                        </div>
                        <span className="font-semibold text-[#fafafa]">{c.author.name}</span>
                      </div>
                      <span className="text-[#52525b] text-[10px]">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#a1a1aa] leading-relaxed pl-7">{c.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-[#0c0c0e] border border-[#1f1f23] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#7c3aed] text-[#fafafa]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
