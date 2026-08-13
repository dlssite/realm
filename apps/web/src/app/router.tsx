import React from 'react';
import { createBrowserRouter, Navigate, Outlet, RouteObject } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { AppLayout } from './layouts/app-layout';

// Simple route guard for authenticated areas
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />;
}

// Simple route guard for auth pages (prevent entering login/register if already authenticated)
function AuthRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  // Protected Routes (App Shell context)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: '', element: <Navigate to="/dashboard" replace /> },
          { 
            path: 'dashboard', 
            lazy: () => import('../modules/dashboard/pages/dashboard-page').then(module => ({ Component: module.DashboardPage || module.default }))
          },
          { 
            path: 'projects', 
            lazy: () => import('../modules/projects/pages/projects-page').then(module => ({ Component: module.ProjectsPage || module.default }))
          },
          { 
            path: 'projects/:projectId', 
            lazy: () => import('../modules/projects/pages/project-detail-page').then(module => ({ Component: module.ProjectDetailPage || module.default }))
          },
          { 
            path: 'tasks', 
            lazy: () => import('../modules/tasks/pages/tasks-page').then(module => ({ Component: module.TasksPage || module.default }))
          },
          { 
            path: 'wiki', 
            lazy: () => import('../modules/wiki/pages/wiki-page').then(module => ({ Component: module.WikiPage || module.default }))
          },
          { 
            path: 'ai', 
            lazy: () => import('../modules/ai/pages/ai-page').then(module => ({ Component: module.AiPage || module.default }))
          },
          { 
            path: 'teams', 
            lazy: () => import('../modules/teams/pages/teams-page').then(module => ({ Component: module.TeamsPage || module.default }))
          },
          { 
            path: 'chat', 
            lazy: () => import('../modules/chat/pages/chat-page').then(module => ({ Component: module.ChatPage || module.default }))
          },
          { 
            path: 'settings', 
            lazy: () => import('../modules/settings/pages/settings-page').then(module => ({ Component: module.SettingsPage || module.default }))
          },

          // ── Coming Soon: modules in the sidebar that are not yet built ──────────
          // To activate a module: replace the lazy import below with the real page.
          {
            path: 'activity',
            lazy: () => import('../modules/activity/pages/activity-page').then(module => ({ Component: module.ActivityPage || module.default }))
          },
          {
            path: 'notifications',
            lazy: () => import('../modules/notifications/pages/notifications-page').then(module => ({ Component: module.NotificationsPage || module.default }))
          },
          {
            path: 'calendar',
            lazy: () => import('../modules/calendar/pages/calendar-page').then(module => ({ Component: module.CalendarPage || module.default }))
          },
          {
            path: 'files',
            lazy: () => import('../modules/files/pages/files-page').then(module => ({ Component: module.FilesPage || module.default }))
          },
          {
            path: 'analytics',
            lazy: () => import('../modules/analytics/pages/analytics-page').then(module => ({ Component: module.AnalyticsPage || module.default }))
          },
          {
            path: 'automations',
            lazy: () => import('../modules/automations/pages/automations-page').then(module => ({ Component: module.AutomationsPage || module.default }))
          },
          {
            path: 'profile',
            lazy: () => import('../modules/profile/pages/profile-page').then(module => ({ Component: module.ProfilePage }))
          },
          // ────────────────────────────────────────────────────────────────────────
        ]
      }
    ]
  },
  // Public Auth Routes
  {
    path: '/auth',
    element: <AuthRoute />,
    children: [
      { path: 'login', lazy: () => import('../modules/auth/pages/login-page').then(module => ({ Component: module.LoginPage || module.default })) },
      { path: 'register', lazy: () => import('../modules/auth/pages/register-page').then(module => ({ Component: module.RegisterPage || module.default })) },
    ]
  },
  // Public Invite Acceptance Page — accessible without authentication
  {
    path: '/invite',
    lazy: () => import('../modules/invite/pages/invite-page').then(module => ({ Component: module.InvitePage }))
  },
  // Fallback Catch-All
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
]);
