import { API_BASE } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { WidgetFrame } from '../WidgetFrame';
import { Sparkles, Send, Wand2, Code, Compass, ArrowRight, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../../app/stores/auth.store';

const QUICK_PROMPTS = [
  {
    icon: Wand2,
    label: 'Analyze Blockers',
    prompt: 'Emberlyn, please review our active workspace tasks and highlight any potential blockers or risks.',
  },
  {
    icon: Code,
    label: 'Draft Tech RFC',
    prompt: 'Emberlyn, help me draft a clean architecture proposal RFC for a scalable new feature module.',
  },
  {
    icon: Compass,
    label: 'Sprint Velocity',
    prompt: 'Emberlyn, what strategic steps should our team take to optimize current milestone velocity?',
  },
];

interface RecentConv {
  id: string;
  title: string;
  updatedAt: string;
  activeModelName?: string;
}

export function AiQuickChatWidget() {
  const [promptInput, setPromptInput] = useState('');
  const [recentConvs, setRecentConvs] = useState<RecentConv[]>([]);
  const navigate = useNavigate();
  const { workspace, token } = useAuthStore();

  useEffect(() => {
    if (!workspace || !token) return;
    fetch(`${API_BASE}/api/v1/workspaces/${workspace.id}/ai/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: RecentConv[]) => setRecentConvs(data.slice(0, 3)))
      .catch(() => {});
  }, [workspace?.id, token]);

  const handleLaunchAi = (promptText: string) => {
    if (!promptText.trim()) return;
    navigate('/ai', { state: { prompt: promptText.trim() } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLaunchAi(promptInput);
  };

  const headerAction = (
    <button
      onClick={() => navigate('/ai')}
      className="inline-flex items-center space-x-1 text-xs text-[#a78bfa] hover:text-white transition font-medium"
    >
      <span>Full Assistant</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <WidgetFrame
      title="Emberlyn AI Command"
      description="Context-aware AI assistant for workspace insights & generation"
      icon={Sparkles}
      headerAction={headerAction}
    >
      <div className="space-y-3">

        {/* Recent conversations */}
        {recentConvs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b] px-0.5">Recent Chats</p>
            {recentConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate('/ai')}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 hover:bg-[#7c3aed]/5 transition duration-150 group text-left"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#52525b] group-hover:text-[#a78bfa] flex-shrink-0 transition" />
                <span className="text-xs text-[#a1a1aa] group-hover:text-[#e4e4e7] truncate flex-1 transition">
                  {conv.title}
                </span>
                {conv.activeModelName && (
                  <span className="text-[10px] font-mono text-[#52525b] flex-shrink-0 hidden sm:inline">
                    {conv.activeModelName.split('/').pop()}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quick prompt chips */}
        <div>
          {recentConvs.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b] px-0.5 mb-1.5">Quick Prompts</p>
          )}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((item) => {
              const PromptIcon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleLaunchAi(item.prompt)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 hover:bg-[#7c3aed]/10 text-xs text-[#e4e4e7] hover:text-[#a78bfa] transition duration-150 text-left"
                >
                  <PromptIcon className="w-3.5 h-3.5 text-[#a78bfa]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask Emberlyn anything about this workspace..."
              className="w-full bg-[#121215] border border-[#1f1f23] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#71717a] outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={!promptInput.trim()}
            className="flex items-center justify-center p-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white transition flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </WidgetFrame>
  );
}
