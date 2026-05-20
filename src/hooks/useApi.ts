"use client";
import { useState, useEffect, useCallback } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(url: string | null): ApiState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(r => r.json())
      .then(r => {
        if (r.success !== false) setData(r.data ?? r);
        else setError(r.error ?? "Request failed");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [url, tick]);

  return { data, loading, error, refetch };
}

// Paginated variant — includes pagination metadata
export function usePaginatedApi<T>(url: string | null) {
  const [data,       setData]       = useState<T[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [tick,       setTick]       = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(r => {
        if (r.data) {
          setData(r.data);
          if (r.pagination) setPagination(r.pagination);
        } else {
          setError(r.error ?? "Request failed");
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [url, tick]);

  return { data, pagination, loading, error, refetch };
}
