import { API_BASE } from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import Editor from '../components/Editor';
import SidebarTree from '../components/SidebarTree';
import TemplateModal, { WikiTemplateItem } from '../components/TemplateModal';
import VersionHistoryDrawer from '../components/VersionHistoryDrawer';

import {
  BookOpen,
  Plus,
  Sparkles,
  History,
  FolderTree,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  FileText,
} from 'lucide-react';

type WikiPageItem = {
  id: string;
  title: string;
  slug: string;
  parentId?: string | null;
};

type WikiVisibility = 'WORKSPACE' | 'TEAM' | 'PROJECT' | 'ROLE';
type WorkspaceTeam = { id: string; name: string };
type WorkspaceProject = { id: string; name: string };

const VISIBILITY_OPTIONS: { value: WikiVisibility; label: string }[] = [
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'TEAM', label: 'Team' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'ROLE', label: 'Role' },
];

const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST'];

export default function WikiPage() {
  const { toast } = useToast();
  const { workspace, token } = useAuthStore();
  const [pages, setPages] = useState<WikiPageItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<any>(null);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<WikiVisibility>('WORKSPACE');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [visibilityRole, setVisibilityRole] = useState<string>('MEMBER');
  const [teams, setTeams] = useState<WorkspaceTeam[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [templates, setTemplates] = useState<WikiTemplateItem[]>([]);

  const isVisibilityTargetMissing =
    (visibility === 'TEAM' && !selectedTeamId) ||
    (visibility === 'PROJECT' && !selectedProjectId) ||
    (visibility === 'ROLE' && !visibilityRole);

  const visibilityWarningMessage =
    visibility === 'TEAM'
      ? 'Select a team before saving a TEAM-visible page.'
      : visibility === 'PROJECT'
      ? 'Select a project before saving a PROJECT-visible page.'
      : visibility === 'ROLE'
      ? 'Select a role before saving a ROLE-visible page.'
      : '';

  // Sidebar closed by default on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);

  const createPage = async ({
    title,
    content,
    parentId: createParentId,
    visibility: createVisibility,
    teamId,
    projectId,
    visibilityRole: createVisibilityRole,
  }: {
    title: string;
    content?: any;
    parentId?: string | null;
    visibility?: WikiVisibility;
    teamId?: string | null;
    projectId?: string | null;
    visibilityRole?: string | null;
  }) => {
    const body: Record<string, any> = {
      title,
      content,
      parentId: createParentId,
      visibility: createVisibility,
    };

    if (teamId) body.teamId = teamId;
    if (projectId) body.projectId = projectId;
    if (createVisibilityRole) body.visibilityRole = createVisibilityRole;

    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Create wiki page failed', res.status, text);
      toast.error('Failed to create page', `Status ${res.status}`);
      return null;
    }
    try {
      const data = JSON.parse(text);
      await fetchPages();
      return data;
    } catch (err) {
      console.error('Invalid JSON response creating page', text);
      toast.warning('Page created', 'Response could not be parsed.');
      await fetchPages();
      return null;
    }
  };

  const fetchPages = async () => {
    setIsLoadingPages(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (res.ok) {
          setPages(data);
          // Select first page automatically if none selected
          if (!selectedPageId && data.length > 0) {
            selectPage(data[0].id);
          }
        } else {
          console.error('Failed to fetch wiki pages', res.status, data);
        }
      } catch (err) {
        console.error('Invalid JSON response fetching pages', text);
      }
    } finally {
      setIsLoadingPages(false);
    }
  };

  useEffect(() => {
    if (!workspace || !token) return;
    fetchPages();
    fetchTemplates();
    fetchTeams();
    fetchProjects();
  }, [workspace, token]);

  const selectPage = async (id: string) => {
    setSelectedPageId(id);
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Failed to load page', res.status, text);
      return;
    }
    try {
      const data = JSON.parse(text);
      setPageTitle(data.title ?? '');
      setVisibility((data.visibility ?? 'WORKSPACE') as WikiVisibility);
      setSelectedTeamId(data.teamId ?? null);
      setSelectedProjectId(data.projectId ?? null);
      setVisibilityRole(data.visibilityRole ?? 'MEMBER');
      setPageContent(data.latest?.content ?? data.content ?? null);
      setParentId(data.parentId ?? null);
      fetchVersions(id);
    } catch (err) {
      console.error('Invalid JSON response loading page', text);
    }
  };

  const handleCreate = async (title = 'Untitled Document', createParentId: string | null = parentId) => {
    if (isVisibilityTargetMissing) {
      toast.warning('Missing required field', visibilityWarningMessage);
      return;
    }

    const page = await createPage({
      title,
      content: null,
      parentId: createParentId,
      visibility,
      teamId: visibility === 'TEAM' ? selectedTeamId : null,
      projectId: visibility === 'PROJECT' ? selectedProjectId : null,
      visibilityRole: visibility === 'ROLE' ? visibilityRole : null,
    });
    if (page?.id) selectPage(page.id);
  };

  const fetchTemplates = async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Failed to fetch templates', res.status, text);
      return;
    }
    try {
      const data = JSON.parse(text);
      setTemplates(data);
    } catch (err) {
      console.error('Invalid JSON response fetching templates', text);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTeams(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const handleSelectTemplate = async (template: WikiTemplateItem) => {
    const page = await createPage({
      title: template.name.startsWith('New ') ? template.name : `${template.name}`,
      content: template.content,
      parentId,
      visibility,
      teamId: visibility === 'TEAM' ? selectedTeamId : null,
      projectId: visibility === 'PROJECT' ? selectedProjectId : null,
      visibilityRole: visibility === 'ROLE' ? visibilityRole : null,
    });
    if (page?.id) selectPage(page.id);
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedPageId) return;
    const name = pageTitle ? `${pageTitle} template` : 'Untitled template';
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name,
        description: `Saved from document "${pageTitle}"`,
        content: pageContent,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Save template failed', res.status, text);
      toast.error('Failed to save template', `Status ${res.status}`);
      return;
    }
    await fetchTemplates();
    toast.success('Template saved', 'Template is now available workspace-wide.');
  };

  const handleMovePage = async (pageId: string, newParentId: string | null) => {
    if (pageId === newParentId) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ parentId: newParentId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Move page failed', res.status, text);
      return;
    }
    await fetchPages();
    if (selectedPageId === pageId) {
      setParentId(newParentId);
    }
  };

  const handleDeletePage = (pageId: string) => {
    setDeletePageId(pageId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePage = async () => {
    if (!deletePageId) return;

    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${deletePageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Delete page failed', res.status, text);
      toast.error('Failed to delete page');
      return;
    }

    setIsDeleteModalOpen(false);
    const wasSelected = deletePageId === selectedPageId;
    if (wasSelected) {
      setSelectedPageId(null);
      setPageTitle('');
      setPageContent(null);
      setParentId(null);
      setVisibility('WORKSPACE');
      setSelectedTeamId(null);
      setSelectedProjectId(null);
      setVisibilityRole('MEMBER');
    }
    setDeletePageId(null);
    await fetchPages();
  };

  const handleSave = async (content: any) => {
    if (!selectedPageId) return;
    if (isVisibilityTargetMissing) {
      toast.warning('Missing required field', visibilityWarningMessage);
      return;
    }

    const body: Record<string, any> = {
      content,
      title: pageTitle,
      parentId,
      visibility,
    };

    if (visibility === 'TEAM' && selectedTeamId) {
      body.teamId = selectedTeamId;
    }
    if (visibility === 'PROJECT' && selectedProjectId) {
      body.projectId = selectedProjectId;
    }
    if (visibility === 'ROLE' && visibilityRole) {
      body.visibilityRole = visibilityRole;
    }

    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${selectedPageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Save page failed', res.status, text);
      return;
    }
    await fetchPages();
    if (selectedPageId) fetchVersions(selectedPageId);
  };

  const fetchVersions = async (pageId: string) => {
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${pageId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) {
        setVersions([]);
        return;
      }
      try {
        const data = JSON.parse(text);
        setVersions(data);
      } catch (err) {
        setVersions([]);
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedPageId) return;
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/wiki/${selectedPageId}/versions/${versionId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Restore version failed', res.status, text);
      toast.error('Restore failed', `Status ${res.status}`);
      return;
    }
    if (selectedPageId) selectPage(selectedPageId);
  };

  const deleteTarget = pages.find((p) => p.id === deletePageId);
  const activePage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 sm:-m-6 bg-[#09090b] text-[#fafafa] font-sans overflow-hidden">

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Top Workspace Bar */}
      <header className="h-12 border-b border-[#1f1f23] bg-[#0c0c0e] px-3 sm:px-4 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#1f1f23] transition flex-shrink-0"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-xs text-[#a1a1aa] min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-[#7c3aed] flex-shrink-0" />
            <span className="font-semibold text-[#fafafa] hidden sm:inline">Wiki</span>
            <ChevronRight className="w-3 h-3 text-[#52525b] hidden sm:inline flex-shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[200px] text-[#e4e4e7]">{activePage?.title || 'Knowledge Base'}</span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">          {selectedPageId && (
            <>
              {/* Parent Selector — hidden on mobile, visible sm+ */}
              <div className="hidden sm:flex items-center space-x-1.5 bg-[#121215] border border-[#1f1f23] rounded-md px-2 py-1 text-xs">
                <span className="text-[#a1a1aa]">Parent:</span>
                <select
                  value={parentId ?? ''}
                  onChange={(e) => {
                    const newParent = e.target.value || null;
                    setParentId(newParent);
                    if (selectedPageId) handleMovePage(selectedPageId, newParent);
                  }}
                  className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer max-w-[120px]"
                >
                  <option value="" className="bg-[#121215]">Root (No Parent)</option>
                  {pages
                    .filter((page) => page.id !== selectedPageId)
                    .map((page) => (
                      <option key={page.id} value={page.id} className="bg-[#121215]">
                        {page.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Visibility Selector — hidden on mobile/tablet, visible lg+ */}
              <div className="hidden lg:flex items-center space-x-2 bg-[#121215] border border-[#1f1f23] rounded-md px-2 py-1 text-xs">
                <span className="text-[#a1a1aa]">Visibility:</span>
                <select
                  value={visibility}
                  onChange={(e) => {
                    const value = e.target.value as WikiVisibility;
                    setVisibility(value);
                    if (value !== 'TEAM') setSelectedTeamId(null);
                    if (value !== 'PROJECT') setSelectedProjectId(null);
                    if (value !== 'ROLE') setVisibilityRole('MEMBER');
                  }}
                  className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer"
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#121215]">
                      {option.label}
                    </option>
                  ))}
                </select>
                {visibility === 'TEAM' && (
                  <select
                    value={selectedTeamId ?? ''}
                    onChange={(e) => setSelectedTeamId(e.target.value || null)}
                    className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#121215]">Select Team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id} className="bg-[#121215]">
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
                {visibility === 'PROJECT' && (
                  <select
                    value={selectedProjectId ?? ''}
                    onChange={(e) => setSelectedProjectId(e.target.value || null)}
                    className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#121215]">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="bg-[#121215]">
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
                {visibility === 'ROLE' && (
                  <select
                    value={visibilityRole}
                    onChange={(e) => setVisibilityRole(e.target.value)}
                    className="bg-transparent text-[#fafafa] focus:outline-none cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role} className="bg-[#121215]">
                        {role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isVisibilityTargetMissing && (
                <div className="hidden lg:flex items-center rounded-md border border-[#f87171]/30 bg-[#7f1d1d]/10 px-2 py-1 text-xs text-[#fca5a5]">
                  {visibilityWarningMessage}
                </div>
              )}

              <button
                onClick={() => setIsHistoryDrawerOpen(true)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                  isHistoryDrawerOpen
                    ? 'bg-[#7c3aed]/20 border-[#7c3aed] text-[#a78bfa]'
                    : 'bg-[#121215] border-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#27272a]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
              </button>
            </>
          )}

          {/* Templates Launcher */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/50 text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition"
            title="Templates"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* New Page Primary Button */}
          <button
            onClick={() => handleCreate('Untitled Document')}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md text-xs font-semibold shadow-sm transition"
            title="New Page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Page</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left Tree Sidebar —
            Desktop: static collapsible
            Mobile:  fixed slide-over from left */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'}
            transition-all duration-200 ease-in-out
            border-r border-[#1f1f23] bg-[#0c0c0e]
            flex flex-col flex-shrink-0 overflow-hidden
            h-[calc(100vh-5rem)] md:h-auto
          `}
        >
          <div className="p-3 border-b border-[#1f1f23] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
              <FolderTree className="w-3.5 h-3.5 text-[#7c3aed]" />
              <span>Pages ({pages.length})</span>
            </div>
            {/* Mobile: close button inside sidebar */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23] transition"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile-only: parent + visibility controls inside sidebar */}
          {selectedPageId && (
            <div className="md:hidden p-3 border-b border-[#1f1f23] space-y-2 flex-shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">Parent</span>
                <select
                  value={parentId ?? ''}
                  onChange={(e) => {
                    const newParent = e.target.value || null;
                    setParentId(newParent);
                    if (selectedPageId) handleMovePage(selectedPageId, newParent);
                  }}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-2 py-1.5 text-xs text-[#fafafa] focus:outline-none"
                >
                  <option value="" className="bg-[#121215]">Root (No Parent)</option>
                  {pages.filter((p) => p.id !== selectedPageId).map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#121215]">{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">Visibility</span>
                <select
                  value={visibility}
                  onChange={(e) => {
                    const value = e.target.value as WikiVisibility;
                    setVisibility(value);
                    if (value !== 'TEAM') setSelectedTeamId(null);
                    if (value !== 'PROJECT') setSelectedProjectId(null);
                    if (value !== 'ROLE') setVisibilityRole('MEMBER');
                  }}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded px-2 py-1.5 text-xs text-[#fafafa] focus:outline-none"
                >
                  {VISIBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#121215]">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden py-2">
            <SidebarTree
              pages={pages}
              selectedId={selectedPageId}
              onSelect={(id) => { selectPage(id); setIsSidebarOpen(false); }}
              onMove={handleMovePage}
              onCreateChild={(parentId) => handleCreate('Untitled Subpage', parentId)}
              onDeletePage={handleDeletePage}
            />
          </div>
        </aside>

        {/* Center Editor Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#09090b] min-w-0">
          {selectedPageId ? (
            <Editor
              key={selectedPageId}
              initialContent={pageContent}
              onSave={handleSave}
              title={pageTitle}
              onTitleChange={setPageTitle}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
              <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center text-[#7c3aed] mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#fafafa] mb-1">No Page Selected</h2>
              <p className="text-xs text-[#a1a1aa] max-w-sm mb-6">
                Select an existing wiki document from the sidebar or create a new page to start writing.
              </p>
              {/* Mobile: also show "Browse Pages" button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden flex items-center justify-center space-x-2 px-4 py-2 bg-[#1f1f23] hover:bg-[#27272a] text-white rounded-lg text-xs font-semibold transition"
                >
                  <FolderTree className="w-4 h-4" />
                  <span>Browse Pages</span>
                </button>
                <button
                  onClick={() => handleCreate('Untitled Document')}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Document</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Slide-over Version History Drawer */}
        <VersionHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          versions={versions}
          isLoading={isLoadingVersions}
          onRestoreVersion={handleRestoreVersion}
        />

        {/* Template Selection Modal */}
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
          onSaveAsTemplate={selectedPageId ? handleSaveAsTemplate : undefined}
        />

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-[#1f1f23] bg-[#0c0c0e] shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#1f1f23]">
                <h2 className="text-lg font-semibold text-[#fafafa]">Confirm Delete</h2>
                <p className="mt-2 text-sm text-[#a1a1aa]">
                  Are you sure you want to permanently delete this wiki page? This action cannot be undone.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-2xl bg-[#131316] border border-[#27272a] p-4 text-sm text-[#f8bcc5]">
                  <p className="font-medium">Page to delete:</p>
                  <p className="mt-1 text-[#fafafa] truncate">{deleteTarget?.title || 'Untitled Document'}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[#1f1f23] bg-[#121215] text-xs font-semibold text-[#a1a1aa] hover:text-[#fafafa] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePage}
                    className="px-4 py-2 rounded-lg bg-[#ef4444] text-xs font-semibold text-white hover:bg-[#dc2626] transition"
                  >
                    Delete Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { WikiPage };
