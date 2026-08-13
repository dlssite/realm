import React from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { DashboardGrid } from '../components/DashboardGrid';
import { Calendar, Plus, Sparkles, FolderKanban, CheckSquare, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DashboardPage() {
  const { user, workspace } = useAuthStore();
  const navigate = useNavigate();

  const greeting = getTimeGreeting();
  const dateStr = getFormattedDate();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Member';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#1f1f23]">
        <div className="min-w-0">
          <div className="flex items-center space-x-2 text-xs text-[#a78bfa] font-medium mb-1">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">{dateStr}</span>
            <span className="sm:hidden">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>•</span>
            <span className="text-[#71717a] font-normal truncate">{workspace?.name || 'Workspace'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#fafafa] tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5 hidden sm:block">
            Here is what is happening across your workspace initiatives today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-xs text-[#fafafa] font-medium transition"
            title="Tasks"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tasks</span>
          </button>
          <button
            onClick={() => navigate('/wiki')}
            className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-xs text-[#fafafa] font-medium transition"
            title="Docs"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Docs</span>
          </button>
          <button
            onClick={() => navigate('/ai')}
            className="flex items-center space-x-1.5 px-2 sm:px-3.5 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-xs text-white font-medium shadow-md shadow-[#7c3aed]/20 transition"
            title="Ask Emberlyn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask Emberlyn</span>
          </button>
        </div>
      </div>

      {/* Dynamic Widget Grid */}
      <DashboardGrid />
    </div>
  );
}

export default DashboardPage;
