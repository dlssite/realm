import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../app/stores/auth.store';
import { WidgetFrame } from '../WidgetFrame';
import { FolderKanban, ArrowRight, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
  status: string;
  _count: { tasks: number; milestones: number };
}

const DEFAULT_BADGE = { label: 'Planned', className: 'bg-[#1c1917] text-[#a8a29e] border-[#292524]' };

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PLANNED:   { label: 'Planned',   className: 'bg-[#1c1917] text-[#a8a29e] border-[#292524]' },
  ACTIVE:    { label: 'Active',    className: 'bg-[#0f2a1d] text-[#4ade80] border-[#14532d]' },
  PAUSED:    { label: 'Paused',    className: 'bg-[#1c1917] text-[#fb923c] border-[#431407]' },
  COMPLETED: { label: 'Completed', className: 'bg-[#0c1a2e] text-[#60a5fa] border-[#1e3a5f]' },
  CANCELLED: { label: 'Cancelled', className: 'bg-[#1a0a0a] text-[#f87171] border-[#7f1d1d]' },
};

export function ActiveProjectsWidget() {
  const { workspace, token } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!workspace || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data.slice(0, 3));
      } else {
        setError('Failed to load projects');
      }
    } catch {
      setError('Unable to fetch project data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [workspace?.id, token]);

  const headerAction = (
    <Link
      to="/projects"
      className="inline-flex items-center space-x-1 text-xs text-[#a78bfa] hover:text-white transition font-medium"
    >
      <span>View all</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );

  return (
    <WidgetFrame
      title="Active Projects"
      description="Initiatives and strategic goals in progress"
      icon={FolderKanban}
      headerAction={headerAction}
      isLoading={isLoading}
      error={error}
      onRetry={fetchProjects}
    >
      {projects.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Folder className="w-8 h-8 text-[#27272a] mx-auto" />
          <p className="text-xs text-[#a1a1aa]">No active projects found.</p>
          <Link
            to="/projects"
            className="inline-block text-xs text-[#7c3aed] hover:underline pt-1 font-medium"
          >
            + Initialize a project
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {projects.map((project) => {
            const badge = STATUS_BADGES[project.status] ?? DEFAULT_BADGE;

            return (
              <Link
                key={project.id}
                to="/projects"
                className="flex items-center justify-between p-3 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#27272a] transition duration-150 group block"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-7 h-7 rounded bg-[#1f1f23] border border-[#27272a] flex items-center justify-center text-xs font-mono font-bold text-[#a78bfa] flex-shrink-0">
                    {project.identifier ? project.identifier.replace('PROJ-', 'P') : 'P'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs text-[#fafafa] font-semibold truncate group-hover:text-[#a78bfa] transition">
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="text-[11px] text-[#71717a] truncate font-normal">
                        {project.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 flex-shrink-0 ml-3">
                  <span className="text-[11px] text-[#71717a] hidden sm:inline">
                    {project._count?.tasks || 0} tasks
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
