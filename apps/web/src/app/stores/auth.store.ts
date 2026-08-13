import { API_BASE } from '@/lib/api';
import { create } from 'zustand';
import { User, Workspace } from '@realm/types';

const WORKSPACE_KEY = 'realm_active_workspace_id';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Call once on app boot to restore user/workspace from a persisted token. */
  rehydrateAuth: () => Promise<void>;
  setAuth: (user: User, workspace: Workspace | null, token: string) => void;
  /** Switch to a different workspace and persist the selection across refreshes. */
  switchWorkspace: (workspace: Workspace) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  workspace: null,
  token: localStorage.getItem('realm_token'),
  isAuthenticated: !!localStorage.getItem('realm_token'),

  rehydrateAuth: async () => {
    const { token, clearAuth, setAuth } = get();
    if (!token) return;

    try {
      // Pass the last-active workspace ID so the server restores the right one.
      const savedWorkspaceId = localStorage.getItem(WORKSPACE_KEY);
      const url = savedWorkspaceId
        ? `${API_BASE}/api/v1/auth/me?workspaceId=${savedWorkspaceId}`
        : `${API_BASE}/api/v1/auth/me`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Token is expired or invalid — force logout
        clearAuth();
        return;
      }

      const data = await res.json() as {
        user: User;
        workspace: { id: string; name: string; slug: string; role: string } | null;
      };

      setAuth(data.user, data.workspace as Workspace | null, token);
    } catch {
      // Network error — leave authenticated so the user isn't logged out
      // on a transient connectivity issue. The UI will show empty state
      // gracefully and retry when the user navigates.
    }
  },

  setAuth: (user, workspace, token) => {
    localStorage.setItem('realm_token', token);
    if (workspace) localStorage.setItem(WORKSPACE_KEY, workspace.id);
    set({ user, workspace, token, isAuthenticated: true });
  },

  switchWorkspace: (workspace) => {
    // Persist the chosen workspace so rehydrateAuth restores it on next load.
    localStorage.setItem(WORKSPACE_KEY, workspace.id);
    set({ workspace });
  },

  clearAuth: () => {
    localStorage.removeItem('realm_token');
    localStorage.removeItem(WORKSPACE_KEY);
    set({ user: null, workspace: null, token: null, isAuthenticated: false });
  },
}));
