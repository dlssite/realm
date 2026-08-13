import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { NotificationBell } from '../../modules/notifications/components/notification-bell';
import { useNotificationStore } from '../../modules/notifications/store/notification-store';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  BookOpen, 
  Settings, 
  LogOut, 
  Search, 
  ChevronDown,
  Sparkles,
  Users2,
  MessageSquare,
  Folder,
  Calendar,
  FileText,
  LineChart,
  Zap,
  Bell,
  Grid,
  ChevronRight,
  ChevronLeft,
  Plus,
  Globe,
  Building,
  User,
  Shield,
  MoreHorizontal,
  Star,
  Clock,
  Menu,
} from 'lucide-react';
import CommandPaletteModal from '../../modules/search/components/CommandPaletteModal';

export function AppLayout() {
  const { user, workspace, token, setAuth, clearAuth } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileUserMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [userMenuPos, setUserMenuPos] = useState({ bottom: 0, left: 0, width: 0 });
  const location = useLocation();
  const navigate = useNavigate();

  const handleUserMenuToggle = (refOverride?: React.RefObject<HTMLButtonElement>) => {
    const ref = refOverride ?? userMenuButtonRef;
    if (!isUserMenuOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setUserMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsUserMenuOpen((p) => !p);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/auth/login');
  };

  // ⌘K global shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close workspace switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isWorkspaceSwitcherOpen && !target.closest('.workspace-switcher')) {
        setIsWorkspaceSwitcherOpen(false);
      }
      if (isUserMenuOpen && !target.closest('.user-menu')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWorkspaceSwitcherOpen, isUserMenuOpen]);

  // Real nav badge counts
  const [navCounts, setNavCounts] = useState({ projects: 0, tasks: 0, chat: 0 });

  // Notification store — open SSE stream when authenticated
  const initNotifications    = useNotificationStore((s) => s.init);
  const destroyNotifications = useNotificationStore((s) => s.destroy);

  useEffect(() => {
    if (token) {
      initNotifications(token);
    }
    return () => {
      // Only destroy on unmount (i.e. logout / full page unload)
    };
  }, [token, initNotifications]);

  // Tear down on logout (token becomes null)
  useEffect(() => {
    if (!token) destroyNotifications();
  }, [token, destroyNotifications]);

  useEffect(() => {
    if (!workspace?.id || !token) return;
    fetch(`http://localhost:4000/api/v1/workspaces/${workspace.id}/nav-counts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setNavCounts(data); })
      .catch(() => {});
  }, [workspace?.id, token]);

  // Organized navigation with sections
  const navSections = [
    {
      title: 'MAIN',
      items: [
        { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
        { to: '/activity', label: 'Activity', Icon: Clock },
      ]
    },
    {
      title: 'WORKSPACE',
      items: [
        { to: '/projects', label: 'Projects', Icon: FolderKanban, badge: navCounts.projects > 0 ? String(navCounts.projects) : undefined },
        { to: '/tasks',    label: 'Tasks',    Icon: CheckSquare,  badge: navCounts.tasks    > 0 ? String(navCounts.tasks)    : undefined },
        { to: '/teams',    label: 'Teams',    Icon: Users2 },
        { to: '/calendar', label: 'Calendar', Icon: Calendar },
        { to: '/files',    label: 'Files',    Icon: FileText },
      ]
    },
    {
      title: 'COLLABORATION',
      items: [
        { to: '/chat', label: 'Chat', Icon: MessageSquare, badge: navCounts.chat > 0 ? String(navCounts.chat) : undefined },
        { to: '/wiki', label: 'Wiki', Icon: BookOpen },
      ]
    },
    {
      title: 'TOOLS',
      items: [
        { to: '/ai',          label: 'Emberlyn AI',  Icon: Sparkles,  accent: true },
        { to: '/analytics',   label: 'Analytics',    Icon: LineChart },
        { to: '/automations', label: 'Automations',  Icon: Zap },
      ]
    }
  ];

  // Real workspaces fetched from API
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string; role: string }[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (!token) return;
    setWorkspacesLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/workspaces', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch {
      // silently fail — workspace list is non-critical
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleWorkspaceSwitch = (ws: { id: string; name: string; slug: string; role: string }) => {
    setAuth(user!, { id: ws.id, name: ws.name, slug: ws.slug } as any, token!);
    setIsWorkspaceSwitcherOpen(false);
    navigate('/dashboard');
  };

  // Fetch workspaces when switcher opens for the first time
  useEffect(() => {
    if (isWorkspaceSwitcherOpen && workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [isWorkspaceSwitcherOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">

      {/* ─── Sidebar ─── */}
      <aside
        className={`${
          isSidebarOpen ? 'lg:w-60 md:w-16' : 'w-16'
        } transition-all duration-300 border-r border-[#27272a] bg-[#0c0c0e] flex flex-col flex-shrink-0 z-10 hidden md:flex`}
      >
        {/* ── Fixed Header ── */}
        <div className="flex-shrink-0">
          <div className="h-16 border-b border-[#27272a] flex items-center px-4">
            {isSidebarOpen ? (
              <div className="flex items-center w-full">
                <button
                  onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                  className="workspace-switcher flex items-center space-x-3 group hover:bg-[#1f1f23] px-3 py-2 rounded-lg transition-colors flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                    {workspace?.name[0] || 'R'}
                  </div>
                  <span className="text-sm font-semibold text-[#fafafa] truncate">
                    {workspace?.name || 'Realm'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#71717a] flex-shrink-0 group-hover:text-[#fafafa] transition-colors ml-auto" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white">
                  {workspace?.name[0] || 'R'}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Workspace Switcher Dropdown */}
          {isSidebarOpen && isWorkspaceSwitcherOpen && (
            <div className="workspace-switcher border-b border-[#27272a] bg-[#111113] p-3 animate-in slide-in-from-top duration-200">
              <div className="space-y-2">
              <div className="flex items-center mb-3">
                <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider flex-1">
                  Your Workspaces
                </span>
              </div>
                
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {workspacesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-xs text-[#71717a]">Loading...</span>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-xs text-[#71717a]">No other workspaces</span>
                    </div>
                  ) : workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleWorkspaceSwitch(ws)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.99] group ${
                        workspace?.id === ws.id
                          ? 'bg-[#1f1f23] border border-[#7c3aed]/30'
                          : 'hover:bg-[#1f1f23]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                          {ws.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-[#fafafa] truncate max-w-[120px]">
                              {ws.name}
                            </span>
                            {workspace?.id === ws.id && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium flex-shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#71717a] capitalize">{ws.role.toLowerCase()}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#fafafa] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#27272a]">
                  <button
                    onClick={() => { setIsWorkspaceSwitcherOpen(false); navigate('/workspaces/new'); }}
                    className="flex items-center w-full px-3 py-2 text-sm text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23] rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                    Create new workspace
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>{/* end workspace-switcher dropdown */}

        {/* ── Scrollable Nav ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                {isSidebarOpen && (
                  <div className="px-3 mb-2">
                    <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider">
                      {section.title}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const { to, label, Icon } = item;
                    const badge = 'badge' in item ? item.badge : undefined;
                    const accent = 'accent' in item ? item.accent : undefined;
                    const isActive = location.pathname.startsWith(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`group flex items-center ${
                          isSidebarOpen ? 'justify-between px-3 py-2' : 'justify-center p-3'
                        } rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                          isActive
                            ? accent
                              ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                              : 'bg-[#1f1f23] text-[#fafafa]'
                            : 'hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`relative ${accent ? 'text-[#7c3aed]' : 'text-[#71717a] group-hover:text-[#fafafa]'} ${
                            isActive && !accent ? 'text-[#fafafa]' : ''
                          }`}>
                            <Icon className="w-4 h-4 flex-shrink-0" />
                          </div>
                          {isSidebarOpen && (
                            <span className={`text-sm ${
                              isActive 
                                ? accent 
                                  ? 'text-[#7c3aed] font-semibold' 
                                  : 'text-[#fafafa] font-semibold'
                                : 'text-[#71717a] group-hover:text-[#fafafa]'
                            }`}>
                              {label}
                            </span>
                          )}
                        </div>
                        {isSidebarOpen && badge && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive && accent
                              ? 'bg-[#7c3aed] text-white'
                              : 'bg-[#1f1f23] text-[#71717a]'
                          }`}>
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </nav>{/* end scrollable nav */}

        {/* ── Fixed Footer ── */}
        <div className="flex-shrink-0 border-t border-[#27272a]">
          {isSidebarOpen ? (
            <div className="px-2 py-2">
              <button
                ref={userMenuButtonRef}
                onClick={() => handleUserMenuToggle()}
                className="user-menu flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#1f1f23] transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-[#27272a]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                      {user?.name[0] || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium text-[#fafafa] truncate">
                      {user?.name || 'User'}
                    </span>
                    <span className="text-xs text-[#71717a] truncate">
                      {user?.email || 'user@example.com'}
                    </span>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#71717a] group-hover:text-[#fafafa] transition-colors flex-shrink-0" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <button
                ref={userMenuButtonRef}
                onClick={() => handleUserMenuToggle()}
                className="user-menu p-2 rounded-lg hover:bg-[#1f1f23] transition-colors"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-[#27272a]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white">
                    {user?.name[0] || 'U'}
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── User Menu Popup — rendered via portal to escape sidebar overflow ── */}
        {isUserMenuOpen && createPortal(
          <div
            className="user-menu fixed p-1.5 rounded-lg shadow-2xl z-[200] min-w-[224px]"
            style={{
              bottom: userMenuPos.bottom,
              left: userMenuPos.left,
              backgroundColor: '#111113',
              border: '1px solid #27272a',
            }}
          >
            {/* User identity header */}
            <div className="px-3 py-2 mb-1 border-b border-[#1f1f23]">
              <p className="text-sm font-semibold text-[#fafafa] truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#71717a] truncate">{user?.email || ''}</p>
            </div>

            <div className="space-y-0.5">
              <Link
                to="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-[#1f1f23] transition-colors"
              >
                <User className="w-4 h-4 text-[#71717a]" />
                <span className="text-sm text-[#fafafa]">Profile</span>
              </Link>
              <Link
                to="/notifications"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-[#1f1f23] transition-colors"
              >
                <Bell className="w-4 h-4 text-[#71717a]" />
                <span className="text-sm text-[#fafafa]">Notifications</span>
              </Link>
              <Link
                to="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-[#1f1f23] transition-colors"
              >
                <Settings className="w-4 h-4 text-[#71717a]" />
                <span className="text-sm text-[#fafafa]">Settings</span>
              </Link>
              <div className="my-1 border-t border-[#27272a]" />
              <button
                onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-md hover:bg-[#ef4444]/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-[#ef4444]" />
                <span className="text-sm text-[#ef4444]">Logout</span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Enhanced Topbar */}
        <header className="min-h-[64px] border-b border-[#27272a] bg-[#09090b] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileDrawerOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="p-2 rounded-lg hover:bg-[#1f1f23] transition-colors"
            >
              {/* On mobile always show a hamburger — chevron only on desktop */}
              <span className="md:hidden">
                <Menu className="w-4 h-4 text-[#71717a]" />
              </span>
              <span className="hidden md:inline">
                {isSidebarOpen
                  ? <ChevronLeft className="w-4 h-4 text-[#71717a]" />
                  : <ChevronRight className="w-4 h-4 text-[#71717a]" />
                }
              </span>
            </button>
            <div className="flex items-center space-x-2 min-w-0">
              <span className="hidden sm:inline text-sm text-[#71717a] truncate">
                {workspace?.name || 'Workspace'}
              </span>
              <ChevronRight className="hidden sm:inline w-3 h-3 text-[#71717a] flex-shrink-0" />
              <span className="text-sm font-medium text-[#fafafa] capitalize truncate max-w-[140px] sm:max-w-none">
                {location.pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Enhanced Search Trigger - hidden on mobile, shows icon only */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1f1f23] border border-[#27272a] hover:border-[#7c3aed]/30 hover:bg-[#1f1f23]/80 transition-all group"
            >
              <Search className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#fafafa]" />
              <span className="text-sm text-[#71717a] group-hover:text-[#fafafa]">
                Search or jump to...
              </span>
              <kbd className="ml-4 bg-[#09090b] px-1.5 py-0.5 rounded text-xs font-mono text-[#71717a] border border-[#27272a]">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg hover:bg-[#1f1f23] transition-colors"
            >
              <Search className="w-4 h-4 text-[#71717a]" />
            </button>

            {/* Notifications Bell — live unread badge + popover */}
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-hidden bg-[#09090b] ${
          location.pathname.startsWith('/chat') ? '' : 'overflow-y-auto p-4 sm:p-6 pb-4 sm:pb-6'
        }`}>
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPaletteModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Navigation Drawer */}
      <div className={`md:hidden fixed inset-0 z-50 ${isMobileDrawerOpen ? 'block' : 'hidden'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
        
        {/* Drawer Panel */}
        <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0c0c0e] border-r border-[#27272a] animate-in slide-in-from-left duration-300 flex flex-col">

          {/* ── Header: workspace switcher (mirrors desktop) ── */}
          <div className="flex-shrink-0">
            <div className="h-16 border-b border-[#27272a] flex items-center px-4">
              <button
                onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                className="workspace-switcher flex items-center space-x-3 group hover:bg-[#1f1f23] px-3 py-2 rounded-lg transition-colors flex-1 min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                  {workspace?.name[0] || 'R'}
                </div>
                <span className="text-sm font-semibold text-[#fafafa] truncate flex-1">
                  {workspace?.name || 'Realm'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#71717a] flex-shrink-0 group-hover:text-[#fafafa] transition-colors" />
              </button>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="ml-2 p-2 rounded-lg hover:bg-[#1f1f23] transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-[#71717a]" />
              </button>
            </div>

            {/* Workspace Switcher Dropdown (same as desktop) */}
            {isWorkspaceSwitcherOpen && (
              <div className="workspace-switcher border-b border-[#27272a] bg-[#111113] p-3 animate-in slide-in-from-top duration-200">
                <div className="space-y-2">
                  <div className="flex items-center mb-3">
                    <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider flex-1">
                      Your Workspaces
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {workspacesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-xs text-[#71717a]">Loading...</span>
                      </div>
                    ) : workspaces.length === 0 ? (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-xs text-[#71717a]">No other workspaces</span>
                      </div>
                    ) : workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => handleWorkspaceSwitch(ws)}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.99] group ${
                          workspace?.id === ws.id ? 'bg-[#1f1f23] border border-[#7c3aed]/30' : 'hover:bg-[#1f1f23]'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                            {ws.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-[#fafafa] truncate max-w-[120px]">{ws.name}</span>
                              {workspace?.id === ws.id && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium flex-shrink-0">Active</span>
                              )}
                            </div>
                            <span className="text-xs text-[#71717a] capitalize">{ws.role.toLowerCase()}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#fafafa] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#27272a]">
                    <button
                      onClick={() => { setIsWorkspaceSwitcherOpen(false); setIsMobileDrawerOpen(false); navigate('/workspaces/new'); }}
                      className="flex items-center w-full px-3 py-2 text-sm text-[#71717a] hover:text-[#fafafa] hover:bg-[#1f1f23] rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                      Create new workspace
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Scrollable Nav (identical structure to desktop) ── */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="px-3 mb-2">
                  <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const { to, label, Icon } = item;
                    const badge = 'badge' in item ? item.badge : undefined;
                    const accent = 'accent' in item ? item.accent : undefined;
                    const isActive = location.pathname.startsWith(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                          isActive
                            ? accent
                              ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                              : 'bg-[#1f1f23] text-[#fafafa]'
                            : 'hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`relative ${accent ? 'text-[#7c3aed]' : 'text-[#71717a] group-hover:text-[#fafafa]'} ${isActive && !accent ? 'text-[#fafafa]' : ''}`}>
                            <Icon className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <span className={`text-sm ${
                            isActive
                              ? accent ? 'text-[#7c3aed] font-semibold' : 'text-[#fafafa] font-semibold'
                              : 'text-[#71717a] group-hover:text-[#fafafa]'
                          }`}>
                            {label}
                          </span>
                        </div>
                        {badge && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive && accent ? 'bg-[#7c3aed] text-white' : 'bg-[#1f1f23] text-[#71717a]'
                          }`}>
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Fixed Footer: user identity + menu (mirrors desktop) ── */}
          <div className="flex-shrink-0 border-t border-[#27272a] px-2 py-2">
            <button
              ref={mobileUserMenuButtonRef}
              onClick={() => {
                // Calculate position from this button BEFORE closing the drawer
                if (mobileUserMenuButtonRef.current) {
                  const rect = mobileUserMenuButtonRef.current.getBoundingClientRect();
                  setUserMenuPos({
                    bottom: window.innerHeight - rect.top + 8,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setIsMobileDrawerOpen(false);
                // Open the menu after drawer starts closing so portal renders in body
                setTimeout(() => setIsUserMenuOpen(true), 50);
              }}
              className="user-menu flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#1f1f23] transition-colors group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-[#27272a]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                    {user?.name[0] || 'U'}
                  </div>
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium text-[#fafafa] truncate">{user?.name || 'User'}</span>
                  <span className="text-xs text-[#71717a] truncate">{user?.email || 'user@example.com'}</span>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#71717a] group-hover:text-[#fafafa] transition-colors flex-shrink-0" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
