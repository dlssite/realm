import { create } from 'zustand';
import { User, Workspace } from '@realm/types';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Call once on app boot to restore user/workspace from a persisted token. */
  rehydrateAuth: () => Promise<void>;
  setAuth: (user: User, workspace: Workspace | null, token: string) => void;
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
      const res = await fetch('http://localhost:4000/api/v1/auth/me', {
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
    set({ user, workspace, token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('realm_token');
    set({ user: null, workspace: null, token: null, isAuthenticated: false });
  },
}));
