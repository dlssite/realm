/**
 * useFilterState
 *
 * Thin wrapper around useState for NotificationFilterState.
 * Needed because React's useState setter with a Set value won't trigger
 * a re-render unless you spread into a new object — this hook handles that
 * transparently so callers just call setFilters(newState) normally.
 */

import { useState, useCallback } from 'react';
import type { NotificationFilterState } from '../components/notification-filters';

export function useFilterState(initial: NotificationFilterState) {
  const [filters, setFiltersRaw] = useState<NotificationFilterState>(initial);

  const setFilters = useCallback((next: NotificationFilterState) => {
    // Always spread a fresh Set so React detects the change
    setFiltersRaw({
      unreadOnly:  next.unreadOnly,
      activeTypes: new Set(next.activeTypes),
    });
  }, []);

  return [filters, setFilters] as const;
}
