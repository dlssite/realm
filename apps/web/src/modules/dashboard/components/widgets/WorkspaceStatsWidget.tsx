import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../app/stores/auth.store';
import { WidgetFrame } from '../WidgetFrame';
import { FolderKanban, CheckSquare, BookOpen, Sparkles, TrendingUp, ArrowUpRight, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatsState {
  projectCount: number;
  activeProjectCount: number;
  taskCount: number;
  openTaskCount: number;
  wikiCount: number;
  aiConvCount: number;
}

interface StatCard {
  label: string;
  value: number;
  total: number;
  subtext: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  link: string;
}

export function WorkspaceStatsWidget() {
  const { workspace, token } = useAuthStore();
  const [stats, setStats] = useState<StatsState>({
    projectCount: 0,
    activeProjectCount: 0,
    taskCount: 0,
    openTaskCount: 0,
    wikiCount: 0,
    aiConvCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!workspace || !token) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = `${API_BASE}/api/v1/workspaces/${workspace.id}`;

      // Parallel independent queries as per configuration
      const [projRes, taskRes, wikiRes, aiRes] = await Promise.all([
        fetch(`${baseUrl}/projects`, { headers }).catch(() => null),
        fetch(`${baseUrl}/tasks`, { headers }).catch(() => null),
        fetch(`${baseUrl}/wiki`, { headers }).catch(() => null),
        fetch(`${baseUrl}/ai/conversations`, { headers }).catch(() => null),
      ]);

      const projects = projRes && projRes.ok ? await projRes.json() : [];
      const tasks = taskRes && taskRes.ok ? await taskRes.json() : [];
      const wikiPages = wikiRes && wikiRes.ok ? await wikiRes.json() : [];
      const aiConvs = aiRes && aiRes.ok ? await aiRes.json() : [];

      const activeProjects = Array.isArray(projects)
        ? projects.filter((p: any) => p.status === 'ACTIVE' || p.status === 'PLANNED').length
        : 0;

      const openTasks = Array.isArray(tasks)
        ? tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED').length
        : 0;

      setStats({
        projectCount: Array.isArray(projects) ? projects.length : 0,
        activeProjectCount: activeProjects,
        taskCount: Array.isArray(tasks) ? tasks.length : 0,
        openTaskCount: openTasks,
        wikiCount: Array.isArray(wikiPages) ? wikiPages.length : 0,
        aiConvCount: Array.isArray(aiConvs) ? aiConvs.length : 0,
      });
    } catch {
      setError('Unable to load workspace analytics metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [workspace?.id, token]);

  const cards: StatCard[] = [
    {
      label: 'Active Projects',
      value: stats.activeProjectCount,
      total: stats.projectCount,
      subtext: `${stats.activeProjectCount} of ${stats.projectCount} active`,
      icon: FolderKanban,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      link: '/projects',
    },
    {
      label: 'Open Action Items',
      value: stats.openTaskCount,
      total: stats.taskCount,
      subtext: `${stats.openTaskCount} pending tasks`,
      icon: CheckSquare,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      link: '/tasks',
    },
    {
      label: 'Wiki Documents',
      value: stats.wikiCount,
      total: stats.wikiCount,
      subtext: 'Knowledge base pages',
      icon: BookOpen,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      link: '/wiki',
    },
    {
      label: 'AI Assistance',
      value: stats.aiConvCount,
      total: stats.aiConvCount,
      subtext: 'Emberlyn sessions',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      link: '/ai',
    },
  ];

  return (
    <WidgetFrame
      title="Workspace Performance Overview"
      description="Real-time metric breakdown across projects, tasks, wiki, and Emberlyn AI"
      icon={TrendingUp}
      isLoading={isLoading}
      error={error}
      onRetry={fetchStats}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Link
              key={card.label}
              to={card.link}
              className={`p-4 rounded-xl border ${card.borderColor} ${card.bgColor} hover:brightness-110 transition duration-150 group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#a1a1aa] group-hover:text-white transition">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#fafafa] tracking-tight">{card.value}</span>
                  <p className="text-[11px] text-[#71717a] mt-0.5 font-sans">{card.subtext}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#71717a] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-150" />
              </div>
            </Link>
          );
        })}
      </div>
    </WidgetFrame>
  );
}
