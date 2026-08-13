import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../app/stores/auth.store';
import { WidgetFrame } from '../WidgetFrame';
import { BookOpen, ArrowRight, FileText, File } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}

export function RecentWikiWidget() {
  const { workspace, token } = useAuthStore();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    if (!workspace || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${workspace.id}/wiki`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: WikiPage[] = await res.json();
        setPages(data.slice(0, 4));
      } else {
        setError('Failed to load wiki documents');
      }
    } catch {
      setError('Unable to fetch knowledge base pages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [workspace?.id, token]);

  const headerAction = (
    <Link
      to="/wiki"
      className="inline-flex items-center space-x-1 text-xs text-[#a78bfa] hover:text-white transition font-medium"
    >
      <span>Open Wiki</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );

  return (
    <WidgetFrame
      title="Knowledge & Documentation"
      description="Recently updated wiki articles and operational docs"
      icon={BookOpen}
      headerAction={headerAction}
      isLoading={isLoading}
      error={error}
      onRetry={fetchPages}
    >
      {pages.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <File className="w-8 h-8 text-[#27272a] mx-auto" />
          <p className="text-xs text-[#a1a1aa]">No wiki pages created yet.</p>
          <Link
            to="/wiki"
            className="inline-block text-xs text-[#7c3aed] hover:underline pt-1 font-medium"
          >
            + Create a document
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pages.map((page) => (
            <Link
              key={page.id}
              to="/wiki"
              className="flex items-center justify-between p-3 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#27272a] transition duration-150 group block"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileText className="w-4 h-4 text-[#a78bfa] flex-shrink-0" />
                <div className="truncate">
                  <span className="text-xs text-[#fafafa] font-semibold truncate group-hover:text-[#a78bfa] transition block">
                    {page.title}
                  </span>
                  <span className="text-[11px] text-[#71717a] font-mono truncate block">
                    /{page.slug}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                <span className="text-[10px] text-[#71717a] bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a]">
                  Wiki Page
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}
