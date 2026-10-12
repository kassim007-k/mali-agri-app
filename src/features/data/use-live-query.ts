import { useCallback, useEffect, useRef, useState } from 'react';

import type { Database } from './database.types';
import { subscribeToAgriTables } from './realtime';

export type AgriTableName = keyof Database['public']['Tables'];

type QueryState<T> = {
  key: string;
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export function useLiveQuery<T>(
  channelName: string,
  tables: readonly AgriTableName[],
  loader: () => Promise<T>,
) {
  const [queryState, setQueryState] = useState<QueryState<T>>({
    key: channelName,
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });
  const mounted = useRef(false);
  const activeKey = useRef(channelName);

  const refresh = useCallback(async (silent = false) => {
    if (!silent && mounted.current) {
      setQueryState((previous) => ({
        ...(previous.key === channelName ? previous : { key: channelName, data: null, loading: true, refreshing: false, error: null }),
        refreshing: true,
      }));
    }
    try {
      const result = await loader();
      if (mounted.current && activeKey.current === channelName) {
        setQueryState((previous) => previous.key === channelName
          ? { ...previous, data: result, error: null }
          : { key: channelName, data: result, loading: false, refreshing: false, error: null });
      }
    } catch (caught) {
      if (mounted.current && activeKey.current === channelName) {
        const message = caught instanceof Error ? caught.message : 'Une erreur est survenue.';
        setQueryState((previous) => previous.key === channelName
          ? { ...previous, error: message }
          : { key: channelName, data: null, loading: false, refreshing: false, error: message });
      }
    } finally {
      if (mounted.current && activeKey.current === channelName) {
        setQueryState((previous) => previous.key === channelName
          ? { ...previous, loading: false, refreshing: false }
          : previous);
      }
    }
  }, [channelName, loader]);

  useEffect(() => {
    mounted.current = true;
    activeKey.current = channelName;
    const initialLoad = setTimeout(() => void refresh(true), 0);
    const unsubscribe = subscribeToAgriTables(channelName, tables, () => void refresh(true));

    return () => {
      mounted.current = false;
      clearTimeout(initialLoad);
      unsubscribe();
    };
  }, [channelName, refresh, tables]);

  const visibleState = queryState.key === channelName
    ? queryState
    : { key: channelName, data: null, loading: true, refreshing: false, error: null };

  return {
    data: visibleState.data,
    loading: visibleState.loading,
    refreshing: visibleState.refreshing,
    error: visibleState.error,
    refresh: () => refresh(false),
  };
}
