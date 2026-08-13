import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../app/stores/auth.store';
import { WidgetFrame } from '../WidgetFrame';
import { CheckSquare, ArrowRight, Clock, AlertCircle, CircleCheck, Circle, Inbox, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
}

const DEFAULT_STATUS_ICON = { icon: Circle, color: 'text-[#a1a1aa]' };
const DEFAULT_PRIO_CLASS = 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  BACKLOG:     { icon: Inbox,       color: 'text-[#71717a]' },
  TODO:        { icon: Circle,      color: 'text-[#a1a1aa]' },
  IN_PROGRESS: { icon: Clock,       color: 'text-[#f59e0b]' },
  IN_REVIEW:   { icon: AlertCircle, color: 'text-[#818cf8]' },
  DONE:        { icon: CircleCheck, color: 'text-[#4ade80]' },
  CANCELLED:   { icon: Ban,         color: 'text-[#f87171]' },
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-400 bg-red-400/10 border-red-400/20',
  HIGH:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  LOW:    'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};

export function RecentTasksWidget() {
  const { workspace, token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!workspace || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace.id}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Task[] = await res.json();
        const openTasks = data
          .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
          .slice(0, 4);
        setTasks(openTasks);
      } else {
        setError('Failed to load recent tasks');
      }
    } catch {
      setError('Unable to fetch task data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [workspace?.id, token]);

  const headerAction = (
    <Link
      to="/tasks"
      className="inline-flex items-center space-x-1 text-xs text-[#a78bfa] hover:text-white transition font-medium"
    >
      <span>View all</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );

  return (
    <WidgetFrame
      title="Action Items & Tasks"
      description="Highest priority open items requiring your attention"
      icon={CheckSquare}
      headerAction={headerAction}
      isLoading={isLoading}
      error={error}
      onRetry={fetchTasks}
    >
      {tasks.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-[#27272a] mx-auto" />
          <p className="text-xs text-[#a1a1aa]">All caught up! No active tasks pending.</p>
          <Link
            to="/tasks"
            className="inline-block text-xs text-[#7c3aed] hover:underline pt-1 font-medium"
          >
            + Create a task
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const statusConfig = STATUS_ICONS[task.status] ?? DEFAULT_STATUS_ICON;
            const StatusIcon = statusConfig.icon;
            const prioClass = (task.priority && PRIORITY_COLOR[task.priority]) ?? DEFAULT_PRIO_CLASS;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#27272a] transition duration-150 group"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
                  <span className="font-mono text-[11px] text-[#71717a] font-semibold flex-shrink-0">
                    {task.identifier}
                  </span>
                  <span className="text-xs text-[#fafafa] font-medium truncate group-hover:text-[#a78bfa] transition">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  {task.priority && task.priority !== 'NONE' && (
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold border ${prioClass}`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-[11px] text-[#71717a] hidden sm:inline">
                      {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
