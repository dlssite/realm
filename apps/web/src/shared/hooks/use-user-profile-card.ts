/**
 * useUserProfileCard
 *
 * Lazily fetches a user's profile-card data from the backend.
 * Does NOT fire until `userId` is non-null, so it is safe to mount
 * unconditionally and pass a nullable userId.
 *
 * Usage:
 *   const { data, isLoading, error } = useUserProfileCard(userId);
 */

import { useState, useEffect, useRef } from 'react';
import { UserProfileCardData } from '@realm/types';
import { useAuthStore } from '@/app/stores/auth.store';
import { API_BASE } from '@/lib/api';

const API_V1 = `${API_BASE}/api/v1`;

// ── In-memory cache — keyed by workspaceId:userId.
// Exported so callers can bust it if needed (e.g. after a role change).
export const cardCache = new Map<string, UserProfileCardData>();

/** Bust a single entry — call this after the API is restarted during dev */
export function bustCardCache(workspaceId: string, userId: string) {
  cardCache.delete(`${workspaceId}:${userId}`);
}

interface UseUserProfileCardResult {
  data: UserProfileCardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserProfileCard(userId: string | null): UseUserProfileCardResult {
  const { token, workspace } = useAuthStore();

  const [data, setData]           = useState<UserProfileCardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Track the userId we most recently started a fetch for so that stale
  // responses from previous userIds are silently discarded.
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !token || !workspace) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Return cached data immediately
    const cached = cardCache.get(`${workspace.id}:${userId}`);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    currentUserId.current = userId;
    setIsLoading(true);
    setError(null);

    fetch(`${API_V1}/workspaces/${workspace.id}/members/${userId}/card`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to load profile');
        return json as UserProfileCardData;
      })
      .then((payload) => {
        // Discard if a newer userId was requested in the meantime
        if (currentUserId.current !== userId) return;
        cardCache.set(`${workspace.id}:${userId}`, payload);
        setData(payload);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (currentUserId.current !== userId) return;
        setError(err.message);
        setIsLoading(false);
      });
  }, [userId, token, workspace]);

  return { data, isLoading, error };
}
