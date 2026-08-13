import { API_BASE } from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckSquare, FolderKanban, BookOpen, ChevronRight, Sparkles } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CommandPaletteModal({ isOpen, onClose }: Props) {
  const { workspace, token } = useAuthStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: any[];
    projects: any[];
    wikiPages: any[];
  }>({ tasks: [], projects: [], wikiPages: [] });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ tasks: [], projects: [], wikiPages: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !query.trim() || !workspace || !token) {
      setResults({ tasks: [], projects: [], wikiPages: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/workspaces/${workspace.id}/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search query failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen, workspace, token]);

  if (!isOpen) return null;

  const totalHits = results.tasks.length + results.projects.length + results.wikiPages.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0c0c0e] border border-[#1f1f23] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-[#1f1f23] bg-[#09090b]">
          <Search className="w-4 h-4 text-[#7c3aed] mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search tasks, projects, wiki docs... (ESC to exit)"
            autoFocus
            className="w-full bg-transparent text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded text-[#a1a1aa] hover:text-white mr-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-[#1f1f23] border border-[#27272a] text-[10px] text-[#a1a1aa]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 flex-1">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-[#52525b]">
              <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40 text-[#7c3aed]" />
              Start typing to query across tasks, projects, and wiki docs.
            </div>
          ) : isSearching ? (
            <div className="py-8 text-center text-xs text-[#a1a1aa]">Searching workspace index...</div>
          ) : totalHits === 0 ? (
            <div className="py-8 text-center text-xs text-[#52525b]">No matching records found</div>
          ) : (
            <>
              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#7c3aed]" />
                    <span>Tasks</span>
                  </div>
                  <div className="space-y-1">
                    {results.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          navigate('/tasks');
                          onClose();
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#1f1f23] text-[10px] font-mono text-[#a78bfa]">
                            {task.identifier}
                          </span>
                          <span className="font-medium text-[#fafafa]">{task.title}</span>
                        </div>
                        <span className="text-[10px] text-[#71717a]">{task.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#7c3aed]" />
                    <span>Projects</span>
                  </div>
                  <div className="space-y-1">
                    {results.projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => {
                          navigate('/projects');
                          onClose();
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#1f1f23] text-[10px] font-mono text-[#a78bfa]">
                            {proj.identifier}
                          </span>
                          <span className="font-medium text-[#fafafa]">{proj.name}</span>
                        </div>
                        <span className="text-[10px] text-[#71717a]">{proj.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wiki Pages */}
              {results.wikiPages.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#7c3aed]" />
                    <span>Wiki Documents</span>
                  </div>
                  <div className="space-y-1">
                    {results.wikiPages.map((page) => (
                      <div
                        key={page.id}
                        onClick={() => {
                          navigate('/wiki');
                          onClose();
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-3.5 h-3.5 text-[#a1a1aa]" />
                          <span className="font-medium text-[#fafafa]">{page.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#52525b]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPaletteModal;
